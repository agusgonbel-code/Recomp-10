import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const source=JSON.parse(read('data/usda-catalog-source.json'));
const raw=JSON.parse(read('index.html').match(/const recipes=(\[[\s\S]*?\]);\s*const S=/)[1]);
const runtime=vm.createContext({});
for(const file of ['meal-planner.js','meal-planner-six-v52.js','quality-v53.js','quality-v54.js'])vm.runInContext(read(file),runtime);
const api=runtime.RecompMealPlanner,catalog=api.normalizeRecipeCatalog(raw);
const copy=value=>JSON.parse(JSON.stringify(value));
function ledger(meal){
 for(const row of meal.ingredientAmounts){
  assert.equal(Number(row.text.match(/^\d+(?:\.\d+)?/)[0]),row.qty);
  assert.ok(row.text.includes(row.state));
  for(const key of ['k','p','c','f']){
   const precision=key==='k'?1:10;
   assert.equal(row.nutrients[key],Math.round(row.per100[key]*row.qty/100*precision+1e-9)/precision);
  }
 }
 for(const key of ['k','p','c','f']){
  const precision=key==='k'?1:10;
  assert.equal(meal[key],Math.round(meal.ingredientAmounts.reduce((sum,row)=>sum+Math.round(row.nutrients[key]*precision),0)/precision));
 }
}
for(const id of ['recipe-006','recipe-007'])test(`${id}: production quantities and four nutrients match pinned USDA foods`,()=>{
 const recipe=catalog.find(r=>r.id===id);
 assert.equal(recipe.composition.length,3);
 assert.ok(recipe.s.length>=6);
 for(const row of recipe.composition){
  const food=source.foods.find(f=>String(f.fdcId)===row.foodId);
  assert.ok(food);
  for(const [key,nutrient] of [['k',1008],['p',1003],['c',1005],['f',1004]])assert.equal(row.per100[key],food.foodNutrients.find(n=>n.nutrient.id===nutrient).amount);
  assert.equal(row.source.id,row.foodId);
 }
 for(const scale of [.37,1,1.13,2.05])ledger(copy(api.portionFromComposition(recipe,'Desayuno',scale)));
 const base=api.portionFromComposition(recipe,'Desayuno',1);
 for(const key of ['k','p','c','f'])assert.equal(raw.find(r=>r.id===id)[key],base[key]);
});

test('real six-meal substitution preserves the four-target fit and survives JSON restore',()=>{
 const prefs={kcal:1950,protein:155,carbs:205,fat:58,meals:6,days:2};
 let plan=api.generateDays(catalog,prefs);
 assert.equal(plan.days[0].items[0].recipe.id,'recipe-006');
 ledger(plan.days[0].items[0]);
 plan=api.swapMeal(copy(plan),catalog,0,0);
 assert.equal(plan.days[0].items[0].recipe.id,'recipe-007');
 assert.equal(plan.days[0].energyDistribution.policy,'macro-fit-preserved');
 assert.ok(api.withinTargets(plan.days[0].totals,prefs,{k:.03,p:.05,c:.06,f:.08}));
 ledger(copy(plan).days[0].items[0]);
 assert.deepEqual(copy(api.totals(plan.days[0].items)),copy(plan.days[0].totals));
 assert.ok(Math.max(...plan.days[0].energyDistribution.shares)<=.345);
});
