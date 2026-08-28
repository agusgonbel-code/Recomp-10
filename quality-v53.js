(function(root,factory){
'use strict';
const api=factory(root);
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.RecompQualityV53=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const finite=(v,f=0)=>{const n=Number(v);return Number.isFinite(n)?n:f};
const round=v=>Math.round(finite(v));
const SHARES={3:[.25,.40,.35],4:[.22,.34,.14,.30],5:[.20,.10,.32,.12,.26],6:[.18,.10,.29,.11,.24,.08],7:[.14,.08,.24,.08,.21,.08,.17]};
const MAX_SHARE={3:.45,4:.40,5:.36,6:.34,7:.32};
function mealIndex(n,pattern){if(pattern==='breakfast')return 0;if(pattern==='lunch')return n<=4?1:2;if(pattern==='dinner')return n===6?4:n-1;return-1;}
function sharesFor(count,pattern='balanced'){const n=Math.min(7,Math.max(3,Math.round(finite(count,4))));if(n<=6&&root?.RecompProfile?.shares)return root.RecompProfile.shares(n,pattern);const a=[...(SHARES[n]||SHARES[4])],idx=mealIndex(n,pattern);if(idx<0)return a;const cap=MAX_SHARE[n]||.40,bonus=Math.max(0,Math.min(.06,cap-a[idx]));if(!bonus)return a;const take=bonus/(n-1);for(let i=0;i<n;i++)a[i]+=i===idx?bonus:-take;const sum=a.reduce((x,y)=>x+y,0);return a.map(x=>x/sum);}
function activePattern(prefs={}){if(['balanced','breakfast','lunch','dinner'].includes(prefs.mealPattern))return prefs.mealPattern;if(typeof localStorage!=='undefined'){try{const p=JSON.parse(localStorage.getItem('recomp_unified_profile_v2')||'{}');if(['balanced','breakfast','lunch','dinner'].includes(p.mealPattern))return p.mealPattern}catch{}}return'balanced';}
function totals(items=[]){return items.reduce((a,x)=>({k:a.k+finite(x.k),p:a.p+finite(x.p),c:a.c+finite(x.c),f:a.f+finite(x.f)}),{k:0,p:0,c:0,f:0});}
function scaleIngredient(ingredient,factor){if(!ingredient||typeof ingredient!=='object')return ingredient;const next={...ingredient};if(Number.isFinite(Number(next.qty))){const step=/^ud|unidad/i.test(String(next.unit||'')) ? .5 : (Number(next.qty)*factor>=50?5:1);next.qty=Math.max(step,Math.round((Number(next.qty)*factor)/step)*step);if(next.name){const shown=Number.isInteger(next.qty)?next.qty:next.qty.toFixed(1);next.text=`${shown} ${next.unit||'g'} de ${next.name}`;}}if(next.nutrients){next.nutrients={k:finite(next.nutrients.k)*factor,p:finite(next.nutrients.p)*factor,c:finite(next.nutrients.c)*factor,f:finite(next.nutrients.f)*factor};}return next;}
function rescaleItem(item,targetKcal){
  const current=Math.max(1,finite(item?.k)),factor=targetKcal/current;
  if(item?.nutritionBasis==='ingredient-composition'||item?.recipe?.composition!==undefined){
    const calculate=root?.RecompMealPlanner?.portionFromComposition;
    if(typeof calculate!=='function')throw new Error('No está disponible el cálculo de raciones por ingredientes.');
    // Recompute from the new rounded quantities; do not scale rounded macros
    // or force the requested calories independently of the ingredient ledger.
    return {...item,...calculate(item.recipe,item.slot,finite(item.scale,1)*factor)};
  }
  const next={...item};next.scale=Number((Math.max(.05,finite(item?.scale,1)*factor)).toFixed(6));next.k=round(targetKcal);next.p=round(finite(item?.p)*factor);next.c=round(finite(item?.c)*factor);next.f=round(finite(item?.f)*factor);if(Array.isArray(item?.ingredientAmounts))next.ingredientAmounts=item.ingredientAmounts.map(x=>scaleIngredient(x,factor));return next;
}
function targetKcals(kcal,shares){const daily=round(kcal),out=shares.map(s=>round(daily*s));out[out.length-1]+=daily-out.reduce((a,b)=>a+b,0);return out;}
function rebalanceDay(day,prefs={},options={}){
  if(!day||!Array.isArray(day.items)||!day.items.length)return day;
  const count=day.items.length,pattern=activePattern(prefs),shares=sharesFor(count,pattern),daily=Math.max(1,finite(prefs.kcal,day.totals?.k||totals(day.items).k));
  if(shares.length!==count)return day;
  const isFixed=item=>/^fixed-/.test(String(item?.recipe?.id||'')),hasFixed=day.items.some(isFixed);
  const planner=root?.RecompMealPlanner,initial=totals(day.items),limit=MAX_SHARE[count]||.40;
  // A completed substitution may already satisfy all four targets. Do not
  // destroy that fit by imposing calorie shares a second time.
  const preserveFit=options.preserveNutrientFit===true
    &&day.items.some(item=>item.nutritionBasis==='ingredient-composition')
    &&planner?.withinTargets?.(initial,prefs,{k:.03,p:.05,c:.06,f:.08})
    &&day.items.every(item=>finite(item.k)/Math.max(1,initial.k)<=limit+.005);
  const items=hasFixed||preserveFit?day.items.map(item=>({...item})):day.items.map((item,i)=>rescaleItem(item,targetKcals(daily,shares)[i]));
  const targets=items.map(item=>round(item.k)),t=totals(items),actual=items.map(x=>finite(x.k)/Math.max(1,t.k)),cap=MAX_SHARE[count]||.40;
  if(actual.some(x=>x>cap+.005))throw new Error('El reparto energético ha superado el límite configurado para una sola comida.');
  const withinTarget=planner?.withinTargets?planner.withinTargets(t,prefs,{k:.03,p:.05,c:.06,f:.08}):Math.abs(t.k-daily)/daily<=.03;
  return{...day,items,totals:t,withinTarget,macroAdjusted:false,energyDistribution:{version:'v53',shares:actual.map(x=>Number(x.toFixed(4))),targets,pattern,policy:hasFixed?'fixed-morning-first':preserveFit?'macro-fit-preserved':'meal-budget-first'}};
}
function stabilizePlan(plan,options={}){if(!plan||!Array.isArray(plan.days))return plan;const prefs=plan.preferences||{};const days=plan.days.map(day=>rebalanceDay(day,prefs,options));return{...plan,days,quality:{...(plan.quality||{}),mealDistribution:'v53-meal-budget-first'}};}
function installPlannerGuard(){const planner=root?.RecompMealPlanner;if(!planner||planner.__qualityV53)return false;const originalGenerate=planner.generateDays?.bind(planner),originalSwap=planner.swapMeal?.bind(planner);if(typeof originalGenerate!=='function')return false;planner.generateDays=(recipes,input={})=>stabilizePlan(originalGenerate(recipes,input));planner.generate30Days=(recipes,input={})=>planner.generateDays(recipes,{...input,days:30});if(typeof originalSwap==='function')planner.swapMeal=(plan,recipes,dayIndex,itemIndex)=>stabilizePlan(originalSwap(plan,recipes,dayIndex,itemIndex),{preserveNutrientFit:true});planner.rebalanceDayV53=rebalanceDay;planner.__qualityV53=true;return true;}
function installMobileFit(){if(typeof document==='undefined'||document.getElementById('r10QualityV53Styles'))return;const style=document.createElement('style');style.id='r10QualityV53Styles';style.textContent=`html,body{width:100%;max-width:100%;overflow-x:hidden;-webkit-text-size-adjust:100%}body{min-width:0}main,.section,.card,.hero,.rn-shell,.mp-form,.mp-day,.mp-meal{min-width:0;max-width:100%}img,video,canvas,svg{max-width:100%}button,input,select,textarea{max-width:100%}.row>*{min-width:0}.mp-meal>div,.history>*{min-width:0;overflow-wrap:anywhere}.mp-recipe-link{min-width:0;overflow-wrap:normal;word-break:normal;white-space:normal}.rn-plan-strip,.mp-tabs{max-width:100%;scrollbar-width:none;-webkit-overflow-scrolling:touch}.rn-plan-strip::-webkit-scrollbar,.mp-tabs::-webkit-scrollbar{display:none}@media(max-width:520px){main{padding-left:max(10px,env(safe-area-inset-left));padding-right:max(10px,env(safe-area-inset-right));padding-bottom:calc(108px + env(safe-area-inset-bottom))}.brand{font-size:18px}.brand>div:before{width:32px;height:32px;margin-right:7px}.badge{font-size:9px;padding:5px 7px}.hero,.rn-hero{padding:18px!important;border-radius:22px!important}.hero h1,.rn-hero h1{font-size:clamp(25px,8vw,31px)!important;letter-spacing:-.8px!important}.grid{gap:8px}.card{padding:13px;border-radius:18px}.row{flex-wrap:wrap}.row>*{flex:1 1 145px}.setrow{grid-template-columns:30px minmax(0,1fr) minmax(0,1fr) minmax(0,1fr);gap:5px}.setrow input{padding:10px 5px;text-align:center}.exhead,.exerciseHead{flex-direction:column}.exactions{display:flex;gap:6px}.exactions button{flex:1}.mp-meal{padding:11px 10px!important;align-items:flex-start}.mp-meal button{flex:0 0 38px;padding:9px 6px}.rn-actions{display:grid!important;grid-template-columns:1fr}.rn-actions button{min-width:0!important;width:100%}.rn-tabs{top:64px}.rn-macros{grid-template-columns:repeat(2,minmax(0,1fr))!important}.rn-plan-stats{grid-template-columns:repeat(2,minmax(0,1fr))!important}nav{grid-template-columns:repeat(6,minmax(0,1fr));padding-left:max(3px,env(safe-area-inset-left));padding-right:max(3px,env(safe-area-inset-right))}nav button{font-size:9px;padding:7px 0}.navicon{font-size:18px}}@media(max-width:370px){main{padding-left:8px;padding-right:8px}.grid{grid-template-columns:1fr 1fr}.stat{font-size:24px}.rn-macros,.rn-plan-stats{grid-template-columns:1fr 1fr!important}.journal-nav{grid-template-columns:38px minmax(0,1fr) 38px}.mp-day summary{padding:12px}.mp-meal{gap:5px}.mp-meal button{flex-basis:34px}.rn-plan-card{min-width:132px}.rn-tabs button{font-size:12px;padding:9px 3px}}`;document.head.appendChild(style);}
function boot(){installPlannerGuard();installMobileFit();}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();}else installPlannerGuard();
return{sharesFor,rebalanceDay,stabilizePlan,installPlannerGuard,installMobileFit,activePattern};
});


