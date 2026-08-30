import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const copy=value=>JSON.parse(JSON.stringify(value));
const runtime=vm.createContext({});
for(const file of ['recomp-profile-v2.js','meal-planner.js','meal-planner-six-v52.js','quality-v53.js','quality-v54.js'])vm.runInContext(read(file),runtime);
const api=runtime.RecompMealPlanner;
const catalog=api.normalizeRecipeCatalog(JSON.parse(read('index.html').match(/const recipes=(\[[\s\S]*?\]);\s*const S=/)[1]));
function ledger(day){
 assert.deepEqual(copy(api.totals(day.items)),day.totals);
 for(const meal of day.items){
  assert.equal(meal.nutritionBasis,'ingredient-composition');
  for(const row of meal.ingredientAmounts){
   assert.equal(Number(row.text.match(/^\d+(?:\.\d+)?/)[0]),row.qty);
   for(const key of ['k','p','c','f']){const precision=key==='k'?1:10;assert.equal(row.nutrients[key],Math.round(row.per100[key]*row.qty/100*precision+1e-9)/precision);}
  }
  for(const key of ['k','p','c','f']){const precision=key==='k'?1:10;assert.equal(meal[key],Math.round(meal.ingredientAmounts.reduce((sum,row)=>sum+Math.round(row.nutrients[key]*precision),0)/precision));}
 }
}
for(const [cake,shake] of [[true,false],[false,true],[true,true]])test(`six meals preserve fixed preferences cake=${cake} shake=${shake} for training and rest days`,()=>{
 const prefs={...runtime.RecompProfile.nutrition({}).targets,meals:6,days:7,trainingDays:4,trainingTime:'06:00',includeBreakfastCake:cake,includePostWorkoutShake:shake,maxTime:30};
 const plan=copy(api.generateDays(catalog,prefs));
 assert.equal(plan.preferences.includeBreakfastCake,cake);assert.equal(plan.preferences.includePostWorkoutShake,shake);
 assert.equal(plan.preferences.trainingDays,4);assert.equal(plan.preferences.trainingTime,'06:00');
 for(const [index,day] of plan.days.entries()){
  assert.equal(day.trainingDay,index<4);
  assert.equal(day.items.length,6+(shake&&index<4?1:0));
  assert.equal(day.items.filter(item=>item.recipe.id==='fixed-breakfast-cake').length,cake?1:0);
  assert.equal(day.items.filter(item=>item.recipe.id==='fixed-post-workout-shake').length,shake&&index<4?1:0);
  if(cake)assert.ok(!day.items.some(item=>item.recipe.id!=='fixed-breakfast-cake'&&item.slot==='Desayuno'));
  assert.ok(api.withinTargets(day.totals,prefs,{k:.03,p:.05,c:.06,f:.08}),`day ${index+1}: ${JSON.stringify(day.totals)}`);
  assert.ok(day.items.every(item=>item.k/day.totals.k<=(day.items.length===7?.325:.345)));
  ledger(day);
 }
 const original=copy(plan),selected=plan.days[0].items.findIndex(item=>item.recipe.id===(cake?'fixed-breakfast-cake':'fixed-post-workout-shake'));
 const swapped=copy(api.swapMeal(plan,catalog,0,selected));
 assert.notEqual(swapped.days[0].items[selected].recipe.id,original.days[0].items[selected].recipe.id);
 assert.deepEqual(swapped.days.slice(1),original.days.slice(1));assert.deepEqual(swapped.preferences,original.preferences);
 assert.equal(swapped.days[0].items.length,original.days[0].items.length);ledger(swapped.days[0]);
 assert.ok(api.withinTargets(swapped.days[0].totals,prefs,{k:.03,p:.05,c:.06,f:.08}));
});
