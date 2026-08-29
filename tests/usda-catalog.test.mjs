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
for(const id of raw.filter(recipe=>recipe.composition).map(recipe=>recipe.id))test(`${id}: production quantities and four nutrients match pinned USDA foods`,()=>{
 const recipe=catalog.find(r=>r.id===id);
 assert.ok(recipe.composition.length>=2);
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

for(const days of [1,7])test('default intake with fixed breakfast generates '+days+' bounded days',()=>{
 const ctx=vm.createContext({});
 for(const file of ['recomp-profile-v2.js','meal-planner.js','meal-planner-six-v52.js','quality-v53.js','quality-v54.js'])vm.runInContext(read(file),ctx);
 const planner=ctx.RecompMealPlanner;
 const prefs={...ctx.RecompProfile.nutrition({}).targets,meals:4,days,trainingDays:4,includeBreakfastCake:true,includePostWorkoutShake:true,maxTime:30};
 assert.deepEqual(copy(prefs).kcal,2194);
 const plan=planner.generateDays(catalog,prefs);
 assert.equal(plan.days.length,days);
 const cake=plan.days[0].items.find(x=>x.recipe.id==='fixed-breakfast-cake');
 for(const [index,day] of plan.days.entries()){
  assert.equal(day.items.length,index<4?5:4);
  assert.equal(day.withinTarget,true);
  assert.ok(planner.withinTargets(day.totals,prefs,{k:.03,p:.05,c:.06,f:.08}));
  assert.ok(Math.max(...day.items.map(x=>x.k/day.totals.k))<=(index<4?.365:.405));
  assert.deepEqual(copy(day.items.find(x=>x.recipe.id==='fixed-breakfast-cake')),copy(cake));
  ledger(day.items.find(x=>x.recipe.id==='fixed-breakfast-cake'));
  if(index<4){
   const shake=day.items.find(x=>x.recipe.id==='fixed-post-workout-shake');
   assert.ok(Math.abs(shake.k-150)<=2);
   assert.ok(Math.abs(shake.p-25)<=1);
   assert.equal(shake.nutritionBasis,'ingredient-composition');
   ledger(shake);
  }
 }
});

test('real six-meal substitution preserves the four-target fit and survives JSON restore',()=>{
 const prefs={kcal:1950,protein:155,carbs:205,fat:58,meals:6,days:2};
 let plan=api.generateDays(catalog,prefs);
 const originalId=plan.days[0].items[0].recipe.id;
 assert.equal(plan.days[0].items[0].nutritionBasis,'ingredient-composition');
 ledger(plan.days[0].items[0]);
 plan=api.swapMeal(copy(plan),catalog,0,0);
 assert.notEqual(plan.days[0].items[0].recipe.id,originalId);
 assert.equal(plan.days[0].energyDistribution.policy,'macro-fit-preserved');
 assert.ok(api.withinTargets(plan.days[0].totals,prefs,{k:.03,p:.05,c:.06,f:.08}));
 for(const meal of copy(plan).days[0].items)if(meal.nutritionBasis==='ingredient-composition')ledger(meal);
 assert.deepEqual(copy(api.totals(plan.days[0].items)),copy(plan.days[0].totals));
 assert.ok(Math.max(...plan.days[0].energyDistribution.shares)<=.345);
});

test('small USDA edamame portion survives the calorie guard without changing its ledger',()=>{
 const recipe=catalog.find(r=>r.id==='recipe-020');
 const portion=copy(api.portionFromComposition(recipe,'Merienda',.195));
 ledger(portion);
 assert.deepEqual(Object.fromEntries(['k','p','c','f'].map(k=>[k,portion[k]])),{k:52,p:7,c:4,f:2});
 const before=copy(portion);
 assert.equal(runtime.RecompQualityV54.validMeal(portion),true);
 assert.deepEqual(portion,before);
});

test('loading the six-meal extension twice cannot replace installed quality guards',()=>{
 const planner=runtime.RecompMealPlanner,generate=planner.generateDays,swap=planner.swapMeal;
 // The browser also has a legacy dynamic enhancement loader.
 vm.runInContext(read('meal-planner-six-v52.js'),runtime);
 assert.equal(runtime.RecompMealPlanner,planner);
 assert.equal(planner.generateDays,generate);
 assert.equal(planner.swapMeal,swap);
 const prefs={kcal:1950,protein:155,carbs:205,fat:58,meals:6,days:2};
 const plan=planner.swapMeal(planner.generateDays(catalog,prefs),catalog,0,0);
 assert.equal(plan.days[0].energyDistribution.policy,'macro-fit-preserved');
 assert.ok(planner.withinTargets(plan.days[0].totals,prefs,{k:.03,p:.05,c:.06,f:.08}));
});

test('an entirely migrated catalogue keeps real ledgers through generation, swap and restore',()=>{
 const migrated=catalog.filter(recipe=>recipe.composition);
 assert.equal(migrated.length,42);
 const prefs={kcal:2000,protein:175,carbs:255,fat:30,meals:6,days:2};
 let plan=api.generateDays(migrated,prefs);
 for(const day of plan.days){
  for(const meal of day.items)ledger(meal);
  assert.equal(day.withinTarget,api.withinTargets(day.totals,prefs,{k:.03,p:.05,c:.06,f:.08}));
 }
 const old=plan.days[0].items[0].recipe.id;
 plan=api.swapMeal(plan,migrated,0,0);
 assert.notEqual(plan.days[0].items[0].recipe.id,old);
 assert.ok(api.withinTargets(plan.days[0].totals,prefs,{k:.03,p:.05,c:.06,f:.08}));
 for(const day of copy(plan).days){
  for(const meal of day.items)ledger(meal);
  assert.deepEqual(copy(api.totals(day.items)),copy(day.totals));
 }
});

for(const meals of [3,4,5])test(`${meals} meals keep all 30 real-catalogue days inside the four targets`,()=>{
 const migrated=catalog.filter(recipe=>recipe.composition);
 const prefs={kcal:2200,protein:160,carbs:250,fat:62,meals,days:30,trainingDays:4,includeBreakfastCake:false,includePostWorkoutShake:false,maxTime:30};
 const plan=api.generateDays(migrated,prefs);
 assert.equal(plan.days.length,30);
 const cap={3:.45,4:.40,5:.36}[meals];
 for(const day of copy(plan).days){
  assert.ok(api.withinTargets(day.totals,prefs,{k:.03,p:.05,c:.06,f:.08}));
  assert.ok(day.items.every(item=>item.k/day.totals.k<=cap+.005));
  for(const meal of day.items)ledger(meal);
  assert.deepEqual(copy(api.totals(day.items)),copy(day.totals));
 }
});
