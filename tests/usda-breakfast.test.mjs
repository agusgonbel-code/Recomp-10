import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const code=readFileSync(new URL('../meal-planner.js',import.meta.url),'utf8');
const snapshot=JSON.parse(readFileSync(new URL('../data/usda-breakfast-source.json',import.meta.url),'utf8'));
const context=vm.createContext({});
vm.runInContext(code.replace('globalThis.RecompMealPlanner={','globalThis.getCake=fixedBreakfastCake;globalThis.RecompMealPlanner={'),context);
const cake=JSON.parse(JSON.stringify(context.getCake()));

test('fixed breakfast uses five identified USDA foods with exact source values',()=>{
 assert.equal(cake.nutritionBasis,'ingredient-composition');
 assert.equal(cake.ingredientAmounts.length,5);
 for(const row of cake.ingredientAmounts){
  const food=snapshot.foods.find(food=>String(food.fdcId)===row.foodId);
  assert.ok(food);
  for(const [key,id] of [['k',1008],['p',1003],['c',1005],['f',1004]]){
   assert.equal(row.per100[key],food.foodNutrients.find(n=>n.nutrient.id===id).amount);
  }
  assert.equal(row.source.id,row.foodId);
  assert.equal(row.adjustable,false);
  assert.equal(Number(row.text.match(/^\d+/)[0]),row.qty);
 }
});

test('USDA breakfast totals sum the displayed ledger after JSON persistence',()=>{
 const restored=JSON.parse(JSON.stringify(cake));
 for(const key of ['k','p','c','f']){
  const precision=key==='k'?1:10;
  let sum=0;
  for(const row of restored.ingredientAmounts){
   const expected=Math.round(row.per100[key]*row.qty/100*precision)/precision;
   assert.equal(row.nutrients[key],expected);
   sum+=Math.round(expected*precision);
  }
  assert.equal(restored[key],Math.round(sum/precision));
  assert.equal(restored.recipe[key],restored[key]);
 }
 assert.deepEqual(context.RecompMealPlanner.ingredientsFor(restored).join('|'),restored.ingredientAmounts.map(row=>row.text).join('|'));
});

test('breakfast specifies edible raw/dry weights and complete preparation',()=>{
 assert.deepEqual(cake.ingredientAmounts.map(row=>row.qty),[60,60,150,5,10]);
 assert.ok(cake.ingredientAmounts.every(row=>row.unit==='g'&&/crudo|crudas|seca|seco/.test(row.state)));
 assert.match(cake.recipe.s.join(' '),/cáscara/);
 assert.match(cake.recipe.s.join(' '),/71/);
 assert.ok(cake.recipe.s.length>=5);
 assert.equal(snapshot.foods.length,5);
 assert.match(snapshot.sha256,/^[a-f0-9]{64}$/);
});
