import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const copy=value=>JSON.parse(JSON.stringify(value));
const raw=JSON.parse(read('index.html').match(/const recipes=(\[[\s\S]*?\]);\s*const S=/)[1]);
const migrated=raw.filter(r=>r.composition);
const context=vm.createContext({});
for(const file of ['meal-planner.js','meal-planner-six-v52.js'])vm.runInContext(read(file),context);
const originalGenerate=context.RecompMealPlanner.generateDays;
for(const file of ['quality-v53.js','quality-v54.js'])vm.runInContext(read(file),context);
const api=context.RecompMealPlanner;
const prefs={kcal:2000,protein:175,carbs:255,fat:30,meals:6};
const tolerance={k:.03,p:.05,c:.06,f:.08};

function checkDay(day){
 assert.ok(api.withinTargets(day.totals,prefs,tolerance),JSON.stringify(day.totals));
 assert.equal(day.withinTarget,true);
 assert.deepEqual(copy(day.totals),copy(api.totals(day.items)));
 assert.ok(Math.max(...day.items.map(m=>m.k/day.totals.k))<=.345);
 for(const meal of day.items){
  assert.equal(meal.nutritionBasis,'ingredient-composition');
  for(const row of meal.ingredientAmounts){
   assert.equal(Number(row.text.match(/^\d+(?:\.\d+)?/)[0]),row.qty);
   for(const k of ['k','p','c','f']){const z=k==='k'?1:10;assert.equal(row.nutrients[k],Math.round(row.per100[k]*row.qty/100*z+1e-9)/z);}
  }
  for(const k of ['k','p','c','f']){const z=k==='k'?1:10;assert.equal(meal[k],Math.round(meal.ingredientAmounts.reduce((sum,row)=>sum+Math.round(row.nutrients[k]*z),0)/z));}
 }
}

for(const days of [1,7,30])test(`${days} sourced days retain the original four-macro fit and quantities`,()=>{
 const input={...prefs,days};
 const original=originalGenerate(migrated,input);
 let plan=api.generateDays(migrated,input);
 assert.equal(plan.days.length,days);
 for(const [i,day] of plan.days.entries()){
  checkDay(day);
  assert.equal(day.energyDistribution.policy,'macro-fit-preserved');
  assert.deepEqual(copy(day.items),copy(original.days[i].items),'quality guard must not change an already valid ingredient ledger');
 }
 for(const index of [0,1,2,3,4,5]){
  const old=plan.days[0].items[index].recipe.id;
  plan=api.swapMeal(copy(plan),migrated,0,index);
  assert.notEqual(plan.days[0].items[index].recipe.id,old);
  checkDay(plan.days[0]);
 }
 for(const day of copy(plan).days)checkDay(day);
});

test('valid macros cannot bypass the maximum share for a single meal',()=>{
 const shares=[.7,.1,.1,.1],items=shares.map(s=>({k:2000*s,p:175*s,c:255*s,f:30*s,scale:1}));
 const day=context.RecompQualityV53.rebalanceDay({items},{...prefs,meals:4},{preserveNutrientFit:true});
 assert.equal(day.energyDistribution.policy,'meal-budget-first');
 assert.ok(Math.max(...day.energyDistribution.shares)<=.405);
});

test('missing or infeasible six-meal alternatives leave the supplied plan unchanged',()=>{
 const plan=api.generateDays(migrated,{...prefs,days:1});
 const before=copy(plan),onlyCurrent=[plan.days[0].items[0].recipe];
 assert.throws(()=>api.swapMeal(plan,onlyCurrent,0,0),/alternativa equivalente/);
 assert.deepEqual(copy(plan),before);
 const impossible=copy(plan);impossible.preferences.fat=200;
 const impossibleBefore=copy(impossible);
 assert.throws(()=>api.swapMeal(impossible,migrated,0,0),/conserve los cuatro macros/);
 assert.deepEqual(copy(impossible),impossibleBefore);
});

for(const [macro,target] of [['k','kcal'],['p','protein'],['c','carbs'],['f','fat']])test(`an out-of-tolerance ${macro} target never receives the preserved-fit label`,()=>{
 const items=[.22,.34,.14,.30].map(s=>({k:2000*s,p:175*s,c:255*s,f:30*s,scale:1}));
 const input={...prefs,[target]:prefs[target]*1.5,meals:4};
 const day=context.RecompQualityV53.rebalanceDay({items},input,{preserveNutrientFit:true});
 assert.equal(day.energyDistribution.policy,'meal-budget-first');
});
