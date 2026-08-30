import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const copy=value=>JSON.parse(JSON.stringify(value));
const runtime=vm.createContext({});
for(const file of ['recomp-profile-v2.js','meal-planner.js','meal-planner-six-v52.js','quality-v53.js','quality-v54.js'])vm.runInContext(read(file),runtime);
const api=runtime.RecompMealPlanner;
const raw=JSON.parse(read('index.html').match(/const recipes=(\[[\s\S]*?\]);\s*const S=/)[1]);
const catalog=api.normalizeRecipeCatalog(raw);
const prefs={...runtime.RecompProfile.nutrition({}).targets,meals:4,days:2,trainingDays:4,includeBreakfastCake:true,includePostWorkoutShake:true,maxTime:30};
const baseline=copy(api.generateDays(catalog,prefs));
const fixedIds=['fixed-breakfast-cake','fixed-post-workout-shake'];

function validate(plan){
  assert.deepEqual(plan.preferences,baseline.preferences);
  assert.deepEqual(plan.days[1],baseline.days[1]);
  const day=plan.days[0];
  assert.equal(day.items.length,baseline.days[0].items.length);
  assert.deepEqual(day.items.map(item=>item.slot),baseline.days[0].items.map(item=>item.slot));
  assert.ok(api.withinTargets(day.totals,prefs,{k:.03,p:.05,c:.06,f:.08}));
  assert.deepEqual(copy(api.totals(day.items)),day.totals);
  assert.ok(day.items.every(item=>item.k/day.totals.k<=.365));
  for(const meal of day.items){
    assert.equal(meal.nutritionBasis,'ingredient-composition');
    for(const row of meal.ingredientAmounts){
      assert.equal(Number(row.text.match(/^\d+(?:\.\d+)?/)[0]),row.qty);
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
}

for(const id of fixedIds)test(id+' can be replaced without changing the other fixed meal or profile',()=>{
  const index=baseline.days[0].items.findIndex(item=>item.recipe.id===id);
  const other=baseline.days[0].items.find(item=>fixedIds.includes(item.recipe.id)&&item.recipe.id!==id);
  const result=copy(api.swapMeal(copy(baseline),catalog,0,index));
  assert.notEqual(result.days[0].items[index].recipe.id,id);
  assert.equal(result.days[0].fixedMealSubstitutions[index],id);
  assert.deepEqual(result.days[0].items.find(item=>item.recipe.id===other.recipe.id),other);
  validate(result);
});

test('both fixed meals and a subsequent ordinary meal remain replaceable after persistence',()=>{
  let plan=copy(baseline);
  for(const id of fixedIds){
    const index=plan.days[0].items.findIndex(item=>item.recipe.id===id);
    plan=copy(api.swapMeal(plan,catalog,0,index));
    assert.notEqual(plan.days[0].items[index].recipe.id,id);
    validate(plan);
  }
  const old=plan.days[0].items[2].recipe.id;
  plan=copy(api.swapMeal(plan,catalog,0,2));
  assert.notEqual(plan.days[0].items[2].recipe.id,old);
  validate(plan);
});

test('an unavailable fixed-meal replacement fails without mutating any day',()=>{
  const plan=copy(baseline),before=copy(plan);
  const index=plan.days[0].items.findIndex(item=>item.recipe.id===fixedIds[0]);
  assert.throws(()=>api.swapMeal(plan,[],0,index),/alternativa/);
  assert.deepEqual(plan,before);
});
