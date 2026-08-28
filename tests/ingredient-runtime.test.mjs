import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source={id:'arithmetic-only',name:'Synthetic fixture, not food data',url:'https://example.invalid/fixture',accessedAt:'2026-08-28'};
const composition=[
 {foodId:'P',name:'Test P',qty:40,per100:{k:400,p:100,c:0,f:0}},
 {foodId:'C',name:'Test C',qty:62.5,per100:{k:400,p:0,c:100,f:0}},
 {foodId:'F',name:'Test F',qty:15.5,per100:{k:900,p:0,c:0,f:100}}
].map(row=>({...row,unit:'g',state:'test state',source}));
const recipes=['Desayuno','Comida','Merienda','Cena'].flatMap((m,i)=>[0,1,2].map(j=>({id:`test-${i}-${j}`,n:`Fixture ${i}-${j}`,m,k:9999,p:1,c:1,f:1,i:[],s:['Synthetic test only.'],composition})));
const copy=value=>JSON.parse(JSON.stringify(value));
function runtime(){
 const context=vm.createContext({});
 for(const file of ['meal-planner.js','meal-planner-six-v52.js','quality-v53.js','quality-v54.js'])vm.runInContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),context);
 return context;
}
function checkLedger(plan,api){
 for(const day of plan.days){
  assert.deepEqual(copy(day.totals),copy(api.totals(day.items)));
  for(const item of day.items){
   assert.equal(item.nutritionBasis,'ingredient-composition');
   for(const row of item.ingredientAmounts){
    assert.equal(Number(row.text.match(/^\d+(?:\.\d+)?/)[0]),row.qty);
    assert.ok(row.text.includes(row.state));
    assert.equal(row.source.id,source.id);
    for(const key of ['k','p','c','f']){
     const precision=key==='k'?1:10;
     assert.equal(row.nutrients[key],Math.round(row.per100[key]*row.qty/100*precision)/precision);
    }
   }
   for(const key of ['k','p','c','f']){
    const precision=key==='k'?1:10;
    assert.equal(item[key],Math.round(item.ingredientAmounts.reduce((sum,row)=>sum+Math.round(row.nutrients[key]*precision),0)/precision));
   }
  }
 }
}
for(const meals of [3,4,5,6])test(`${meals} meals preserve ingredient quantities through runtime guards, every swap and persistence`,()=>{
 const context=runtime(),api=context.RecompMealPlanner;
 const prefs={kcal:2200,protein:160,carbs:250,fat:62,days:2,meals,includeBreakfastCake:false,includePostWorkoutShake:false};
 let plan=api.generateDays(recipes,prefs);
 checkLedger(plan,api);
 for(let i=0;i<meals;i++){
  const before=plan.days[0].items[i].recipe.n;
  plan=api.swapMeal(copy(plan),recipes,0,i);
  assert.notEqual(plan.days[0].items[i].recipe.n,before);
  checkLedger(plan,api);
  assert.ok(api.withinTargets(plan.days[0].totals,prefs,{k:.03,p:.05,c:.06,f:.08}));
 }
 checkLedger(copy(plan),api);
});

test('distribution changes recalculate portions rather than scaling rounded nutrient totals',()=>{
 const context=runtime(),api=context.RecompMealPlanner;
 const recipe=api.normalizeRecipeCatalog(recipes)[0];
 const items=[.51,.93,1.17,1.39].map((scale,i)=>api.portionFromComposition(recipe,String(i),scale));
 const before=copy(items),prefs={kcal:2200,protein:160,carbs:250,fat:62,meals:4};
 const day=context.RecompQualityV53.rebalanceDay({items,totals:api.totals(items)},prefs);
 checkLedger({days:[day]},api);
 assert.notDeepEqual(copy(day.items),before);
 assert.deepEqual(copy(items),before);
 delete api.portionFromComposition;
 assert.throws(()=>context.RecompQualityV53.rebalanceDay({items},prefs),/raciones por ingredientes/);
});
