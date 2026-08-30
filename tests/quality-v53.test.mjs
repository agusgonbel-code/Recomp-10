import test from 'node:test';
import assert from 'node:assert/strict';
await import('../meal-planner.js');
await import('../meal-planner-six-v52.js');
await import('../quality-v53.js');

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

for(const meals of [3,4,5,6]){
 test(`generation keeps ${meals} meals distributed without overwriting a four-macro fit`,()=>{
   const kcal=2400;
   const plan=RecompMealPlanner.generateDays(recipes,{kcal,protein:170,carbs:285,fat:75,meals,days:3,diet:'flexible'});
   const expected=RecompQualityV53.sharesFor(meals);
   for(const day of plan.days){
     assert.equal(day.items.length,meals);
     const shares=day.items.map(x=>x.k/day.totals.k);
     assert.ok(Math.max(...shares)<=0.405,'no meal may absorb an implausible share of daily energy');
     if(day.energyDistribution?.policy==='macro-fit-preserved'){
       assert.ok(RecompMealPlanner.withinTargets(day.totals,plan.preferences,{k:.03,p:.05,c:.06,f:.08}));
       assert.equal(day.withinTarget,true);
       assert.deepEqual(day.totals,RecompMealPlanner.totals(day.items));
     }else{
       assert.equal(Math.round(day.totals.k),kcal);
       shares.forEach((share,i)=>assert.ok(Math.abs(share-expected[i])<=0.01,`meal ${i+1} share ${share}`));
       assert.equal(day.energyDistribution?.policy,'meal-budget-first');
     }
   }
 });
}

test('repairs a pathological 74 percent single-meal day',()=>{
 const day={items:[
  {slot:'Desayuno',k:200,p:15,c:20,f:6,scale:1},
  {slot:'Comida',k:1776,p:100,c:220,f:55,scale:3},
  {slot:'Merienda',k:160,p:10,c:20,f:4,scale:1},
  {slot:'Cena',k:264,p:20,c:25,f:8,scale:1}
 ],totals:{k:2400,p:145,c:285,f:73}};
 const fixed=RecompQualityV53.rebalanceDay(day,{kcal:2400,protein:170,carbs:285,fat:75});
 assert.deepEqual(fixed.items.map(x=>x.k),[528,816,336,720]);
 assert.equal(fixed.totals.k,2400);
 assert.ok(Math.max(...fixed.items.map(x=>x.k/fixed.totals.k))<=0.34);
});
