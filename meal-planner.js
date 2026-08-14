(() => {
  'use strict';
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  const number=(v,fallback)=>Number.isFinite(Number(v))?Number(v):fallback;
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const textOf=r=>norm([r?.n,...(r?.i||[])].join(' '));
  const DIET_BLOCKS={
    vegetariana:['pollo','pavo','ternera','cerdo','jamon','atun','salmon','merluza','gamba','bacalao','sardina'],
    vegana:['pollo','pavo','ternera','cerdo','jamon','atun','salmon','merluza','gamba','bacalao','sardina','huevo','leche','yogur','queso','skyr','whey'],
    pescetariana:['pollo','pavo','ternera','cerdo','jamon'],
    'sin-lactosa':['leche','yogur','queso','skyr','whey','requeson'],
    'sin-gluten':['trigo','pan','pasta','cuscus','tortilla de trigo','avena']
  };
  const slotsFor=count=>({
    3:[['Desayuno',.25],['Comida',.40],['Cena',.35]],
    4:[['Desayuno',.22],['Comida',.34],['Merienda',.14],['Cena',.30]],
    5:[['Desayuno',.20],['Media mañana',.10],['Comida',.32],['Merienda',.12],['Cena',.26]]
  })[count]||slotsFor(4);
  const slotAliases=slot=>slot==='Media mañana'?['Media mañana','Merienda','Desayuno']:[slot];

  function macroTargets(input={},fallback={kcal:2200,protein:160}){
    const kcal=number(input?.kcal,number(fallback?.kcal,2200));
    const protein=number(input?.protein,number(fallback?.protein,160));
    return {
      kcal:kcal>=1200&&kcal<=5000?kcal:number(fallback?.kcal,2200),
      protein:protein>=40&&protein<=300?protein:number(fallback?.protein,160)
    };
  }

  function validatePreferences(input={}){
    const kcal=number(input.kcal,0),protein=number(input.protein,0),meals=Math.trunc(number(input.meals,4));
    if(kcal<1200||kcal>5000) throw new Error('Las calorías deben estar entre 1200 y 5000.');
    if(protein<40||protein>300) throw new Error('La proteína debe estar entre 40 y 300 g.');
    if(![3,4,5].includes(meals)) throw new Error('Selecciona entre 3 y 5 comidas.');
    return {
      kcal,protein,meals,
      diet:input.diet||'flexible',
      excluded:String(input.excluded||'').split(',').map(norm).filter(Boolean),
      pantry:String(input.pantry||'').split(',').map(norm).filter(Boolean),
      maxTime:clamp(number(input.maxTime,30),10,90),
      budget:input.budget||'medio',
      variety:input.variety||'alta'
    };
  }

  function allowedRecipes(recipes,prefs){
    const blocks=[...(DIET_BLOCKS[prefs.diet]||[]),...prefs.excluded].map(norm);
    return (Array.isArray(recipes)?recipes:[]).filter(r=>{
      const txt=textOf(r);
      return !blocks.some(x=>x&&txt.includes(x));
    });
  }

  function scoreRecipe(recipe,targetK,targetP,prefs,usage,seed){
    const scale=clamp(targetK/Math.max(1,number(recipe.k,400)),.65,1.75);
    const k=Math.round(number(recipe.k,0)*scale),p=Math.round(number(recipe.p,0)*scale);
    const txt=textOf(recipe);
    const pantryBonus=prefs.pantry.some(x=>txt.includes(x))?-.18:0;
    const repeatPenalty=(usage.get(recipe.n)||0)*(prefs.variety==='alta'?.42:prefs.variety==='media'?.25:.12);
    const budgetPenalty=prefs.budget==='bajo'&&/(salmon|gamba|solomillo|atun fresco)/.test(txt)?.35:0;
    const timePenalty=prefs.maxTime<=20&&/(horno|guiso|lasaña|risotto)/.test(txt)?.30:0;
    const jitter=((seed*9301+49297)%233280)/233280*.08;
    return {recipe,scale,k,p,c:Math.round(number(recipe.c,0)*scale),f:Math.round(number(recipe.f,0)*scale),
      score:Math.abs(k-targetK)/targetK+Math.abs(p-targetP)/Math.max(1,targetP)+pantryBonus+repeatPenalty+budgetPenalty+timePenalty+jitter};
  }

  function pick(recipes,slot,share,prefs,usage,seed,avoid){
    let candidates=recipes.filter(r=>slotAliases(slot).includes(r?.m)&&r.n!==avoid);
    if(!candidates.length) candidates=recipes.filter(r=>r.n!==avoid);
    if(!candidates.length) throw new Error('No quedan recetas compatibles con tus restricciones.');
    const ranked=candidates.map(r=>scoreRecipe(r,prefs.kcal*share,prefs.protein*share,prefs,usage,seed)).sort((a,b)=>a.score-b.score||a.recipe.n.localeCompare(b.recipe.n,'es'));
    const item=ranked[seed%Math.min(4,ranked.length)];
    usage.set(item.recipe.n,(usage.get(item.recipe.n)||0)+1);
    return {...item,slot};
  }

  function totals(items){return items.reduce((a,x)=>({k:a.k+x.k,p:a.p+x.p,c:a.c+x.c,f:a.f+x.f}),{k:0,p:0,c:0,f:0});}
  function generate30Days(recipes,input){
    const prefs=validatePreferences(input),pool=allowedRecipes(recipes,prefs);
    if(pool.length<4) throw new Error('Las restricciones dejan muy pocas recetas. Revisa las exclusiones.');
    const usage=new Map(),slots=slotsFor(prefs.meals);
    const days=Array.from({length:30},(_,day)=>{
      const items=slots.map(([slot,share],i)=>pick(pool,slot,share,prefs,usage,day*11+i*3,null));
      return {day:day+1,items,totals:totals(items)};
    });
    return {createdAt:new Date().toISOString(),preferences:prefs,days};
  }
  function swapMeal(plan,recipes,dayIndex,itemIndex){
    if(!plan?.days?.[dayIndex]) throw new Error('Día no válido.');
    const prefs=validatePreferences(plan.preferences),pool=allowedRecipes(recipes,prefs),usage=new Map();
    plan.days.flatMap(d=>d.items).forEach(x=>usage.set(x.recipe.n,(usage.get(x.recipe.n)||0)+1));
    const old=plan.days[dayIndex].items[itemIndex],share=slotsFor(prefs.meals)[itemIndex]?.[1]||1/prefs.meals;
    plan.days[dayIndex].items[itemIndex]=pick(pool,old.slot,share,prefs,usage,Date.now()%997,old.recipe.n);
    plan.days[dayIndex].totals=totals(plan.days[dayIndex].items);
    return plan;
  }
  function shoppingByWeek(plan,week=0){
    const start=week*7,end=Math.min(start+7,30),map=new Map();
    (plan?.days||[]).slice(start,end).flatMap(d=>d.items).forEach(item=>(item.recipe.i||[]).forEach(raw=>{
      const key=norm(raw).replace(/^\d+[\d.,/]*\s*(g|kg|ml|l|ud|unidad(?:es)?)?\s*/,'').trim()||norm(raw);
      if(!map.has(key)) map.set(key,{name:raw,count:0});
      map.get(key).count+=1;
    }));
    return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'es'));
  }
  globalThis.RecompMealPlanner={macroTargets,validatePreferences,allowedRecipes,generate30Days,swapMeal,shoppingByWeek};
})();