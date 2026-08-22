import assert from 'node:assert/strict';
await import('../nutrition-engine.js');

const {
  calculateTargets, mealTotals, mealEntryFromPlan, saveMealEntry, mealsForDay,
  scaledRecipe, buildDayMenu, buildWeekMenu, shoppingItems
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
assert.throws(() => calculateTargets({
  sex: 'f', age: 100, height: 120, weight: 35, activity: 1.1, goal: -0.3
}), /fuera del rango nutricional compatible/);
assert.throws(() => calculateTargets({
  sex: 'm', age: 14, height: 230, weight: 350, activity: 2.2, goal: 0.2
}), /fuera del rango nutricional compatible/);

assert.deepEqual(mealTotals([
  { date: '2026-08-11', kcal: 500, p: 30, c: 50, f: 10 },
  { date: '2026-08-11', kcal: -50, p: '20', c: null, f: 5 },
  { date: '2026-08-10', kcal: 900, p: 60, c: 90, f: 20 }
], '2026-08-11'), { k: 500, p: 50, c: 50, f: 15 });

assert.deepEqual(mealEntryFromPlan({
  slot: 'Cena', recipe: { n: 'Salmón con patata', m: 'Cena' }, k: 581.4, p: 42.2, c: 55.8, f: 19.7
}, '2026-08-14', 'mealPlan30:plan:0:3', 123), {
  id: 123, date: '2026-08-14', type: 'Cena', name: 'Salmón con patata',
  kcal: 581, p: 42, c: 56, f: 20, sourceKey: 'mealPlan30:plan:0:3'
});
assert.throws(() => mealEntryFromPlan(null, '2026-08-14', 'plan:0'), /no es válida/);
assert.throws(() => mealEntryFromPlan({ recipe: {} }, '14-08-2026', 'plan:0'), /fecha/);

const originalMeals = [{
  id: 7, date: '2026-08-13', type: 'Cena', name: 'Salmón', kcal: 600,
  p: 40, c: 50, f: 20, sourceKey: 'mealPlan30:plan:0:3'
}];
const editedMeal = saveMealEntry(originalMeals, {
  date: '2026-08-14', type: 'Cena', name: 'Salmón · media porción',
  kcal: 300, p: 20, c: 25, f: 10
}, 7);
assert.equal(editedMeal.created, false);
assert.deepEqual(editedMeal.entry, {
  id: 7, date: '2026-08-14', type: 'Cena', name: 'Salmón · media porción',
  kcal: 300, p: 20, c: 25, f: 10, sourceKey: 'mealPlan30:plan:0:3'
});
assert.equal(originalMeals[0].date, '2026-08-13');
const addedMeal = saveMealEntry(originalMeals, {
  id: 9, date: '2026-08-14', type: 'Snack', name: 'Yogur', kcal: 120, p: 12, c: 8, f: 4
});
assert.equal(addedMeal.created, true);
assert.equal(addedMeal.meals.length, 2);
assert.deepEqual(mealsForDay([addedMeal.entry, originalMeals[0]], '2026-08-14'), [addedMeal.entry]);
assert.throws(() => saveMealEntry(originalMeals, { date: '2026-08-14', kcal: -1, p: 1, c: 1, f: 1 }), /calorías/);
assert.throws(() => saveMealEntry(originalMeals, { date: '2026-02-30', kcal: 1, p: 1, c: 1, f: 1 }), /fecha/);
assert.throws(() => saveMealEntry(originalMeals, { date: '2026-08-14', kcal: 1, p: 1, c: 1, f: 1 }, 99), /ya no existe/);

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
