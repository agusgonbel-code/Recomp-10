import assert from 'node:assert/strict';
await import('../nutrition-engine.js');

const {
  calculateTargets, mealTotals, scaledRecipe, buildDayMenu, buildWeekMenu, shoppingItems
} = globalThis.RecompNutrition;

assert.deepEqual(calculateTargets({
  sex: 'm', age: 46, height: 181, weight: 81, activity: 1.55, goal: 0.08
}), { kcal: 2873, protein: 162, carbs: 392, fat: 73, bmr: 1716, tdee: 2660 });
assert.throws(() => calculateTargets({
  sex: 'm', age: 0, height: 181, weight: 81, activity: 1.55, goal: 0
}), /edad/);
assert.equal(calculateTargets({
  sex: 'f', age: 40, height: 165, weight: 60, activity: 1.3, goal: -0.15
}).carbs >= 0, true);

assert.deepEqual(mealTotals([
  { date: '2026-08-11', kcal: 500, p: 30, c: 50, f: 10 },
  { date: '2026-08-11', kcal: -50, p: '20', c: null, f: 5 },
  { date: '2026-08-10', kcal: 900, p: 60, c: 90, f: 20 }
], '2026-08-11'), { k: 500, p: 50, c: 50, f: 15 });

const recipes = [
  ['Desayuno', 'A'], ['Desayuno', 'A2'], ['Comida', 'B'], ['Comida', 'B2'],
  ['Merienda', 'C'], ['Merienda', 'C2'], ['Cena', 'D'], ['Cena', 'D2']
].map(([m, n], index) => ({ m, n, k: 400 + index * 20, p: 25 + index, c: 40, f: 10, i: [n + ' ingrediente'] }));
const scaled = scaledRecipe(recipes[0], 10);
assert.equal(scaled.scale, 1.6);
const day = buildDayMenu(recipes, { kcal: 2400, protein: 160 }, 0);
assert.equal(day.items.length, 4);
assert.equal(day.items.every(item => item.scale >= 0.7 && item.scale <= 1.6), true);
assert.equal(day.totals.k > 0, true);
assert.equal(buildWeekMenu(recipes, { kcal: 2400, protein: 160 }).length, 7);
assert.equal(shoppingItems(day).length, 4);

console.log('Nutrition engine tests passed');
