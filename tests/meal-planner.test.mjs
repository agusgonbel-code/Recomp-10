import test from 'node:test';
import assert from 'node:assert/strict';
await import('../meal-planner.js');

const mk=(n,m,k,p,i)=>({n,m,k,p,c:40,f:12,i});
const recipes=[
 mk('Avena con yogur','Desayuno',420,28,['80 g avena','200 g yogur']),
 mk('Tostadas con huevo','Desayuno',450,30,['2 huevos','80 g pan']),
 mk('Pollo con arroz','Comida',650,48,['180 g pollo','100 g arroz']),
 mk('Lentejas con arroz','Comida',620,32,['200 g lentejas','80 g arroz']),
 mk('Yogur con fruta','Merienda',280,22,['200 g yogur','1 plátano']),
 mk('Batido de avena','Merienda',300,25,['60 g avena','250 ml leche']),
 mk('Salmón con patata','Cena',580,42,['180 g salmón','250 g patata']),
 mk('Tofu con verduras','Cena',520,35,['200 g tofu','300 g verduras'])
];

test('genera exactamente 30 días dentro de objetivos razonables',()=>{
 const plan=RecompMealPlanner.generate30Days(recipes,{kcal:2200,protein:150,meals:4,diet:'flexible',variety:'alta'});
 assert.equal(plan.days.length,30);
 assert.ok(plan.days.every(d=>d.items.length===4));
 assert.ok(plan.days.every(d=>d.totals.k>1400&&d.totals.k<3000));
});

test('respeta exclusiones explícitas y dieta vegetariana',()=>{
 const plan=RecompMealPlanner.generate30Days(recipes,{kcal:2000,protein:120,meals:4,diet:'vegetariana',excluded:'salmón',variety:'media'});
 const names=plan.days.flatMap(d=>d.items.map(x=>x.recipe.n.toLowerCase()));
 assert.ok(names.every(n=>!n.includes('pollo')&&!n.includes('salmón')));
});

test('permite cambiar una comida y crea compra semanal',()=>{
 const plan=RecompMealPlanner.generate30Days(recipes,{kcal:2200,protein:150,meals:4,diet:'flexible'});
 const before=plan.days[0].items[0].recipe.n;
 RecompMealPlanner.swapMeal(plan,recipes,0,0);
 assert.notEqual(plan.days[0].items[0].recipe.n,before);
 assert.ok(RecompMealPlanner.shoppingByWeek(plan,0).length>0);
});

test('reutiliza objetivos guardados por la calculadora de macros',()=>{
 assert.deepEqual(RecompMealPlanner.macroTargets({kcal:2475,protein:173}),{kcal:2475,protein:173});
 assert.deepEqual(RecompMealPlanner.macroTargets({kcal:'no válido',protein:null}),{kcal:2200,protein:160});
});


test('conecta el catálogo completo y conserva la receta paso a paso',()=>{
 const catalog=RecompMealPlanner.normalizeRecipeCatalog([{
   id:'rc1',name:'Pollo al limón',type:'Comida',kcal:610,p:48,c:65,f:18,
   ingredients:['180 g pollo','100 g arroz'],steps:['Cocina el arroz.','Dora el pollo y sirve.'],time:25,difficulty:'Fácil'
 }]);
 assert.deepEqual(catalog[0],{
   id:'rc1',n:'Pollo al limón',m:'Comida',k:610,p:48,c:65,f:18,
   i:['180 g pollo','100 g arroz'],s:['Cocina el arroz.','Dora el pollo y sirve.'],time:25,difficulty:'Fácil'
 });
});
