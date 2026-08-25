import test from 'node:test';
import assert from 'node:assert/strict';
await import('../meal-planner.js');

const mk=(n,m,k,p,c,f,i)=>({n,m,k,p,c,f,i});
const recipes=[
  mk('Avena con yogur','Desayuno',420,28,58,10,['80 g avena','200 g yogur']),
  mk('Tostadas con huevo','Desayuno',450,30,42,18,['100 g huevo','80 g pan']),
  mk('Pollo con arroz','Comida',650,48,75,17,['180 g pollo','180 g arroz','10 g aceite de oliva']),
  mk('Lentejas con arroz','Comida',620,32,90,12,['200 g lentejas','150 g arroz']),
  mk('Yogur con fruta','Merienda',280,22,35,6,['200 g yogur','120 g platano']),
  mk('Batido de avena','Merienda',300,25,42,5,['60 g avena','250 ml leche']),
  mk('Salmón con patata','Cena',580,42,55,22,['180 g salmon','250 g patata']),
  mk('Tofu con verduras','Cena',520,35,48,22,['200 g tofu','300 g verduras'])
];

const target={kcal:2200,protein:160,carbs:250,fat:70,days:3,meals:4,diet:'flexible'};
const tolerance={k:.05,p:.06,c:.075,f:.075};

test('swapMeal converge dentro de banda sin ampliar tolerancias',()=>{
  const plan=RecompMealPlanner.generateDays(recipes,target);
  for(let slot=0;slot<4;slot++){
    const before=plan.days[0].items[slot].recipe.n;
    RecompMealPlanner.swapMeal(plan,recipes,0,slot);
    assert.notEqual(plan.days[0].items[slot].recipe.n,before);
    assert.ok(
      RecompMealPlanner.withinTargets(plan.days[0].totals,plan.preferences,tolerance),
      `slot ${slot} fuera de banda: ${JSON.stringify(plan.days[0].totals)}`
    );
  }
});
