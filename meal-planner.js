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

  function macroTargets(input={},fallback={kcal:2200,protein:160,carbs:250,fat:70}){
    const kcal=number(input?.kcal,number(fallback?.kcal,2200));
    const protein=number(input?.protein,number(fallback?.protein,160));
    let carbs=number(input?.carbs,NaN),fat=number(input?.fat,NaN);
    if(!Number.isFinite(carbs)||!Number.isFinite(fat)){
      fat=number(fallback?.fat,Math.round(kcal*.27/9));
      carbs=number(fallback?.carbs,Math.max(50,Math.round((kcal-protein*4-fat*9)/4)));
    }
    return {kcal:clamp(kcal,1200,5000),protein:clamp(protein,40,300),carbs:clamp(carbs,50,800),fat:clamp(fat,30,200)};
  }

  function validatePreferences(input={}){
    const targets=macroTargets(input),meals=Math.trunc(number(input.meals,4)),days=Math.trunc(number(input.days,7));
    if(![3,4,5].includes(meals)) throw new Error('Selecciona entre 3 y 5 comidas.');
    if(days<1||days>30) throw new Error('Selecciona entre 1 y 30 días.');
    return {...targets,meals,days,diet:input.diet||'flexible',excluded:Array.isArray(input.excluded)?input.excluded.map(norm).filter(Boolean):String(input.excluded||'').split(',').map(norm).filter(Boolean),pantry:Array.isArray(input.pantry)?input.pantry.map(norm).filter(Boolean):String(input.pantry||'').split(',').map(norm).filter(Boolean),maxTime:clamp(number(input.maxTime,30),10,90),budget:input.budget||'medio',variety:input.variety||'alta'};
  }

  function normalizeRecipeCatalog(catalog){
    return (Array.isArray(catalog)?catalog:[]).map(recipe=>({id:String(recipe?.id||''),n:String(recipe?.n||recipe?.name||'').trim(),m:(recipe?.m||recipe?.type)==='Snack'?'Merienda':String(recipe?.m||recipe?.type||''),k:number(recipe?.k??recipe?.kcal,0),p:number(recipe?.p,0),c:number(recipe?.c,0),f:number(recipe?.f,0),i:Array.isArray(recipe?.i)?recipe.i:(Array.isArray(recipe?.ingredients)?recipe.ingredients:[]),s:Array.isArray(recipe?.s)?recipe.s:(Array.isArray(recipe?.steps)?recipe.steps:[]),time:number(recipe?.time,0),difficulty:String(recipe?.difficulty||'')})).filter(recipe=>recipe.n&&recipe.m&&recipe.k>0&&recipe.p>=0&&recipe.c>=0&&recipe.f>=0);
  }

  function allowedRecipes(recipes,prefs){const blocks=[...(DIET_BLOCKS[prefs.diet]||[]),...prefs.excluded].map(norm);return (Array.isArray(recipes)?recipes:[]).filter(r=>{const txt=textOf(r);return !blocks.some(x=>x&&txt.includes(x));});}

  function baseScore(recipe,slot,share,prefs,usage,seed){
    const target={k:prefs.kcal*share,p:prefs.protein*share,c:prefs.carbs*share,f:prefs.fat*share};
    const scale=clamp(target.k/Math.max(1,recipe.k),.55,2.2),txt=textOf(recipe);
    const err=Math.abs(recipe.p*scale-target.p)/Math.max(15,target.p)+Math.abs(recipe.c*scale-target.c)/Math.max(20,target.c)+Math.abs(recipe.f*scale-target.f)/Math.max(8,target.f);
    const repeat=(usage.get(recipe.n)||0)*(prefs.variety==='alta'?.42:prefs.variety==='media'?.24:.10);
    const pantry=prefs.pantry.some(x=>txt.includes(x))?-.16:0;
    const budget=prefs.budget==='bajo'&&/(salmon|gamba|solomillo|atun fresco)/.test(txt)?.3:0;
    const time=prefs.maxTime<=20&&recipe.time>20?.3:0;
    const jitter=((seed*9301+49297)%233280)/233280*.06;
    return err+repeat+pantry+budget+time+jitter;
  }

  function pickRecipe(recipes,slot,share,prefs,usage,seed,avoid){
    let candidates=recipes.filter(r=>slotAliases(slot).includes(r.m)&&r.n!==avoid);
    if(!candidates.length)candidates=recipes.filter(r=>r.n!==avoid);
    if(!candidates.length)throw new Error('No quedan recetas compatibles con tus restricciones.');
    return candidates.map(r=>({r,score:baseScore(r,slot,share,prefs,usage,seed)})).sort((a,b)=>a.score-b.score||a.r.n.localeCompare(b.r.n,'es'))[seed%Math.min(5,candidates.length)].r;
  }

  function solve3(m,b){
    const a=m.map((row,i)=>[...row,b[i]]);
    for(let col=0;col<3;col++){
      let pivot=col;for(let r=col+1;r<3;r++)if(Math.abs(a[r][col])>Math.abs(a[pivot][col]))pivot=r;
      if(Math.abs(a[pivot][col])<1e-9)return null;
      [a[col],a[pivot]]=[a[pivot],a[col]];
      const d=a[col][col];for(let j=col;j<4;j++)a[col][j]/=d;
      for(let r=0;r<3;r++)if(r!==col){const f=a[r][col];for(let j=col;j<4;j++)a[r][j]-=f*a[col][j];}
    }
    return [a[0][3],a[1][3],a[2][3]];
  }

  function optimizeScales(recipes,prefs,initial){
    const n=recipes.length,target=[prefs.protein,prefs.carbs,prefs.fat],x=initial.slice();
    const A=[recipes.map(r=>r.p),recipes.map(r=>r.c),recipes.map(r=>r.f)];
    for(let pass=0;pass<8;pass++){
      const current=A.map(row=>row.reduce((s,v,i)=>s+v*x[i],0));
      const residual=target.map((t,j)=>t-current[j]);
      if(residual.every((v,j)=>Math.abs(v)<=Math.max(0.15,target[j]*.0015)))break;
      const free=x.map((v,i)=>v>.3501&&v<3.2499?i:null).filter(i=>i!==null);
      const idx=free.length>=3?free:[...Array(n).keys()];
      const gram=Array.from({length:3},(_,r)=>Array.from({length:3},(_,c)=>idx.reduce((sum,i)=>sum+A[r][i]*A[c][i],0)));
      for(let j=0;j<3;j++)gram[j][j]+=1e-6;
      const y=solve3(gram,residual);if(!y)break;
      idx.forEach(i=>{let delta=0;for(let j=0;j<3;j++)delta+=A[j][i]*y[j];x[i]=clamp(x[i]+delta,.35,3.25)});
    }
    return x;
  }

  function scaledItem(recipe,slot,scale,score=0){return {recipe,slot,scale,k:Math.round(recipe.k*scale),p:Math.round(recipe.p*scale),c:Math.round(recipe.c*scale),f:Math.round(recipe.f*scale),score};}
  function totals(items){return items.reduce((a,x)=>({k:a.k+x.k,p:a.p+x.p,c:a.c+x.c,f:a.f+x.f}),{k:0,p:0,c:0,f:0});}
  function macroError(t,prefs){return Math.abs(t.p-prefs.protein)/Math.max(1,prefs.protein)+Math.abs(t.c-prefs.carbs)/Math.max(1,prefs.carbs)+Math.abs(t.f-prefs.fat)/Math.max(1,prefs.fat);}

  function buildDay(pool,prefs,usage,day,forced={}){
    const slots=slotsFor(prefs.meals);let best=null;
    for(let attempt=0;attempt<120;attempt++){
      const chosen=slots.map(([slot,share],i)=>forced[i]||pickRecipe(pool,slot,share,prefs,usage,day*97+attempt*19+i*7,forced.avoid));
      const init=slots.map(([,share],i)=>clamp((prefs.kcal*share)/Math.max(1,chosen[i].k),.5,2.4));
      const scales=optimizeScales(chosen,prefs,init),items=chosen.map((r,i)=>scaledItem(r,slots[i][0],scales[i]));
      const t=totals(items),err=macroError(t,prefs);
      if(!best||err<best.err)best={items,t,err};
      if(err<.012)break;
    }
    best.items.forEach(x=>usage.set(x.recipe.n,(usage.get(x.recipe.n)||0)+1));
    return {day:day+1,items:best.items,totals:best.t};
  }

  function generateDays(recipes,input){
    const prefs=validatePreferences(input),pool=allowedRecipes(recipes,prefs);
    if(pool.length<4)throw new Error('Las restricciones dejan muy pocas recetas. Revisa las exclusiones.');
    const usage=new Map(),days=Array.from({length:prefs.days},(_,day)=>buildDay(pool,prefs,usage,day));
    return {createdAt:new Date().toISOString(),preferences:prefs,days};
  }
  const generate30Days=(recipes,input)=>generateDays(recipes,{...input,days:30});

  function swapMeal(plan,recipes,dayIndex,itemIndex){
    if(!plan?.days?.[dayIndex])throw new Error('Día no válido.');
    const prefs=validatePreferences({...plan.preferences,days:plan.days.length}),pool=allowedRecipes(recipes,prefs);
    const day=plan.days[dayIndex],old=day.items[itemIndex];
    let candidates=pool.filter(r=>slotAliases(old.slot).includes(r.m)&&r.n!==old.recipe.n);
    if(!candidates.length)candidates=pool.filter(r=>r.n!==old.recipe.n);
    if(!candidates.length)throw new Error('No hay una alternativa equivalente disponible.');
    let best=null;
    candidates.slice().sort((a,b)=>{
      const sa=clamp(old.k/Math.max(1,a.k),.35,3.25),sb=clamp(old.k/Math.max(1,b.k),.35,3.25);
      const ea=Math.abs(a.p*sa-old.p)/Math.max(10,old.p)+Math.abs(a.c*sa-old.c)/Math.max(15,old.c)+Math.abs(a.f*sa-old.f)/Math.max(6,old.f);
      const eb=Math.abs(b.p*sb-old.p)/Math.max(10,old.p)+Math.abs(b.c*sb-old.c)/Math.max(15,old.c)+Math.abs(b.f*sb-old.f)/Math.max(6,old.f);
      return ea-eb;
    }).slice(0,24).forEach(candidate=>{
      const chosen=day.items.map((x,i)=>i===itemIndex?candidate:x.recipe);
      const initial=day.items.map((x,i)=>i===itemIndex?clamp(old.k/Math.max(1,candidate.k),.35,3.25):x.scale);
      const scales=optimizeScales(chosen,prefs,initial),items=chosen.map((r,i)=>scaledItem(r,day.items[i].slot,scales[i]));
      const t=totals(items),err=macroError(t,prefs);
      if(!best||err<best.err)best={items,t,err};
    });
    if(!best)throw new Error('No se pudo calcular una alternativa equivalente.');
    plan.days[dayIndex]={day:day.day,items:best.items,totals:best.t};
    return plan;
  }

  function scaleIngredient(raw,scale){
    const text=String(raw||'').trim();
    const m=text.match(/^\s*(\d+(?:[.,]\d+)?)(\s*)(g|kg|ml|l|ud|uds|unidad(?:es)?|cucharad(?:a|as)|cuchar(?:ada|adas))\b\s*(.*)$/i);
    if(!m)return {text,scaled:false};
    let value=Number(m[1].replace(',','.'))*scale,unit=m[3],rest=m[4];
    if(/^kg$/i.test(unit)){value*=1000;unit='g'}
    if(/^l$/i.test(unit)){value*=1000;unit='ml'}
    const whole=/^(g|ml|ud|uds|unidad|unidades)$/i.test(unit);
    const shown=whole?Math.max(1,Math.round(value)):Math.round(value*10)/10;
    return {text:`${shown} ${unit}${rest?' '+rest:''}`,scaled:true};
  }
  function ingredientsFor(item){return (item?.recipe?.i||[]).map(raw=>scaleIngredient(raw,item.scale).text);}

  function shoppingByWeek(plan,week=0){
    const start=week*7,end=Math.min(start+7,plan?.days?.length||0),map=new Map();
    (plan?.days||[]).slice(start,end).flatMap(d=>d.items).forEach(item=>ingredientsFor(item).forEach(raw=>{
      const key=norm(raw).replace(/^\d+[\d.,/]*\s*(g|kg|ml|l|ud|uds|unidad(?:es)?)?\s*/,'').trim()||norm(raw);
      if(!map.has(key))map.set(key,{name:raw,count:0});map.get(key).count+=1;
    }));
    return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'es'));
  }

  globalThis.RecompMealPlanner={macroTargets,validatePreferences,normalizeRecipeCatalog,allowedRecipes,generateDays,generate30Days,swapMeal,ingredientsFor,shoppingByWeek,totals};
})();
