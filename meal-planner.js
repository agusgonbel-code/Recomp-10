(() => {
'use strict';
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const number=(v,fallback)=>v===null||v===undefined||v===''?fallback:(Number.isFinite(Number(v))?Number(v):fallback);
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const textOf=r=>norm([r?.n,...(r?.i||[])].join(' '));
const DIET_BLOCKS={vegetariana:['pollo','pavo','ternera','cerdo','jamon','atun','salmon','merluza','gamba','bacalao','sardina'],vegana:['pollo','pavo','ternera','cerdo','jamon','atun','salmon','merluza','gamba','bacalao','sardina','huevo','leche','yogur','queso','skyr','whey'],pescetariana:['pollo','pavo','ternera','cerdo','jamon'],'sin-lactosa':['leche','yogur','queso','skyr','whey','requeson'],'sin-gluten':['trigo','pan','pasta','cuscus','tortilla de trigo','avena']};
const INFERRED_INGREDIENTS=[['tomate triturado',150,'g'],['verduras crudas',200,'g'],['verduras',250,'g'],['ensalada',150,'g'],['espinacas',100,'g'],['calabacin',200,'g'],['pimientos',150,'g'],['cebolla',80,'g'],['champinones',150,'g'],['guisantes',80,'g'],['frijoles',100,'g'],['yogur natural',125,'g'],['queso ligero',40,'g'],['lechuga',80,'g'],['tomate',150,'g'],['cacao',5,'g'],['canela',2,'g'],['fruta',150,'g'],['patata',220,'g'],['pan integral',70,'g'],['pan',60,'g'],['base integral',1,'ud']];
const slotsFor=count=>({1:[['Comida principal',1]],2:[['Comida',.55],['Cena',.45]],3:[['Desayuno',.25],['Comida',.40],['Cena',.35]],4:[['Desayuno',.22],['Comida',.34],['Merienda',.14],['Cena',.30]],5:[['Desayuno',.20],['Media mañana',.10],['Comida',.32],['Merienda',.12],['Cena',.26]]})[count]||slotsFor(4);
const remainingSlotsAfterBreakfast=count=>({2:[['Comida',.55],['Cena',.45]],3:[['Comida',.42],['Merienda',.18],['Cena',.40]],4:[['Media mañana',.14],['Comida',.38],['Merienda',.14],['Cena',.34]]})[count]||slotsFor(count);
const slotAliases=slot=>slot==='Media mañana'?['Media mañana','Merienda','Desayuno']:[slot];
function macroTargets(input={},fallback={kcal:2200,protein:160,carbs:250,fat:70}){const kcal=number(input?.kcal,number(fallback?.kcal,2200)),protein=number(input?.protein,number(fallback?.protein,160));let carbs=number(input?.carbs,NaN),fat=number(input?.fat,NaN);if(!Number.isFinite(carbs)||!Number.isFinite(fat)){fat=number(fallback?.fat,Math.round(kcal*.27/9));carbs=number(fallback?.carbs,Math.max(50,Math.round((kcal-protein*4-fat*9)/4)));}return {kcal:clamp(kcal,1200,5000),protein:clamp(protein,40,300),carbs:clamp(carbs,50,800),fat:clamp(fat,30,200)};}
function validatePreferences(input={}){const targets=macroTargets(input),meals=Math.trunc(number(input.meals,4)),days=Math.trunc(number(input.days,7));if(![1,2,3,4,5].includes(meals))throw new Error('Selecciona entre 3 y 5 comidas.');if(days<1||days>30)throw new Error('Selecciona entre 1 y 30 días.');return {...targets,meals,days,diet:input.diet||'flexible',excluded:Array.isArray(input.excluded)?input.excluded.map(norm).filter(Boolean):String(input.excluded||'').split(',').map(norm).filter(Boolean),pantry:Array.isArray(input.pantry)?input.pantry.map(norm).filter(Boolean):String(input.pantry||'').split(',').map(norm).filter(Boolean),maxTime:clamp(number(input.maxTime,30),10,90),budget:input.budget||'medio',variety:input.variety||'alta',trainingDays:clamp(Math.trunc(number(input.trainingDays,4)),0,7),trainingTime:/^([01]\d|2[0-3]):[0-5]\d$/.test(String(input.trainingTime||''))?String(input.trainingTime):'06:00',includeBreakfastCake:input.includeBreakfastCake===true||input.includeBreakfastCake==='true',includePostWorkoutShake:input.includePostWorkoutShake===true||input.includePostWorkoutShake==='true'};}
function defaultSteps(recipe){const title=norm(recipe?.n),ingredients=(recipe?.i||[]).join(', '),prep=`Pesa y prepara los ingredientes en las cantidades indicadas: ${ingredients}.`;if(/batido/.test(title))return [prep,'Añade primero los líquidos al vaso de la batidora y después el resto de ingredientes.','Tritura 30-45 segundos hasta obtener una textura homogénea y sirve al momento.'];if(/yogur|skyr|requeson|queso fresco|mousse|helado/.test(title))return [prep,'Coloca la base láctea o proteica en un bol y mezcla hasta que quede uniforme.','Añade la fruta, cereales, frutos secos o complementos indicados y mezcla justo antes de comer.'];if(/porridge|avena/.test(title)&&!/pancake|tortita|barrita|brownie/.test(title))return [prep,'Cuece o hidrata la avena con el líquido a fuego medio, removiendo hasta lograr la textura deseada.','Retira del fuego, incorpora el resto de ingredientes y sirve caliente o deja enfriar si la receta es tipo overnight.'];if(/pancake|tortita|brownie|barrita|cheesecake/.test(title))return [prep,'Mezcla los ingredientes de la masa hasta que no queden grumos.','Cocina en sartén antiadherente a fuego medio o en horno/airfryer hasta que el centro quede hecho.','Deja reposar unos minutos y sirve.'];if(/tortilla|revuelto|huevo/.test(title))return [prep,'Bate los huevos o claras y cocina los acompañamientos que necesiten más tiempo.','Añade el huevo a una sartén antiadherente y cocina a fuego medio hasta que cuaje, removiendo si es un revuelto.','Sirve con el pan, patata, verduras o acompañamiento indicado.'];if(/sandwich|bocadillo|wrap|burrito|fajita|pizza/.test(title))return [prep,'Cocina la proteína y las verduras en una sartén antiadherente con el aliño elegido.','Calienta el pan, tortilla o base y reparte el relleno de forma uniforme.','Monta la receta, cierra o dobla si corresponde y sirve caliente.'];const carb=/arroz/.test(title)?'arroz':/pasta|noodle/.test(title)?'pasta':/patata|boniato/.test(title)?'patata o boniato':/quinoa/.test(title)?'quinoa':/cuscus/.test(title)?'cuscús':/lenteja|garbanzo/.test(title)?'legumbre':'acompañamiento',protein=/pollo/.test(title)?'pollo':/pavo/.test(title)?'pavo':/ternera|hamburguesa|albondiga/.test(title)?'carne':/salmon/.test(title)?'salmón':/merluza|bacalao/.test(title)?'pescado':/atun/.test(title)?'atún':/tofu/.test(title)?'tofu':'proteína principal';return [prep,`Cocina el ${carb} hasta que quede en su punto y resérvalo.`,`Cocina ${protein} a fuego medio-alto hasta alcanzar una cocción completa, evitando resecarlo.`,`Añade las verduras y condimentos, combina todos los componentes y sirve con las cantidades indicadas.`];}
function normalizeRecipeCatalog(catalog){return (Array.isArray(catalog)?catalog:[]).map(recipe=>{const r={id:String(recipe?.id||''),n:String(recipe?.n||recipe?.name||'').trim(),m:(recipe?.m||recipe?.type)==='Snack'?'Merienda':String(recipe?.m||recipe?.type||''),k:number(recipe?.k??recipe?.kcal,0),p:number(recipe?.p,0),c:number(recipe?.c,0),f:number(recipe?.f,0),i:Array.isArray(recipe?.i)?recipe.i:(Array.isArray(recipe?.ingredients)?recipe.ingredients:[]),s:Array.isArray(recipe?.s)?recipe.s:(Array.isArray(recipe?.steps)?recipe.steps:[]),time:number(recipe?.time,0),difficulty:String(recipe?.difficulty||'')};if(recipe.composition!==undefined)Object.assign(r,withComposition({...r,composition:recipe.composition}));if(!r.s.length)r.s=defaultSteps(r);return r;}).filter(r=>r.n&&r.m&&r.k>0);}
function allowedRecipes(recipes,prefs){const blocks=[...(DIET_BLOCKS[prefs.diet]||[]),...prefs.excluded].map(norm);return (Array.isArray(recipes)?recipes:[]).filter(r=>{const txt=textOf(r);return !blocks.some(x=>x&&txt.includes(x));});}
function parseIngredient(raw){const text=String(raw||'').trim(),measured=text.match(/^\s*(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|ud|uds|unidad(?:es)?)\b\s*(?:de\s+)?(.*)$/i);if(measured){let qty=Number(measured[1].replace(',','.')),unit=measured[2].toLowerCase(),name=measured[3].trim();if(unit==='kg'){qty*=1000;unit='g'}else if(unit==='l'){qty*=1000;unit='ml'}return {raw:text,scalable:true,name,unit,baseQty:qty,explicit:true};}const counted=text.match(/^\s*(\d+(?:[.,]\d+)?)\s+(.+)$/i);if(counted)return {raw:text,scalable:true,name:counted[2].trim(),unit:'ud',baseQty:Number(counted[1].replace(',','.')),explicit:false,inferred:true};const n=norm(text),inferred=INFERRED_INGREDIENTS.find(([name])=>n===name||n.includes(name));if(inferred)return {raw:text,scalable:true,name:text,unit:inferred[2],baseQty:inferred[1],explicit:false,inferred:true};return {raw:text,scalable:true,name:text||'ingrediente',unit:'g',baseQty:100,explicit:false,inferred:true,estimated:true};}
// Composition is explicit, never inferred from recipe names or global macros.
// per100 uses the SAME unit/state as qty; no implicit raw/cooked or ml/g conversion.
function compositionFor(recipe){
  if(recipe.composition===undefined)return null;
  if(!Array.isArray(recipe.composition)||!recipe.composition.length)throw new Error('Composición de ingredientes incompleta.');
  return recipe.composition.map(entry=>{
    const text=value=>typeof value==='string'&&value.trim().length>0;
    const finite=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1000000;
    if(!entry||!text(entry.foodId)||!text(entry.name)||!text(entry.state)||!['g','ml'].includes(entry.unit)
      ||!finite(entry.qty)||entry.qty<=0||!entry.per100||!['k','p','c','f'].every(k=>finite(entry.per100[k]))
      ||!entry.source||!text(entry.source.id)||!text(entry.source.name)
      ||!/^https:\/\/[^\s]+$/.test(entry.source.url||'')||!/^\d{4}-\d{2}-\d{2}$/.test(entry.source.accessedAt||'')){
      throw new Error('Cada ingrediente necesita cantidad, unidad, estado, cuatro nutrientes por 100 y una fuente identificada.');
    }
    return {foodId:entry.foodId,name:entry.name,state:entry.state,unit:entry.unit,qty:entry.qty,
      per100:Object.fromEntries(['k','p','c','f'].map(k=>[k,entry.per100[k]])),
      source:{id:entry.source.id,name:entry.source.name,url:entry.source.url,accessedAt:entry.source.accessedAt}};
  });
}
function compositionAmounts(composition,scale){
  if(typeof scale!=='number'||!Number.isFinite(scale)||scale<=0)throw new Error('Escala de ingredientes no válida.');
  return composition.map(entry=>{
    const qty=practicalQty(entry.qty*scale,entry.unit);
    if(!Number.isFinite(qty)||qty>1000000)throw new Error('Cantidad de ingrediente fuera de rango.');
    // Contributions are rounded exactly as shown by the existing detail UI.
    const nutrients=Object.fromEntries(['k','p','c','f'].map(k=>{
      const precision=k==='k'?1:10,scaled=entry.per100[k]*qty/100*precision;
      // Correct binary representation noise at decimal half-way boundaries.
      return [k,Math.round(scaled+Number.EPSILON*Math.max(1,scaled)*4)/precision];
    }));
    return {...entry,qty,text:formatIngredientAmount({unit:entry.unit,name:entry.name+' ('+entry.state+')'},qty),
      nutrients,adjustable:true,estimated:false,quantityEstimated:false};
  });
}
function compositionTotals(amounts){
  // Sum displayed tenths as integers: 0.7 + 0.7 + 0.1 must round from
  // exactly 1.5, not from a binary floating point value just below it.
  return Object.fromEntries(['k','p','c','f'].map(k=>{
    const precision=k==='k'?1:10;
    const sum=amounts.reduce((total,entry)=>total+Math.round(entry.nutrients[k]*precision),0);
    return [k,Math.round(sum/precision)];
  }));
}
function withComposition(recipe){
  const composition=compositionFor(recipe);if(!composition)return recipe;
  const amounts=compositionAmounts(composition,1);
  return {...recipe,composition,...compositionTotals(amounts),i:amounts.map(entry=>entry.text)};
}
function recipeModel(recipe){return {recipe,composition:compositionFor(recipe),parsed:(recipe.i||[]).map(parseIngredient)};}
function portionFromComposition(recipe,slot,scale){
  const model=recipeModel(recipe);
  if(!model.composition)throw new Error('La ración necesita composición explícita de ingredientes.');
  return calcItems([{recipe,slot,scale,model}])[0];
}
function baseScore(recipe,slot,share,prefs,usage,seed){const target={k:prefs.kcal*share,p:prefs.protein*share,c:prefs.carbs*share,f:prefs.fat*share},scale=clamp(target.k/Math.max(1,recipe.k),.45,3),txt=textOf(recipe),err=Math.abs(recipe.p*scale-target.p)/Math.max(15,target.p)+Math.abs(recipe.c*scale-target.c)/Math.max(20,target.c)+Math.abs(recipe.f*scale-target.f)/Math.max(8,target.f),used=Math.min(4,usage.get(recipe.n)||0),repeat=used*(prefs.variety==='alta'?.055:prefs.variety==='media'?.03:.012),pantry=prefs.pantry.some(x=>txt.includes(x))?-.12:0,budget=prefs.budget==='bajo'&&/(salmon|gamba|solomillo|atun fresco)/.test(txt)?.2:0,time=prefs.maxTime<=20&&recipe.time>20?.2:0,jitter=((seed*9301+49297)%233280)/233280*.02;return err+repeat+pantry+budget+time+jitter;}
function pickRecipe(recipes,slot,share,prefs,usage,seed,avoid){let candidates=recipes.filter(r=>slotAliases(slot).includes(r.m)&&r.n!==avoid);if(!candidates.length)candidates=recipes.filter(r=>r.n!==avoid);if(!candidates.length)throw new Error('No quedan recetas compatibles con tus restricciones.');const ranked=candidates.map(r=>({r,score:baseScore(r,slot,share,prefs,usage,seed)})).sort((a,b)=>a.score-b.score||a.r.n.localeCompare(b.r.n,'es'));return ranked[seed%Math.min(4,ranked.length)].r;}
function solveLinear(matrix,b){const n=b.length,a=matrix.map((row,i)=>[...row,b[i]]);for(let col=0;col<n;col++){let pivot=col;for(let r=col+1;r<n;r++)if(Math.abs(a[r][col])>Math.abs(a[pivot][col]))pivot=r;if(Math.abs(a[pivot][col])<1e-10)return null;[a[col],a[pivot]]=[a[pivot],a[col]];const d=a[col][col];for(let j=col;j<=n;j++)a[col][j]/=d;for(let r=0;r<n;r++)if(r!==col){const f=a[r][col];for(let j=col;j<=n;j++)a[r][j]-=f*a[col][j];}}return a.map(row=>row[n]);}
function practicalQty(qty,unit='g'){if(/^ud|unidad/.test(unit)){const step=.5;return Math.max(step,Math.round(qty/step)*step)}const step=qty>=50?5:qty>=10?1:.5;return Math.max(step,Math.round(qty/step)*step);}
function formatIngredientAmount(parsed,qty){const shown=Number.isInteger(qty)?qty:qty.toFixed(1),unit=/^ud|unidad/.test(parsed.unit)?'ud':parsed.unit;return `${shown} ${unit}${parsed.name?' de '+parsed.name:''}`;}
function formatIngredient(parsed,scale){return formatIngredientAmount(parsed,practicalQty(parsed.baseQty*scale,parsed.unit));}
function makeItems(chosen,prefs,slots){return chosen.map((recipe,i)=>({recipe,slot:slots[i][0],model:recipeModel(recipe),scale:clamp((prefs.kcal*slots[i][1])/Math.max(1,recipe.k),.25,4)}));}
function calcItems(work){return work.map(item=>{if(item.model.composition){const ingredientAmounts=compositionAmounts(item.model.composition,item.scale);return {recipe:item.recipe,slot:item.slot,scale:item.scale,...compositionTotals(ingredientAmounts),ingredientAmounts,nutritionBasis:'ingredient-composition',ingredientNutritionVerified:false};}const quantities=item.model.parsed.map(parsed=>practicalQty(parsed.baseQty*item.scale,parsed.unit)),ratios=item.model.parsed.map((parsed,index)=>parsed.baseQty>0?quantities[index]/parsed.baseQty:item.scale),effectiveScale=ratios.length?ratios.reduce((a,b)=>a+b,0)/ratios.length:item.scale,ingredientAmounts=item.model.parsed.map((parsed,index)=>({text:formatIngredientAmount(parsed,quantities[index]),adjustable:true,qty:quantities[index],unit:parsed.unit||'',name:parsed.name||'',nutrients:null,estimated:true,quantityEstimated:!parsed.explicit}));return {recipe:item.recipe,slot:item.slot,scale:Number(effectiveScale.toFixed(6)),k:Math.round(item.recipe.k*effectiveScale),p:Math.round(item.recipe.p*effectiveScale),c:Math.round(item.recipe.c*effectiveScale),f:Math.round(item.recipe.f*effectiveScale),ingredientAmounts,nutritionBasis:'recipe-declared',ingredientNutritionVerified:false};});}
function totals(items){return items.reduce((a,x)=>({k:a.k+x.k,p:a.p+x.p,c:a.c+x.c,f:a.f+x.f}),{k:0,p:0,c:0,f:0});}
function macroDeviation(t,prefs){return {k:Math.abs(t.k-prefs.kcal)/Math.max(1,prefs.kcal),p:Math.abs(t.p-prefs.protein)/Math.max(1,prefs.protein),c:Math.abs(t.c-prefs.carbs)/Math.max(1,prefs.carbs),f:Math.abs(t.f-prefs.fat)/Math.max(1,prefs.fat)};}
function macroError(t,prefs){const d=macroDeviation(t,prefs);return d.k+d.p+d.c+d.f;}
function withinTargets(t,prefs,tolerance={k:.03,p:.04,c:.045,f:.06}){const d=macroDeviation(t,prefs);return d.k<=tolerance.k&&d.p<=tolerance.p&&d.c<=tolerance.c&&d.f<=tolerance.f;}
function optimizeIngredients(chosen,prefs,slots){
  const work=makeItems(chosen,prefs,slots),target=[prefs.kcal,prefs.protein,prefs.carbs,prefs.fat],weights=target.map(x=>Math.max(1,x));
  for(let pass=0;pass<28;pass++){
    const rendered=calcItems(work),t=totals(rendered),current=[t.k,t.p,t.c,t.f],residual=target.map((x,j)=>(x-current[j])/weights[j]);
    if(withinTargets(t,prefs,{k:.005,p:.008,c:.01,f:.012}))break;
    const derivatives=work.map(item=>[item.recipe.k/weights[0],item.recipe.p/weights[1],item.recipe.c/weights[2],item.recipe.f/weights[3]]),gram=Array.from({length:4},(_,r)=>Array.from({length:4},(_,c)=>derivatives.reduce((sum,d)=>sum+d[r]*d[c],0)+(r===c?2e-4:0))),y=solveLinear(gram,residual);
    if(!y)break;
    work.forEach((item,i)=>{let delta=0;for(let j=0;j<4;j++)delta+=derivatives[i][j]*y[j];item.scale=clamp(item.scale+delta,.18,5)});
  }
  let best=calcItems(work),bestErr=macroError(totals(best),prefs);
  // Repeated projected coordinate descent. The old implementation visited each
  // coordinate only once per step size, which could stop at a poor local point
  // after a meal swap even when a valid macro solution existed.
  for(const step of [.24,.12,.06,.03,.015,.0075,.00375,.001875]){
    let improved=true,round=0;
    while(improved&&round++<10){
      improved=false;
      for(const item of work){
        const original=item.scale;
        let localBest=original,localErr=bestErr,localRendered=best;
        for(const candidate of [original-step,original+step]){
          item.scale=clamp(candidate,.18,5);
          const rendered=calcItems(work),err=macroError(totals(rendered),prefs);
          if(err+1e-12<localErr){localErr=err;localBest=item.scale;localRendered=rendered;}
        }
        item.scale=localBest;
        if(localErr+1e-12<bestErr){bestErr=localErr;best=localRendered;improved=true;}
      }
      if(withinTargets(totals(best),prefs,{k:.005,p:.008,c:.01,f:.012}))break;
    }
  }
  return best;
}
function buildDay(pool,prefs,usage,day,forced={},limits={primary:50,secondary:50}){
 const slots=Array.isArray(prefs._slots)?prefs._slots:slotsFor(prefs.meals);let best=null;
 const attemptBuild=(activeUsage,attempts,offset=0)=>{
  for(let attempt=0;attempt<attempts;attempt++){
   const chosen=slots.map(([slot,share],i)=>forced[i]||pickRecipe(pool,slot,share,prefs,activeUsage,day*137+(attempt+offset)*29+i*13,forced.avoid)),items=optimizeIngredients(chosen,prefs,slots),t=totals(items),err=macroError(t,prefs);
   const accepted=typeof limits.accept==='function'?limits.accept(items):true;
   if(!best||(accepted&&!best.accepted)||(accepted===best.accepted&&err<best.err))best={items,t,err,accepted};
   if(accepted&&withinTargets(t,prefs))break;
  }
 };
 attemptBuild(usage,limits.primary);
 if(!best||!best.accepted||!withinTargets(best.t,prefs))attemptBuild(new Map(),limits.secondary,limits.primary);
 best.items.forEach(x=>usage.set(x.recipe.n,(usage.get(x.recipe.n)||0)+1));
 return {day:day+1,items:best.items,totals:best.t,error:best.err,withinTarget:withinTargets(best.t,prefs)};
}
function sameMacroBand(t,reference){const limits={k:.015,p:.02,c:.025,f:.03};return ['k','p','c','f'].every(key=>Math.abs(t[key]-reference[key])/Math.max(1,reference[key])<=limits[key]);}
function reconcileRemainingItems(items,target){
  // Never detach ingredient quantities from their nutrient contributions by
  // scaling legacy recipe totals or adding anchors without a composition source.
  if(items.some(item=>item.nutritionBasis==='ingredient-composition'))return items;
  const sum=list=>totals(list),within=t=>withinTargets(t,target,{k:.03,p:.05,c:.06,f:.08});
  const configuredShares=Array.isArray(target._slots)?target._slots.map(entry=>Number(entry[1])):[];
  const shareTotal=configuredShares.reduce((sum,value)=>sum+value,0)||items.length;
  const shares=items.map((_,index)=>configuredShares[index]!==undefined?configuredShares[index]/shareTotal:1/items.length);
  const initial=sum(items),balanced=items.every((item,index)=>Math.abs(item.k/Math.max(1,initial.k)-shares[index])<=.08);
  if(within(initial)&&balanced)return items;
  const anchors=[{name:'proteína whey',unit:'g',k:3.9,p:.78,c:.08,f:.06},{name:'arroz cocido',unit:'g',k:1.3,p:.027,c:.28,f:.003},{name:'aceite de oliva',unit:'g',k:8.84,p:0,c:0,f:1}];
  for(let factor=.9;factor>=.2;factor-=.05){
    const work=items.map((item,index)=>{const localFactor=(target.kcal*factor*shares[index])/Math.max(1,item.k),next={...item,scale:Number((item.scale*localFactor).toFixed(6)),k:Math.round(item.k*localFactor),p:Math.round(item.p*localFactor),c:Math.round(item.c*localFactor),f:Math.round(item.f*localFactor),ingredientAmounts:(item.ingredientAmounts||[]).map(ingredient=>{if(!Number.isFinite(Number(ingredient.qty)))return{...ingredient};const qty=practicalQty(Number(ingredient.qty)*localFactor,ingredient.unit),shown=Number.isInteger(qty)?qty:qty.toFixed(1);return{...ingredient,qty,text:`${shown} ${ingredient.unit||'g'}${ingredient.name?' de '+ingredient.name:''}`};})};return next;});
    const current=sum(work),residual=[target.protein-current.p,target.carbs-current.c,target.fat-current.f],matrix=[anchors.map(x=>x.p),anchors.map(x=>x.c),anchors.map(x=>x.f)],solved=solveLinear(matrix,residual);
    if(!solved||solved.some(value=>value<0||value>1200))continue;
    solved.forEach((grams,index)=>{const anchor=anchors[index];work.forEach((meal,at)=>{const qty=practicalQty(grams*shares[at],'g');meal.ingredientAmounts.push({text:`${qty} g de ${anchor.name}`,adjustable:true,qty,unit:'g',name:anchor.name,nutrients:null,estimated:false,quantityEstimated:false});meal.k+=Math.round(anchor.k*qty);meal.p+=Math.round(anchor.p*qty);meal.c+=Math.round(anchor.c*qty);meal.f+=Math.round(anchor.f*qty);meal.nutritionBasis='recipe-declared-plus-explicit-balance';meal.macroAdjusted=false;});});
    if(within(sum(work)))return work;
  }
  return items;
}
function fixedBreakfastCake(){
  // Values copied from the pinned USDA extract in data/usda-breakfast-source.json.
  const composition=[{"foodId":"173904","name":"avena","state":"seca","unit":"g","qty":60,"per100":{"f":6.52,"c":67.7,"k":379,"p":13.2},"source":{"id":"173904","name":"USDA FoodData Central / SR Legacy","url":"https://fdc.nal.usda.gov/food-details/173904/nutrients","accessedAt":"2026-08-28"}},{"foodId":"171287","name":"huevo sin cáscara","state":"crudo","unit":"g","qty":60,"per100":{"k":143,"p":12.6,"f":9.51,"c":0.72},"source":{"id":"171287","name":"USDA FoodData Central / SR Legacy","url":"https://fdc.nal.usda.gov/food-details/171287/nutrients","accessedAt":"2026-08-28"}},{"foodId":"172183","name":"claras de huevo","state":"crudas","unit":"g","qty":150,"per100":{"p":10.9,"f":0.17,"k":52,"c":0.73},"source":{"id":"172183","name":"USDA FoodData Central / SR Legacy","url":"https://fdc.nal.usda.gov/food-details/172183/nutrients","accessedAt":"2026-08-28"}},{"foodId":"172804","name":"impulsor químico de doble acción (fosfato)","state":"seco","unit":"g","qty":5,"per100":{"f":0,"c":24.1,"k":51,"p":0.1},"source":{"id":"172804","name":"USDA FoodData Central / SR Legacy","url":"https://fdc.nal.usda.gov/food-details/172804/nutrients","accessedAt":"2026-08-28"}},{"foodId":"170554","name":"semillas de chía","state":"secas","unit":"g","qty":10,"per100":{"p":16.5,"f":30.7,"c":42.1,"k":486},"source":{"id":"170554","name":"USDA FoodData Central / SR Legacy","url":"https://fdc.nal.usda.gov/food-details/170554/nutrients","accessedAt":"2026-08-28"}}];
  const ingredientAmounts=compositionAmounts(composition,1).map(row=>({...row,adjustable:false}));
  const macros=compositionTotals(ingredientAmounts);
  const recipe={id:'fixed-breakfast-cake',n:'Bizcocho proteico de avena, huevo, claras y chía',m:'Desayuno',composition,...macros,i:ingredientAmounts.map(row=>row.text),s:[
    'Pesa los ingredientes antes de cocinar según la lista; el peso del huevo es sin cáscara. Usa un molde pequeño con papel de horno, sin añadir aceite.',
    'Precalienta el horno a 180 °C. Tritura la avena si prefieres una textura fina.',
    'Bate el huevo y las claras en un bol. Incorpora la avena, la chía y el impulsor; mezcla hasta eliminar los grumos.',
    'Vierte la masa en el molde. Hornea aproximadamente 20–25 minutos y comprueba el centro con un termómetro: debe alcanzar al menos 71 °C. Si no llega, continúa horneando y vuelve a comprobar.',
    'Deja templar unos minutos, desmolda y sirve la ración completa. El tiempo depende del molde y del horno; el peso final cocinado no sustituye a los pesos iniciales del cálculo.'
  ]};
  return {recipe,slot:'07:30 · Desayuno',scale:1,...macros,ingredientAmounts,nutritionBasis:'ingredient-composition',ingredientNutritionVerified:false};
}
function fixedMorningItem(kind){if(kind==='shake')return{recipe:{id:'fixed-post-workout-shake',n:'Batido de proteína postentreno con agua',m:'Postentreno',k:117,p:23.4,c:2.4,f:1.8,i:['30 g de proteína whey','Agua al gusto'],s:['Añade la proteína y el agua a un vaso mezclador.','Agita durante 20-30 segundos hasta que no queden grumos.','Tómalo después de entrenar y registra la toma en el diario.']},slot:'07:00 · Postentreno',scale:1,k:117,p:23,c:2,f:2,ingredientAmounts:[{text:'30 g de proteína whey',adjustable:false,qty:30,unit:'g',name:'proteína whey',estimated:false,quantityEstimated:false},{text:'Agua al gusto',adjustable:false,qty:0,unit:'ml',name:'agua',estimated:false,quantityEstimated:false}],nutritionBasis:'recipe-declared',ingredientNutritionVerified:false};return fixedBreakfastCake();}
function generateDays(recipes,input){
  const prefs=validatePreferences(input),pool=allowedRecipes(recipes.map(withComposition),prefs);
  if(pool.length<4)throw new Error('Las restricciones dejan muy pocas recetas. Revisa las exclusiones.');
  if(!prefs.includeBreakfastCake&&!prefs.includePostWorkoutShake){
    const usage=new Map(),reference=buildDay(pool,prefs,new Map(),0,{}, {primary:120,secondary:160}),days=[reference],slots=slotsFor(prefs.meals);
    for(let day=1;day<prefs.days;day++){let built=buildDay(pool,prefs,usage,day,{}, {primary:24,secondary:24});if(!withinTargets(built.totals,prefs)||!sameMacroBand(built.totals,reference.totals)){const items=optimizeIngredients(reference.items.map(x=>x.recipe),prefs,slots),t=totals(items);built={day:day+1,items,totals:t,error:macroError(t,prefs),withinTarget:withinTargets(t,prefs),fallback:true};}days.push(built);}
    return {createdAt:new Date().toISOString(),preferences:prefs,days};
  }
  const usage=new Map(),days=[];
  for(let day=0;day<prefs.days;day++){
    const trainingDay=day%7<prefs.trainingDays,fixed=[];
    if(trainingDay&&prefs.includePostWorkoutShake)fixed.push(fixedMorningItem('shake'));
    if(prefs.includeBreakfastCake)fixed.push(fixedMorningItem('cake'));
    const fixedTotals=totals(fixed),remainingMeals=Math.max(1,prefs.meals-(prefs.includeBreakfastCake?1:0));
    const remaining={...prefs,days:1,meals:remainingMeals,_slots:prefs.includeBreakfastCake?remainingSlotsAfterBreakfast(remainingMeals):slotsFor(remainingMeals),kcal:Math.max(remainingMeals*120,prefs.kcal-fixedTotals.k),protein:Math.max(remainingMeals*10,prefs.protein-fixedTotals.p),carbs:Math.max(0,prefs.carbs-fixedTotals.c),fat:Math.max(0,prefs.fat-fixedTotals.f)};
    const buildTargets={...remaining,carbs:Math.max(50,remaining.carbs),fat:Math.max(30,remaining.fat)};
    let items,dayTotals,withinTarget;
    // A small change in a fixed meal can invalidate a formerly good recipe
    // combination. Search other combinations without rewriting their nutrients.
    for(let attempt=0;attempt<8;attempt++){
      const accept=variable=>{
        const proposed=[...fixed,...reconcileRemainingItems(variable,remaining)],t=totals(proposed);
        const cap=({3:.45,4:.40,5:.36,6:.34,7:.32})[proposed.length]||.40;
        return withinTargets(t,prefs,{k:.03,p:.05,c:.06,f:.08})&&proposed.every(item=>item.k/Math.max(1,t.k)<=cap+.005);
      };
      const built=buildDay(pool,buildTargets,attempt?new Map(usage):usage,day+attempt*31,{}, {primary:96,secondary:96,accept});
      items=[...fixed,...reconcileRemainingItems(built.items,remaining)];
      dayTotals=totals(items);
      withinTarget=withinTargets(dayTotals,prefs,{k:.03,p:.05,c:.06,f:.08});
      const cap=({3:.45,4:.40,5:.36,6:.34,7:.32})[items.length]||.40;
      if(withinTarget&&items.every(item=>item.k/Math.max(1,dayTotals.k)<=cap+.005))break;
    }
    days.push({day:day+1,trainingDay,trainingTime:trainingDay?prefs.trainingTime:null,items,totals:dayTotals,error:macroError(dayTotals,prefs),withinTarget,macroAdjusted:false});
  }
  return {createdAt:new Date().toISOString(),preferences:prefs,days};
}
const generate30Days=(recipes,input)=>generateDays(recipes,{...input,days:30});
function swapMeal(plan,recipes,dayIndex,itemIndex){if(!plan?.days?.[dayIndex])throw new Error('Día no válido.');const prefs=validatePreferences({...plan.preferences,days:plan.days.length}),pool=allowedRecipes(recipes.map(withComposition),prefs),day=plan.days[dayIndex],old=day.items[itemIndex];if(/^fixed-/.test(String(old?.recipe?.id||'')))throw new Error('Esta toma está fijada en tu perfil. Edita su configuración para cambiarla.');const fixed=day.items.filter(item=>/^fixed-/.test(String(item?.recipe?.id||''))),variable=day.items.filter(item=>!/^fixed-/.test(String(item?.recipe?.id||''))),variableIndex=variable.indexOf(old),remainingMeals=variable.length,remainingSlots=fixed.length?remainingSlotsAfterBreakfast(remainingMeals):slotsFor(remainingMeals),fixedTotals=totals(fixed),target=fixed.length?{...prefs,meals:remainingMeals,_slots:remainingSlots,kcal:prefs.kcal-fixedTotals.k,protein:prefs.protein-fixedTotals.p,carbs:prefs.carbs-fixedTotals.c,fat:prefs.fat-fixedTotals.f}:prefs;let candidates=pool.filter(r=>slotAliases(old.slot).includes(r.m)&&r.n!==old.recipe.n);if(!candidates.length)candidates=pool.filter(r=>r.n!==old.recipe.n);if(!candidates.length)throw new Error('No hay una alternativa equivalente disponible.');const ranked=candidates.map(r=>{const s=clamp(old.k/Math.max(1,r.k),.2,5),e=Math.abs(r.p*s-old.p)/Math.max(10,old.p)+Math.abs(r.c*s-old.c)/Math.max(15,old.c)+Math.abs(r.f*s-old.f)/Math.max(6,old.f);return {r,e};}).sort((a,b)=>a.e-b.e).slice(0,48);let best=null;ranked.forEach(({r})=>{const chosen=variable.map((x,i)=>i===variableIndex?r:x.recipe),optimized=optimizeIngredients(chosen,target,remainingSlots),variableItems=fixed.length?reconcileRemainingItems(optimized,target):optimized,items=[...fixed,...variableItems],t=totals(items),err=macroError(t,prefs),cap=items.length>=5?.38:.40,maxShare=Math.max(...items.map(item=>item.k/Math.max(1,t.k)));if(fixed.length&&(maxShare>cap+.005||!withinTargets(t,prefs,{k:.03,p:.05,c:.06,f:.08})))return;if(!best||err<best.err)best={items,t,err};});if(!best)throw new Error('No se encontró una alternativa que conserve tus macros y un reparto seguro. Prueba otra comida o ajusta el objetivo.');plan.days[dayIndex]={...day,items:best.items,totals:best.t,error:best.err,withinTarget:withinTargets(best.t,prefs,{k:.03,p:.05,c:.06,f:.08}),macroAdjusted:false};return plan;}
function legacyScaleIngredient(raw,scale){return formatIngredient(parseIngredient(raw),scale);}
function ingredientsFor(item){if(Array.isArray(item?.ingredientAmounts)&&item.ingredientAmounts.length)return item.ingredientAmounts.map(x=>x.text);return (item?.recipe?.i||[]).map(raw=>legacyScaleIngredient(raw,item?.scale||1));}
function ingredientDetailsFor(item){if(Array.isArray(item?.ingredientAmounts)&&item.ingredientAmounts.length)return item.ingredientAmounts.map(ingredient=>({text:ingredient.text,nutrients:ingredient.nutrients||null,estimated:Boolean(ingredient.estimated),quantityEstimated:Boolean(ingredient.quantityEstimated)}));return ingredientsFor(item).map(text=>({text,nutrients:null,estimated:true,quantityEstimated:true}));}
function shoppingByWeek(plan,week=0){const start=week*7,end=Math.min(start+7,plan?.days?.length||0),map=new Map();(plan?.days||[]).slice(start,end).flatMap(d=>d.items).forEach(item=>ingredientsFor(item).forEach(raw=>{const text=String(raw||'').trim(),m=text.match(/^\s*(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|ud|uds|unidad(?:es)?)\b\s*(?:de\s+)?(.*)$/i);if(m){let qty=Number(m[1].replace(',','.')),unit=m[2].toLowerCase(),ingredientName=m[3].trim()||text;if(unit==='kg'){qty*=1000;unit='g'}else if(unit==='l'){qty*=1000;unit='ml'}else if(/^(uds|unidad|unidades)$/.test(unit))unit='ud';const key=norm(ingredientName)+'|'+unit;if(!map.has(key))map.set(key,{ingredientName,unit,totalQty:0,count:0});const entry=map.get(key);entry.totalQty+=qty;entry.count+=1;}else{const key=norm(text);if(!map.has(key))map.set(key,{name:text,count:0,totalQty:null,unit:null});map.get(key).count+=1;}}));return [...map.values()].map(entry=>{if(entry.totalQty===null||entry.totalQty===undefined)return entry;const totalQty=Number(entry.totalQty.toFixed(3)),shown=Number.isInteger(totalQty)?totalQty:String(totalQty).replace('.',',');return {...entry,totalQty,name:`${shown} ${entry.unit}${entry.ingredientName?' de '+entry.ingredientName:''}`};}).sort((a,b)=>a.name.localeCompare(b.name,'es'));}
globalThis.RecompMealPlanner={macroTargets,validatePreferences,normalizeRecipeCatalog,allowedRecipes,generateDays,generate30Days,swapMeal,ingredientsFor,ingredientDetailsFor,shoppingByWeek,totals,recipeModel,portionFromComposition,practicalQty,macroDeviation,withinTargets,defaultSteps};
})();
