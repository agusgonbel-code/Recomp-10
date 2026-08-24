import test from 'node:test';
import assert from 'node:assert/strict';
await import('../meal-planner.js');

const recipes=[
  {id:'d1',n:'Avena',m:'Desayuno',k:420,p:28,c:50,f:12,i:['80 g avena seca','200 g yogur']},
  {id:'d2',n:'Huevos',m:'Desayuno',k:450,p:30,c:40,f:16,i:['120 g huevo','80 g pan']},
  {id:'c1',n:'Pollo arroz',m:'Comida',k:650,p:48,c:70,f:18,i:['180 g pollo','100 g arroz seco']},
  {id:'c2',n:'Lentejas',m:'Comida',k:620,p:32,c:78,f:14,i:['200 g lentejas','80 g arroz seco']},
  {id:'m1',n:'Yogur fruta',m:'Merienda',k:280,p:22,c:34,f:7,i:['200 g yogur','150 g fruta']},
  {id:'m2',n:'Batido',m:'Merienda',k:300,p:25,c:38,f:7,i:['60 g avena seca','250 ml leche']},
  {id:'n1',n:'Salmón patata',m:'Cena',k:580,p:42,c:48,f:24,i:['180 g salmón','250 g patata']},
  {id:'n2',n:'Tofu verduras',m:'Cena',k:520,p:35,c:52,f:19,i:['200 g tofu','300 g verduras']}
];

test('no atribuye macros inventados a ingredientes cuando la nutrición solo está declarada a nivel de receta',()=>{
  const plan=RecompMealPlanner.generateDays(recipes,{days:1,meals:4,kcal:2200,protein:150,carbs:250,fat:70,diet:'flexible'});
  for(const meal of plan.days[0].items){
    assert.equal(meal.nutritionBasis,'recipe-declared');
    assert.equal(meal.ingredientNutritionVerified,false);
    const details=RecompMealPlanner.ingredientDetailsFor(meal);
    assert.ok(details.length>0);
    assert.ok(details.every(x=>x.nutrients===null),'No se deben repartir macros de receta proporcionalmente por peso/unidad');
  }
});
