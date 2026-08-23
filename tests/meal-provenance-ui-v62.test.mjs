import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ui=readFileSync(new URL('../meal-planner-ui.js',import.meta.url),'utf8');

test('la UI no presenta macros de receta como cálculo verificado ingrediente a ingrediente',()=>{
  assert.doesNotMatch(ui,/Las cantidades visibles son exactamente las usadas para calcular esta ración/i);
  assert.doesNotMatch(ui,/estimación proporcional a la ficha nutricional completa de la receta/i);
  assert.match(ui,/Macros de receta, no verificados ingrediente a ingrediente/i);
  assert.match(ui,/no certifican todavía una suma nutricional reconstruida alimento por alimento/i);
});

test('la UI solo puede afirmar verificación por ingrediente cuando el motor lo marca explícitamente',()=>{
  assert.match(ui,/meal\.ingredientNutritionVerified===true/);
  assert.match(ui,/Macros verificados ingrediente a ingrediente para las cantidades mostradas/i);
});
