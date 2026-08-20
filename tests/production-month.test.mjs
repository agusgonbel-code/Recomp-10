import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
await import('../meal-planner.js');

function productionRecipes(){
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const match=html.match(/const recipes=(\[[\s\S]*?\]);\s*const S=/);
  assert.ok(match,'No se pudo localizar el catálogo de recetas de producción en index.html');
  return JSON.parse(match[1]);
}

const raw=productionRecipes();
const recipes=globalThis.RecompMealPlanner.normalizeRecipeCatalog(raw);

test('el catálogo real tiene recetas completas y cantidades escalables',()=>{
  assert.ok(recipes.length>=50,`Catálogo de producción demasiado pequeño: ${recipes.length}`);
  for(const recipe of recipes){
    assert.ok(recipe.s.length>=3,`${recipe.n}: faltan pasos de elaboración`);
    assert.ok(recipe.i.length>0,`${recipe.n}: faltan ingredientes`);
    const model=globalThis.RecompMealPlanner.recipeModel(recipe);
    const unresolved=model.parsed.filter(x=>!x.scalable).map(x=>x.raw);
    assert.deepEqual(unresolved,[],`${recipe.n}: ingredientes sin cantidad resoluble: ${unresolved.join(', ')}`);
  }
});

function validateFullMonth(targets){
  const start=performance.now();
  const plan=globalThis.RecompMealPlanner.generate30Days(recipes,{...targets,meals:4,diet:'flexible',variety:'alta'});
  const elapsed=performance.now()-start;
  assert.equal(plan.days.length,30);
  assert.ok(elapsed<8000,`Generar 30 días tardó ${Math.round(elapsed)} ms`);
  const reference=plan.days[0].totals;
  for(const day of plan.days){
    assert.ok(globalThis.RecompMealPlanner.withinTargets(day.totals,plan.preferences),`Día ${day.day} fuera de objetivo: ${JSON.stringify(day.totals)}`);
    assert.ok(Math.abs(day.totals.k-reference.k)/reference.k<=.015,`Día ${day.day}: kcal no uniformes`);
    assert.ok(Math.abs(day.totals.p-reference.p)/reference.p<=.02,`Día ${day.day}: proteína no uniforme`);
    assert.ok(Math.abs(day.totals.c-reference.c)/reference.c<=.025,`Día ${day.day}: carbohidratos no uniformes`);
    assert.ok(Math.abs(day.totals.f-reference.f)/reference.f<=.03,`Día ${day.day}: grasas no uniformes`);
    for(const item of day.items){
      assert.ok(item.recipe.s.length>=3,`${item.recipe.n}: receta generada sin elaboración`);
      const exact=globalThis.RecompMealPlanner.ingredientsFor(item);
      assert.equal(exact.length,item.recipe.i.length);
      assert.ok(exact.every(x=>/^\d/.test(x)),`${item.recipe.n}: cantidad no exacta: ${exact.join(' | ')}`);
      const calculated=item.ingredientAmounts.reduce((sum,ingredient)=>({
        k:sum.k+ingredient.nutrients.k,p:sum.p+ingredient.nutrients.p,
        c:sum.c+ingredient.nutrients.c,f:sum.f+ingredient.nutrients.f
      }),{k:0,p:0,c:0,f:0});
      assert.deepEqual(
        {k:item.k,p:item.p,c:item.c,f:item.f},
        {k:Math.round(calculated.k),p:Math.round(calculated.p),c:Math.round(calculated.c),f:Math.round(calculated.f)},
        `${item.recipe.n}: los macros no proceden de las cantidades mostradas`
      );
    }
  }
  for(const dayIndex of [0,7,14,21,29]){
    const before=plan.days[dayIndex].items[1].recipe.n;
    globalThis.RecompMealPlanner.swapMeal(plan,recipes,dayIndex,1);
    assert.notEqual(plan.days[dayIndex].items[1].recipe.n,before,`Día ${dayIndex+1}: la sustitución no cambió la comida`);
    assert.ok(globalThis.RecompMealPlanner.withinTargets(plan.days[dayIndex].totals,plan.preferences,{k:.05,p:.06,c:.065,f:.075}),`Día ${dayIndex+1}: sustitución rompe objetivos`);
  }
  return {plan,elapsed};
}

test('catálogo real: mes completo con objetivos estándar',()=>{
  const {elapsed}=validateFullMonth({kcal:2200,protein:155,carbs:250,fat:68});
  assert.ok(Number.isFinite(elapsed));
});

test('catálogo real: mes completo con ajuste manual de calorías',()=>{
  const {plan}=validateFullMonth({kcal:1950,protein:155,carbs:205,fat:58});
  assert.deepEqual(
    {kcal:plan.preferences.kcal,protein:plan.preferences.protein,carbs:plan.preferences.carbs,fat:plan.preferences.fat},
    {kcal:1950,protein:155,carbs:205,fat:58}
  );
});
