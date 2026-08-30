import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
await import('../meal-planner.js');
const api=globalThis.RecompMealPlanner;
const copy=x=>JSON.parse(JSON.stringify(x));
// Synthetic arithmetic fixtures, NOT food composition data or usable recipes.
const source={id:'synthetic-test',name:'Arithmetic fixture only',url:'https://example.invalid/fixture',accessedAt:'2026-08-28'};
const ingredient=(name,qty,per100)=>({foodId:name,name,state:'test state',qty,unit:'g',per100,source});
const composition=()=>[
 ingredient('Synthetic P',40,{k:400,p:100,c:0,f:0}),
 ingredient('Synthetic C',62.5,{k:400,p:0,c:100,f:0}),
 ingredient('Synthetic F',15.5,{k:900,p:0,c:0,f:100})
];
const recipes=()=>['Desayuno','Comida','Merienda','Cena'].flatMap((m,i)=>[0,1].map(j=>({id:`test-${i}-${j}`,n:`Fixture ${i}-${j}`,m,k:9999,p:1,c:1,f:1,i:['Stale ingredient text'],s:['Synthetic preparation fixture.'],composition:composition()})));
const prefs={days:2,meals:4,kcal:2200,protein:160,carbs:250,fat:62,includeBreakfastCake:false,includePostWorkoutShake:false};
function checkItem(item){
 assert.equal(item.nutritionBasis,'ingredient-composition');
 assert.equal(item.ingredientNutritionVerified,false,'Arithmetic does not certify the source');
 for(const row of item.ingredientAmounts){
  assert.equal(Number(row.text.match(/^\d+(?:\.\d+)?/)[0]),row.qty);
  assert.ok(row.text.includes(row.state));
  assert.equal(row.source.id,source.id);
  for(const k of ['k','p','c','f'])assert.equal(row.nutrients[k],Number((row.per100[k]*row.qty/100).toFixed(k==='k'?0:1)));
 }
 for(const k of ['k','p','c','f'])assert.equal(item[k],Math.round(item.ingredientAmounts.reduce((sum,row)=>sum+row.nutrients[k],0)));
}
test('normalization retains complete composition and replaces stale recipe totals/text',()=>{
 const input=recipes(),before=copy(input),normalized=api.normalizeRecipeCatalog(input);
 assert.deepEqual(input,before);
 assert.equal(normalized[0].composition.length,3);
 assert.notEqual(normalized[0].k,9999);
 assert.ok(normalized[0].i.every(text=>!text.includes('Stale')));
 assert.deepEqual(api.normalizeRecipeCatalog(normalized),normalized);
});
for(const days of [1,7,30])test(`generation for ${days} days derives all four totals from shown quantities`,()=>{
 const plan=api.generateDays(recipes(),{...prefs,days});
 assert.equal(plan.days.length,days);
 for(const day of plan.days){
  day.items.forEach(checkItem);
  assert.deepEqual(day.totals,api.totals(day.items));
  assert.ok(api.withinTargets(day.totals,prefs,{k:.03,p:.05,c:.06,f:.08}),JSON.stringify(day.totals));
 }
});
test('every meal can be replaced, rebalanced and restored without losing composition',()=>{
 const input=recipes(),before=copy(input),plan=api.generateDays(input,prefs);
 for(let i=0;i<4;i++){
  const name=plan.days[0].items[i].recipe.n;
  api.swapMeal(plan,input,0,i);
  assert.notEqual(plan.days[0].items[i].recipe.n,name);
  plan.days[0].items.forEach(checkItem);
  assert.ok(api.withinTargets(plan.days[0].totals,prefs,{k:.03,p:.05,c:.06,f:.08}));
 }
 const restored=copy(plan);assert.deepEqual(restored,plan);
 restored.days.flatMap(day=>day.items).forEach(checkItem);
 api.swapMeal(restored,input,1,0);restored.days[1].items.forEach(checkItem);
 assert.deepEqual(input,before);
});
test('malformed explicit composition fails closed instead of reverting to global recipe macros',()=>{
 for(const mutate of [r=>r.composition=[],r=>r.composition=null,r=>r.composition[0].qty='40',r=>r.composition[0].qty=-1,r=>r.composition[0].per100.p=null,r=>delete r.composition[0].per100.f,r=>r.composition[0].unit='ud',r=>r.composition[0].state='',r=>delete r.composition[0].source,r=>r.composition[0].source={...source,url:'javascript:alert(1)'}]){
  const r=recipes()[0];mutate(r);
  assert.throws(()=>api.normalizeRecipeCatalog([r]),/ingrediente|Composición/);
  assert.throws(()=>api.generateDays([r,...recipes()],prefs),/ingrediente|Composición/);
 }
});
test('quantity boundary rounding and explicit millilitres use exactly the shown amount',()=>{
 const text=readFileSync(new URL('../meal-planner.js',import.meta.url),'utf8');
 const ctx=vm.createContext({});
 vm.runInContext(text.replace('globalThis.RecompMealPlanner={','globalThis.arithmetic={compositionAmounts,compositionTotals,reconcileRemainingItems};globalThis.RecompMealPlanner={'),ctx);
 const halves=[.7,.7,.1].map(p=>({nutrients:{k:1,p,c:p,f:p}}));
 assert.deepEqual(copy(ctx.arithmetic.compositionTotals(halves)),{k:3,p:2,c:2,f:2});
 for(const qty of [9.9,10,10.1,49.9,50,50.1,99.9]){
  const row={...ingredient('Synthetic liquid',qty,{k:37.7,p:1.3,c:5.7,f:1.1}),unit:'ml'};
  const amounts=ctx.arithmetic.compositionAmounts([row],1.17);
  const item={nutritionBasis:'ingredient-composition',ingredientNutritionVerified:false,ingredientAmounts:amounts,...ctx.arithmetic.compositionTotals(amounts)};
  checkItem(item);
  const originalcopy=JSON.stringify([item]);
  assert.equal(JSON.stringify(ctx.arithmetic.reconcileRemainingItems([item],prefs)),originalcopy,'Legacy anchors must never detach the ledger');
 }
});
