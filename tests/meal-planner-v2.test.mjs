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

test('macroTargets conserva los cuatro objetivos de la calculadora',()=>{
 assert.deepEqual(RecompMealPlanner.macroTargets({kcal:2475,protein:173,carbs:301,fat:71}),{kcal:2475,protein:173,carbs:301,fat:71});
 const fallback=RecompMealPlanner.macroTargets({kcal:'no válido',protein:null,carbs:null,fat:null});
 assert.deepEqual(fallback,{kcal:2200,protein:160,carbs:250,fat:70});
});

test('generateDays respeta el número solicitado y los cuatro macros con tolerancia práctica',()=>{
 const target={kcal:2200,protein:160,carbs:250,fat:70,days:7,meals:4,diet:'flexible'};
 const plan=RecompMealPlanner.generateDays(recipes,target);
 assert.equal(plan.days.length,7);
 for(const day of plan.days){
   assert.equal(day.items.length,4);
   assert.ok(Math.abs(day.totals.k-target.kcal)<=80,`kcal día ${day.day}: ${day.totals.k}`);
   assert.ok(Math.abs(day.totals.p-target.protein)<=8,`P día ${day.day}: ${day.totals.p}`);
   assert.ok(Math.abs(day.totals.c-target.carbs)<=12,`C día ${day.day}: ${day.totals.c}`);
   assert.ok(Math.abs(day.totals.f-target.fat)<=6,`G día ${day.day}: ${day.totals.f}`);
 }
});

test('cada ingrediente ajustable expone una cantidad concreta y la receta mantiene elaboración',()=>{
 const catalog=RecompMealPlanner.normalizeRecipeCatalog([{
   id:'rc1',name:'Pollo al limón',type:'Comida',kcal:610,p:48,c:65,f:18,
   ingredients:['180 g pollo','150 g arroz','10 g aceite de oliva'],
   steps:['Cocina el arroz.','Dora el pollo.','Mezcla y sirve.'],time:25,difficulty:'Fácil'
 }]);
 const model=RecompMealPlanner.recipeModel(catalog[0]);
 assert.equal(model.parsed.length,3);
 assert.ok(model.parsed.every(x=>x.scalable&&Number.isFinite(x.baseQty)&&x.baseQty>0));
 assert.equal(catalog[0].s.length,3);
});

test('sustituir una comida mantiene el día cerca de los cuatro objetivos',()=>{
 const target={kcal:2200,protein:160,carbs:250,fat:70,days:3,meals:4,diet:'flexible'};
 const plan=RecompMealPlanner.generateDays(recipes,target);
 const before=plan.days[0].items[0].recipe.n;
 RecompMealPlanner.swapMeal(plan,recipes,0,0);
 assert.notEqual(plan.days[0].items[0].recipe.n,before);
 const t=plan.days[0].totals;
 assert.ok(RecompMealPlanner.withinTargets(t,plan.preferences,{k:.05,p:.06,c:.065,f:.075}),`sustitución fuera de banda: ${JSON.stringify(t)}`);
});
