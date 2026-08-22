import test from 'node:test';
import assert from 'node:assert/strict';
await import('../meal-planner.js');
await import('../meal-planner-six-v52.js');

const recipes=[
 {n:'Avena proteica',m:'Desayuno',k:430,p:32,c:55,f:10,i:['70 g avena','200 g yogur']},
 {n:'Tostadas con huevos',m:'Desayuno',k:460,p:31,c:48,f:16,i:['80 g pan','2 huevos']},
 {n:'Yogur fruta y cereal',m:'Merienda',k:300,p:24,c:42,f:6,i:['200 g yogur','40 g cereal','100 g fruta']},
 {n:'Batido de plátano',m:'Merienda',k:330,p:27,c:45,f:7,i:['250 ml leche','30 g proteína','100 g plátano']},
 {n:'Skyr con frutos secos',m:'Merienda',k:290,p:25,c:24,f:11,i:['200 g skyr','20 g frutos secos']},
 {n:'Pollo con arroz',m:'Comida',k:650,p:50,c:78,f:15,i:['180 g pollo','100 g arroz','150 g verduras']},
 {n:'Ternera con patata',m:'Comida',k:690,p:47,c:72,f:22,i:['170 g ternera','260 g patata']},
 {n:'Lentejas con arroz',m:'Comida',k:620,p:35,c:92,f:12,i:['220 g lentejas','70 g arroz']},
 {n:'Salmón con patata',m:'Cena',k:590,p:43,c:52,f:24,i:['180 g salmón','230 g patata']},
 {n:'Merluza con arroz',m:'Cena',k:540,p:45,c:64,f:11,i:['200 g merluza','80 g arroz']},
 {n:'Tortilla con pan',m:'Cena',k:520,p:36,c:46,f:21,i:['3 huevos','70 g pan']},
 {n:'Tofu con quinoa',m:'Cena',k:560,p:34,c:68,f:18,i:['200 g tofu','80 g quinoa']}
];

test('accepts six selected meals and creates six real meal slots',()=>{
 const prefs=RecompMealPlanner.validatePreferences({kcal:2400,protein:170,carbs:285,fat:75,meals:6,days:7});
 assert.equal(prefs.meals,6);
 const plan=RecompMealPlanner.generateDays(recipes,{...prefs,diet:'flexible',variety:'alta'});
 assert.equal(plan.days.length,7);
 assert.ok(plan.days.every(day=>day.items.length===6));
 assert.deepEqual(plan.days[0].items.map(x=>x.slot),['Desayuno','Media mañana','Comida','Merienda','Cena','Snack nocturno']);
 assert.ok(plan.days.every(day=>Math.abs(day.totals.k-prefs.kcal)/prefs.kcal<0.08));
 assert.ok(plan.days.every(day=>Math.abs(day.totals.p-prefs.protein)/prefs.protein<0.10));
});

test('six-meal swap changes recipe and keeps six meals',()=>{
 const plan=RecompMealPlanner.generateDays(recipes,{kcal:2400,protein:170,carbs:285,fat:75,meals:6,days:2,diet:'flexible'});
 const before=plan.days[0].items[1].recipe.n;
 RecompMealPlanner.swapMeal(plan,recipes,0,1);
 assert.equal(plan.days[0].items.length,6);
 assert.notEqual(plan.days[0].items[1].recipe.n,before);
 assert.ok(RecompMealPlanner.shoppingByWeek(plan,0).length>0);
});
