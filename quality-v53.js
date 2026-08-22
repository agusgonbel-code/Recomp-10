(function(root,factory){
'use strict';
const api=factory(root);
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.RecompQualityV53=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const finite=(v,f=0)=>{const n=Number(v);return Number.isFinite(n)?n:f};
const round=v=>Math.round(finite(v));
const SHARES={
  3:[.25,.40,.35],
  4:[.22,.34,.14,.30],
  5:[.20,.10,.32,.12,.26],
  6:[.18,.10,.29,.11,.24,.08]
};
const MAX_SHARE={3:.42,4:.36,5:.34,6:.31};
function sharesFor(count){return SHARES[count]||SHARES[4];}
function totals(items=[]){return items.reduce((a,x)=>({k:a.k+finite(x.k),p:a.p+finite(x.p),c:a.c+finite(x.c),f:a.f+finite(x.f)}),{k:0,p:0,c:0,f:0});}
function scaleIngredient(ingredient,factor){
  if(!ingredient||typeof ingredient!=='object')return ingredient;
  const next={...ingredient};
  if(Number.isFinite(Number(next.qty))){
    const step=/^ud|unidad/i.test(String(next.unit||''))?.5:(Number(next.qty)*factor>=50?5:1);
    next.qty=Math.max(step,Math.round((Number(next.qty)*factor)/step)*step);
    if(next.name){const shown=Number.isInteger(next.qty)?next.qty:next.qty.toFixed(1);next.text=`${shown} ${next.unit||'g'} de ${next.name}`;}
  }
  if(next.nutrients){next.nutrients={k:finite(next.nutrients.k)*factor,p:finite(next.nutrients.p)*factor,c:finite(next.nutrients.c)*factor,f:finite(next.nutrients.f)*factor};}
  return next;
}
function rescaleItem(item,targetKcal){
  const current=Math.max(1,finite(item?.k));
  const factor=targetKcal/current;
  const next={...item};
  next.scale=Number((Math.max(.05,finite(item?.scale,1)*factor)).toFixed(6));
  next.k=round(targetKcal);
  next.p=round(finite(item?.p)*factor);
  next.c=round(finite(item?.c)*factor);
  next.f=round(finite(item?.f)*factor);
  if(Array.isArray(item?.ingredientAmounts))next.ingredientAmounts=item.ingredientAmounts.map(x=>scaleIngredient(x,factor));
  return next;
}
function targetKcals(kcal,shares){
  const daily=round(kcal),out=shares.map(s=>round(daily*s));
  out[out.length-1]+=daily-out.reduce((a,b)=>a+b,0);
  return out;
}
function rebalanceDay(day,prefs={}){
  if(!day||!Array.isArray(day.items)||!day.items.length)return day;
  const count=day.items.length,shares=sharesFor(count),daily=Math.max(1,finite(prefs.kcal,day.totals?.k||totals(day.items).k));
  if(shares.length!==count)return day;
  const targets=targetKcals(daily,shares),items=day.items.map((item,i)=>rescaleItem(item,targets[i])),t=totals(items);
  const actual=items.map(x=>finite(x.k)/Math.max(1,t.k));
  const cap=MAX_SHARE[count]||.40;
  if(actual.some(x=>x>cap+.005))throw new Error('El reparto energético ha superado el límite seguro de una comida.');
  const planner=root?.RecompMealPlanner;
  const withinTarget=planner?.withinTargets?planner.withinTargets(t,prefs,{k:.01,p:.14,c:.14,f:.16}):Math.abs(t.k-daily)/daily<=.01;
  return {...day,items,totals:t,withinTarget,energyDistribution:{version:'v53',shares:actual.map(x=>Number(x.toFixed(4))),targets,policy:'meal-budget-first'}};
}
function stabilizePlan(plan){
  if(!plan||!Array.isArray(plan.days))return plan;
  const prefs=plan.preferences||{};
  const days=plan.days.map(day=>rebalanceDay(day,prefs));
  return {...plan,days,quality:{...(plan.quality||{}),mealDistribution:'v53-meal-budget-first'}};
}
function installPlannerGuard(){
  const planner=root?.RecompMealPlanner;
  if(!planner||planner.__qualityV53)return false;
  const originalGenerate=planner.generateDays?.bind(planner),originalSwap=planner.swapMeal?.bind(planner);
  if(typeof originalGenerate!=='function')return false;
  planner.generateDays=(recipes,input={})=>stabilizePlan(originalGenerate(recipes,input));
  planner.generate30Days=(recipes,input={})=>planner.generateDays(recipes,{...input,days:30});
  if(typeof originalSwap==='function')planner.swapMeal=(plan,recipes,dayIndex,itemIndex)=>stabilizePlan(originalSwap(plan,recipes,dayIndex,itemIndex));
  planner.rebalanceDayV53=rebalanceDay;
  planner.__qualityV53=true;
  return true;
}
function installMobileFit(){
  if(typeof document==='undefined'||document.getElementById('r10QualityV53Styles'))return;
  const style=document.createElement('style');
  style.id='r10QualityV53Styles';
  style.textContent=`
html,body{width:100%;max-width:100%;overflow-x:hidden;-webkit-text-size-adjust:100%}body{min-width:0}main,.section,.card,.hero,.rn-shell,.mp-form,.mp-day,.mp-meal{min-width:0;max-width:100%}img,video,canvas,svg{max-width:100%}button,input,select,textarea{max-width:100%}.row>*{min-width:0}.mp-meal>div,.mp-recipe-link,.history>*{min-width:0;overflow-wrap:anywhere}.rn-plan-strip,.mp-tabs{max-width:100%;scrollbar-width:none;-webkit-overflow-scrolling:touch}.rn-plan-strip::-webkit-scrollbar,.mp-tabs::-webkit-scrollbar{display:none}
@media(max-width:520px){main{padding-left:max(10px,env(safe-area-inset-left));padding-right:max(10px,env(safe-area-inset-right));padding-bottom:calc(108px + env(safe-area-inset-bottom))}.brand{font-size:18px}.brand>div:before{width:32px;height:32px;margin-right:7px}.badge{font-size:9px;padding:5px 7px}.hero,.rn-hero{padding:18px!important;border-radius:22px!important}.hero h1,.rn-hero h1{font-size:clamp(25px,8vw,31px)!important;letter-spacing:-.8px!important}.grid{gap:8px}.card{padding:13px;border-radius:18px}.row{flex-wrap:wrap}.row>*{flex:1 1 145px}.setrow{grid-template-columns:30px minmax(0,1fr) minmax(0,1fr) minmax(0,1fr);gap:5px}.setrow input{padding:10px 5px;text-align:center}.exhead,.exerciseHead{flex-direction:column}.exactions{display:flex;gap:6px}.exactions button{flex:1}.mp-meal{padding:11px 10px!important;align-items:flex-start}.mp-meal button{flex:0 0 38px;padding:9px 6px}.rn-actions{display:grid!important;grid-template-columns:1fr}.rn-actions button{min-width:0!important;width:100%}.rn-tabs{top:64px}.rn-macros{grid-template-columns:repeat(2,minmax(0,1fr))!important}.rn-plan-stats{grid-template-columns:repeat(2,minmax(0,1fr))!important}nav{grid-template-columns:repeat(6,minmax(0,1fr));padding-left:max(3px,env(safe-area-inset-left));padding-right:max(3px,env(safe-area-inset-right))}nav button{font-size:9px;padding:7px 0}.navicon{font-size:18px}}
@media(max-width:370px){main{padding-left:8px;padding-right:8px}.grid{grid-template-columns:1fr 1fr}.stat{font-size:24px}.rn-macros,.rn-plan-stats{grid-template-columns:1fr 1fr!important}.journal-nav{grid-template-columns:38px minmax(0,1fr) 38px}.mp-day summary{padding:12px}.mp-meal{gap:5px}.mp-meal button{flex-basis:34px}.rn-plan-card{min-width:132px}.rn-tabs button{font-size:12px;padding:9px 3px}}
`;
  document.head.appendChild(style);
}
function boot(){installPlannerGuard();installMobileFit();}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();}
else installPlannerGuard();
return{sharesFor,rebalanceDay,stabilizePlan,installPlannerGuard,installMobileFit};
});
