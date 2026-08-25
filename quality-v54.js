(function(root,factory){'use strict';const api=factory(root);if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.RecompQualityV54=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const finite=(v,f=0)=>{const n=Number(v);return Number.isFinite(n)?n:f};
const MAX_SHARE={3:.45,4:.40,5:.36,6:.34,7:.32};
function expectedMeals(input={},plan={}){const raw=input.meals??plan.preferences?.meals;if(raw==null||raw==='')return null;return Math.min(6,Math.max(3,Math.round(finite(raw,4))));}
function validShares(shares,count){if(!Array.isArray(shares)||shares.length!==count)return false;const nums=shares.map(Number);if(nums.some(x=>!Number.isFinite(x)||x<=0||x>=1))return false;return Math.abs(nums.reduce((a,b)=>a+b,0)-1)<=.005;}
function macroCalories(item){return Number(item.p)*4+Number(item.c)*4+Number(item.f)*9;}
function validMeal(item){if(!item||!['k','p','c','f'].every(key=>Number.isFinite(Number(item[key]))&&Number(item[key])>=0)||Number(item.k)<=0)return false;const fromMacros=macroCalories(item),k=Number(item.k);return Math.abs(fromMacros-k)/Math.max(1,k)<=.18;}
function actualShares(items=[]){if(!items.every(validMeal))return null;const kcals=items.map(item=>Number(item.k)),total=kcals.reduce((a,b)=>a+b,0);return total>0?kcals.map(k=>k/total):null;}
function sharesMatch(declared,actual,tolerance=.015){if(!validShares(declared,actual?.length||0)||!Array.isArray(actual))return false;return declared.every((share,index)=>Math.abs(Number(share)-actual[index])<=tolerance);}
function validatePlan(plan,input={}){
  if(!plan||!Array.isArray(plan.days))throw new Error('El plan nutricional no contiene días válidos.');
  const expected=expectedMeals(input,plan),requestedDays=input.days==null?null:Math.min(30,Math.max(1,Math.round(finite(input.days,30))));
  if(requestedDays!==null&&plan.days.length!==requestedDays)throw new Error(`El plan nutricional está incompleto: se solicitaron ${requestedDays} días y se generaron ${plan.days.length}.`);
  for(const [index,day] of plan.days.entries()){
    const count=Array.isArray(day?.items)?day.items.length:0;
    const expectedForDay=expected===null?null:expected+(day?.trainingDay&&input.includePostWorkoutShake?1:0);
    if(count<3||count>7)throw new Error(`El día ${index+1} contiene ${count} tomas; Recomp requiere entre 3 y 7 incluyendo el postentreno.`);
    if(expectedForDay!==null&&count!==expectedForDay)throw new Error(`El día ${index+1} está incompleto: esperabas ${expectedForDay} tomas y se generaron ${count}.`);
    if(!day.items.every(validMeal))throw new Error(`El día ${index+1} contiene macros de comida no válidos o incoherentes con sus calorías.`);
    const actual=actualShares(day.items);if(!actual)throw new Error(`El día ${index+1} contiene calorías de comida no válidas.`);
    const cap=MAX_SHARE[count]||.40;if(actual.some(share=>share>cap+.005))throw new Error(`El día ${index+1} concentra demasiada energía en una sola comida.`);
    const declared=day.energyDistribution?.shares;if(!validShares(declared,count)||!sharesMatch(declared,actual))throw new Error(`El día ${index+1} tiene un reparto energético inconsistente con sus comidas.`);
    const target=finite(input.kcal,finite(plan.preferences?.kcal,0));if(target>0){const total=day.items.reduce((sum,item)=>sum+Number(item.k),0);if(Math.abs(total-target)/target>.03)throw new Error(`El día ${index+1} no respeta el objetivo energético diario configurado.`);}
  }
  return plan;
}
function install(){const planner=root?.RecompMealPlanner;if(!planner||planner.__qualityV54)return false;const generate=planner.generateDays?.bind(planner),swap=planner.swapMeal?.bind(planner);if(typeof generate==='function')planner.generateDays=(recipes,input={})=>validatePlan(generate(recipes,input),input);if(typeof swap==='function')planner.swapMeal=(plan,recipes,dayIndex,itemIndex)=>validatePlan(swap(plan,recipes,dayIndex,itemIndex),plan?.preferences||{});if(typeof planner.generate30Days==='function')planner.generate30Days=(recipes,input={})=>planner.generateDays(recipes,{...input,days:30});planner.validatePlanV54=validatePlan;planner.__qualityV54=true;return true;}
function boot(){install();}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();}else install();
return{install,validatePlan,expectedMeals,validShares,validMeal,macroCalories,actualShares,sharesMatch};
});

