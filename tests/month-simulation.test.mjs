import test from 'node:test';
import assert from 'node:assert/strict';
await import('../meal-planner.js');
await import('../training-engine.js');

const R=(n,m,k,p,c,f,i,s=['Preparar ingredientes.','Cocinar y servir.'])=>({n,m,k,p,c,f,i,s,time:25,difficulty:'Fácil'});
const recipes=[
  R('Tortilla proteica con pan','Desayuno',400,40,40,8,['250 g claras','1 ud huevo','70 g pan integral']),
  R('Pollo proteico con patata','Comida',600,55,55,16,['210 g pollo','260 g patata','8 g aceite de oliva']),
  R('Skyr con whey y fruta','Merienda',300,35,25,7,['250 g skyr','20 g whey','100 g frutos rojos']),
  R('Merluza proteica con quinoa','Cena',550,50,50,18,['260 g merluza','80 g quinoa','12 g aceite de oliva']),
  R('Avena, skyr y frutos rojos','Desayuno',430,31,58,9,['70 g avena','200 g skyr','100 g frutos rojos']),
  R('Tostadas, huevo y aguacate','Desayuno',510,28,43,25,['90 g pan integral','2 ud huevo','60 g aguacate']),
  R('Bol de yogur, muesli y fruta','Desayuno',460,27,63,12,['250 g yogur','65 g muesli','120 g platano']),
  R('Pollo con arroz y aceite','Comida',680,52,78,17,['180 g pollo','110 g arroz','10 g aceite de oliva']),
  R('Ternera con patata','Comida',650,45,65,22,['180 g ternera','300 g patata','8 g aceite de oliva']),
  R('Lentejas con arroz y huevo','Comida',620,34,89,14,['220 g lentejas','80 g arroz','1 ud huevo']),
  R('Pavo con pasta','Comida',670,50,82,15,['180 g pavo','110 g pasta','8 g aceite de oliva']),
  R('Skyr con plátano y almendras','Merienda',330,25,35,11,['220 g skyr','120 g platano','15 g almendras']),
  R('Batido de leche, avena y whey','Merienda',370,32,43,8,['250 ml leche','45 g avena','25 g whey']),
  R('Yogur con muesli','Merienda',310,20,41,8,['220 g yogur','45 g muesli']),
  R('Salmón con patata','Cena',610,43,55,24,['180 g salmon','280 g patata','5 g aceite de oliva']),
  R('Merluza con arroz','Cena',560,45,68,10,['220 g merluza','90 g arroz','8 g aceite de oliva']),
  R('Tofu con quinoa','Cena',590,35,64,22,['220 g tofu','90 g quinoa','8 g aceite de oliva']),
  R('Pavo con boniato','Cena',570,46,61,13,['190 g pavo','280 g boniato','7 g aceite de oliva'])
];

function assertMonth(targets){
  const plan=globalThis.RecompMealPlanner.generate30Days(recipes,{...targets,meals:4,diet:'flexible',variety:'alta'});
  assert.equal(plan.days.length,30);
  const first=plan.days[0].totals;
  for(const day of plan.days){
    assert.equal(day.items.length,4);
    assert.ok(globalThis.RecompMealPlanner.withinTargets(day.totals,plan.preferences),`día ${day.day} fuera de objetivo: ${JSON.stringify(day.totals)}`);
    assert.ok(Math.abs(day.totals.k-first.k)/first.k<=.015,`kcal inestables día ${day.day}`);
    assert.ok(Math.abs(day.totals.p-first.p)/first.p<=.02,`proteína inestable día ${day.day}`);
    assert.ok(Math.abs(day.totals.c-first.c)/first.c<=.025,`carbohidratos inestables día ${day.day}`);
    assert.ok(Math.abs(day.totals.f-first.f)/first.f<=.03,`grasas inestables día ${day.day}`);
    for(const item of day.items){
      const ingredients=globalThis.RecompMealPlanner.ingredientsFor(item);
      assert.ok(ingredients.length>0);
      assert.ok(item.scale>0);
    }
  }
  for(const dayIndex of [0,5,10,15,20,25]){
    const before=plan.days[dayIndex].items[0].recipe.n;
    globalThis.RecompMealPlanner.swapMeal(plan,recipes,dayIndex,0);
    assert.notEqual(plan.days[dayIndex].items[0].recipe.n,before);
    assert.ok(globalThis.RecompMealPlanner.withinTargets(plan.days[dayIndex].totals,plan.preferences,{k:.05,p:.06,c:.06,f:.07}));
  }
  return plan;
}

test('simula 30 días con objetivos calculados',()=>{assertMonth({kcal:2200,protein:150,carbs:250,fat:70})});
test('simula 30 días con objetivos manuales reducidos',()=>{const plan=assertMonth({kcal:1950,protein:160,carbs:190,fat:60});assert.equal(plan.preferences.kcal,1950);assert.equal(plan.preferences.protein,160);assert.equal(plan.preferences.carbs,190);assert.equal(plan.preferences.fat,60)});

test('simula 4 semanas de entrenamiento de lunes a jueves',()=>{
  const history=[];
  const exercises=[
    {name:'Press banca',range:'6-10',start:70},
    {name:'Remo',range:'8-12',start:60},
    {name:'Sentadilla',range:'6-10',start:90},
    {name:'Peso muerto rumano',range:'8-12',start:80}
  ];
  for(let week=0;week<4;week++){
    for(let day=0;day<4;day++){
      const exercise=exercises[day];
      const advice=globalThis.RecompTraining.progressionAdvice(history,exercise.name,exercise.range);
      assert.ok(advice.length>10);
      const kg=exercise.start+week*2.5;
      const reps=Math.min(globalThis.RecompTraining.parseRepRange(exercise.range).high,8+week);
      const workout={week:week+1,day:day+1,exercises:[{name:exercise.name,sets:Array.from({length:3},()=>({kg,reps,rir:2}))}]};
      assert.ok(globalThis.RecompTraining.sessionVolume(workout.exercises)>0);
      history.push(workout);
    }
  }
  assert.equal(history.length,16);
  for(const exercise of exercises){
    assert.ok(globalThis.RecompTraining.lastExercise(history,exercise.name));
    assert.equal(globalThis.RecompTraining.bestLoad(history,exercise.name),exercise.start+7.5);
  }
  const totalVolume=history.reduce((sum,w)=>sum+globalThis.RecompTraining.sessionVolume(w.exercises),0);
  assert.ok(Number.isFinite(totalVolume)&&totalVolume>0);
});