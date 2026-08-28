(() => {
  'use strict';
  const key='recomp10.mealPlan30',manualKey='recomp10.manualTargets';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let plan=null,visibleWeek=0;
  const recipeSource=()=>RecompMealPlanner.normalizeRecipeCatalog(
    typeof ALL_RECIPES!=='undefined'&&Array.isArray(ALL_RECIPES)?ALL_RECIPES:
      (typeof recipes!=='undefined'?recipes:(globalThis.recipes||[]))
  );
  const savedTargets=()=>{try{return JSON.parse(localStorage.getItem('targets')||'null')||{}}catch{return {}}};
  const savedManualTargets=()=>{try{return JSON.parse(localStorage.getItem(manualKey)||'null')}catch{return null}};
  const sourceKey=(day,item)=>'mealPlan:'+String(plan?.createdAt||'unknown')+':'+day+':'+item;
  const loggedToday=source=>{try{return (JSON.parse(localStorage.getItem('meals')||'[]')||[]).some(meal=>meal?.date===RecompDate.localDayKey()&&meal?.sourceKey===source)}catch{return false}};

  function installProfessionalMobile(){
    if(document.getElementById('recompProfessionalMobile'))return;
    const style=document.createElement('style');style.id='recompProfessionalMobile';style.textContent=`
      html,body{width:100%;max-width:100%;overflow-x:hidden;-webkit-text-size-adjust:100%}
      main,.section,.hero,.card,.row,.grid,.mp-day,.mp-meal,.mp-recipe-link,#mealPlanner30,#mpResult{min-width:0;max-width:100%}
      img,canvas,svg{max-width:100%}button,input,select,textarea{min-width:0;max-width:100%}
      .navicon{height:22px;display:grid;place-items:center;margin:0 auto 3px;font-size:0}.navicon svg{width:21px;height:21px;display:block;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
      @media(max-width:600px){
        main{width:100%;padding:14px 12px calc(112px + env(safe-area-inset-bottom))}
        .hero{padding:20px;border-radius:24px}.hero h1{font-size:32px;line-height:1.04}
        .row{flex-wrap:wrap}.row>*{flex:1 1 min(100%,240px);min-width:0}
        .grid{grid-template-columns:repeat(2,minmax(0,1fr))}.card{min-width:0}
        .mp-day{width:100%}.mp-day summary{gap:10px;align-items:flex-start;min-width:0}.mp-day summary span:first-child{min-width:0;flex:1}
        .mp-meal{display:grid;grid-template-columns:minmax(0,1fr) 46px 46px;gap:8px;align-items:center;padding:12px;min-width:0}
        .mp-meal>div,.mp-recipe-link{min-width:0;width:100%;max-width:100%}.mp-recipe-link{padding:8px 4px;overflow-wrap:normal;word-break:normal;white-space:normal}
        .mp-recipe-link small,.mp-recipe-link b,.mp-recipe-link span{display:block;max-width:100%;overflow-wrap:normal;word-break:normal;white-space:normal}
        .mp-meal button:not(.mp-recipe-link){width:46px;min-width:46px;max-width:46px;height:46px;min-height:46px;padding:0;display:grid;place-items:center}
        .setrow{grid-template-columns:32px repeat(3,minmax(0,1fr));gap:6px}.setrow input{padding:10px 8px}
        nav{grid-template-columns:repeat(6,minmax(0,1fr));padding:7px max(4px,env(safe-area-inset-right)) calc(7px + env(safe-area-inset-bottom)) max(4px,env(safe-area-inset-left));gap:2px}
        nav button{min-width:0;padding:7px 1px;font-size:9px;line-height:1.15;overflow:hidden;text-overflow:ellipsis}
        .mp-tabs{max-width:100%;overscroll-behavior-inline:contain}.mp-form .row button{min-height:46px}
      }
      @media(max-width:360px){main{padding-left:10px;padding-right:10px}.mp-meal{grid-template-columns:minmax(0,1fr) 44px 44px;padding:10px;gap:6px}.mp-meal button:not(.mp-recipe-link){width:44px;min-width:44px;max-width:44px;height:44px}.hero h1{font-size:29px}}
    `;document.head.appendChild(style);
  }
  function upgradeNavIcons(){
    const icons=[
      '<svg viewBox="0 0 24 24"><path d="m3 11 9-7 9 7v9H6v-9"/><path d="M10 20v-6h4v6"/></svg>',
      '<svg viewBox="0 0 24 24"><path d="M4 15h3l2-6 3 10 3-8 2 4h3"/><path d="M4 5v14M20 5v14"/></svg>',
      '<svg viewBox="0 0 24 24"><path d="M5 19c0-7 3-12 7-14 4 2 7 7 7 14"/><path d="M8 11h8M7 15h10"/></svg>',
      '<svg viewBox="0 0 24 24"><path d="M5 5h14v14H5z"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>',
      '<svg viewBox="0 0 24 24"><path d="M4 19V5M4 19h16"/><path d="m7 15 4-4 3 2 5-6"/></svg>',
      '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9 7 7m10 10 2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/></svg>'
    ];document.querySelectorAll('nav .navicon').forEach((el,i)=>{if(icons[i])el.innerHTML=icons[i]});
  }

  function ensureLegalLinks(){
    if($('recompLegalLinks')||!document.body)return;
    const footer=document.createElement('footer');footer.id='recompLegalLinks';footer.setAttribute('aria-label','Información legal y soporte');
    footer.style.cssText='padding:18px 16px 90px;text-align:center;font-size:13px;opacity:.82';
    footer.innerHTML='<a href="./privacy.html">Privacidad</a> · <a href="./support.html">Soporte</a>';
    document.body.appendChild(footer);
  }
  function moveIntoNutrition(){
    const nutrition=$('nutricion'),root=$('mealPlanner30');
    if(!nutrition||!root)return;
    let heading=$('mealPlannerHeading');
    if(!heading){heading=document.createElement('h2');heading.id='mealPlannerHeading';heading.textContent='Generador de menús';}
    const macroResult=$('macroResult');
    if(macroResult){macroResult.insertAdjacentElement('afterend',heading);heading.insertAdjacentElement('afterend',root)}
    const oldButton=[...nutrition.querySelectorAll('button')].find(b=>/Crear menú de 30 días/i.test(b.textContent||''));if(oldButton)oldButton.style.display='none';
  }
  function logMeal(day,item){
    const meal=plan?.days?.[day]?.items?.[item];if(!meal)return;const source=sourceKey(day,item);if(loggedToday(source))return;
    document.dispatchEvent(new CustomEvent('recomp:log-planned-meal',{detail:{item:meal,sourceKey:source}}));
  }
  function save(){localStorage.setItem(key,JSON.stringify(plan));}
  function macroForm(){return {kcal:$('mpKcal')?.value,protein:$('mpProtein')?.value,carbs:$('mpCarbs')?.value,fat:$('mpFat')?.value}}
  function persistManualTargets(notify=false){const t=RecompMealPlanner.macroTargets(macroForm());localStorage.setItem(manualKey,JSON.stringify(t));if(notify&&$('mpStatus'))$('mpStatus').innerHTML='<div class="good"><b>Objetivos manuales guardados.</b> El próximo menú usará '+t.kcal+' kcal · P '+t.protein+' g · C '+t.carbs+' g · G '+t.fat+' g.</div>';return t}
  function formValues(){return {
    ...macroForm(),days:$('mpDays').value,meals:$('mpMeals').value,diet:$('mpDiet').value,excluded:$('mpExcluded').value,
    pantry:$('mpPantry').value,maxTime:$('mpTime').value,budget:$('mpBudget').value,variety:$('mpVariety').value,
    trainingDays:$('mpTrainingDays')?.value||4,trainingTime:$('mpTrainingTime')?.value||'06:00',includeBreakfastCake:$('mpCake')?.checked!==false,includePostWorkoutShake:$('mpShake')?.checked!==false
  }}
  function applyMacroTargets(input=savedTargets(),notify=false){
    const t=RecompMealPlanner.macroTargets(input);
    [['mpKcal','kcal'],['mpProtein','protein'],['mpCarbs','carbs'],['mpFat','fat']].forEach(([id,k])=>{if($(id))$(id).value=t[k]});
    if(notify&&$('mpStatus'))$('mpStatus').innerHTML='<div class="good">Macros sincronizados desde la calculadora: '+t.kcal+' kcal · P '+t.protein+' g · C '+t.carbs+' g · G '+t.fat+' g.</div>';
    return t;
  }
  function useCalculatorTargets(){localStorage.removeItem(manualKey);applyMacroTargets(savedTargets(),true)}
  function calculatePlannerTargets(){
    const status=$('mpStatus');
    try{
      const calculate=globalThis.calculateTargets;
      if(typeof calculate!=='function')throw new Error('La calculadora todavía no está disponible.');
      const t=calculate({
        sex:$('mpCalcSex').value,
        age:$('mpCalcAge').value,
        height:$('mpCalcHeight').value,
        weight:$('mpCalcWeight').value,
        activity:$('mpCalcActivity').value,
        goal:$('mpCalcGoal').value
      });
      const targets={kcal:t.kcal,protein:t.protein,carbs:t.carbs,fat:t.fat};
      localStorage.setItem('targets',JSON.stringify(targets));
      localStorage.removeItem(manualKey);
      applyMacroTargets(targets,false);
      document.dispatchEvent(new CustomEvent('recomp:targets-updated',{detail:targets}));
      status.innerHTML='<div class="good"><b>Objetivos calculados y listos para generar.</b> '+targets.kcal+' kcal · P '+targets.protein+' g · C '+targets.carbs+' g · G '+targets.fat+' g.</div>';
    }catch(error){status.innerHTML='<div class="notice"><b>No se pudieron calcular los objetivos.</b><br>'+esc(error.message)+'</div>'}
  }
  function generate(){
    const button=$('mpGenerate');
    try{
      if(button){button.disabled=true;button.textContent='Calculando menú…'}
      persistManualTargets(false);
      const catalog=recipeSource();if(!catalog.length)throw new Error('La biblioteca de recetas todavía no está lista.');
      plan=RecompMealPlanner.generateDays(catalog,formValues());visibleWeek=0;save();render();$('mpResult').scrollIntoView({behavior:'smooth',block:'start'});
    }catch(e){$('mpStatus').innerHTML='<div class="notice"><b>No se pudo crear el menú.</b><br>'+esc(e.message)+'</div>'}
    finally{if(button){button.disabled=false;button.textContent='Generar menú'}}
  }
  function swap(day,item){try{plan=RecompMealPlanner.swapMeal(plan,recipeSource(),day,item);save();render();showRecipe(day,item)}catch(e){alert(e.message)}}
  function showRecipe(day,item){
    const meal=plan?.days?.[day]?.items?.[item];if(!meal)return;
    const ingredients=RecompMealPlanner.ingredientDetailsFor(meal).map(ingredient=>{
      const estimated=ingredient.quantityEstimated===true;
      return '<li><b>'+esc(ingredient.text)+'</b>'+(estimated?'<small> · cantidad estimada/no verificada</small>':'')+(ingredient.nutrients?'<small> · '+Math.round(ingredient.nutrients.k)+' kcal · P '+ingredient.nutrients.p.toFixed(1)+' · C '+ingredient.nutrients.c.toFixed(1)+' · G '+ingredient.nutrients.f.toFixed(1)+'</small>':'')+'</li>';
    }).join('');
    const matched=recipeSource().find(r=>r.id===meal.recipe.id||r.n===meal.recipe.n);
    const steps=(meal.recipe.s?.length?meal.recipe.s:(matched?.s||[])).map(value=>'<li>'+esc(value)+'</li>').join('');
    const preparation=steps?'<h3>Cómo prepararla</h3><ol>'+steps+'</ol>':'<div class="notice">Esta receta no tiene todavía pasos de elaboración en la biblioteca. Cámbiala por otra receta completa.</div>';
    const meta=[meal.recipe.time&&meal.recipe.time+' min',meal.recipe.difficulty].filter(Boolean).map(esc).join(' · '),logged=loggedToday(sourceKey(day,item));
    const calculated=meal.nutritionBasis==='ingredient-composition';
    const verified=meal.ingredientNutritionVerified===true;
    const nutritionNote=calculated?'<div class="good">Macros calculados por ingredientes con las cantidades mostradas. Datos de composición declarados por la fuente, no una medición de esta ración.</div>':verified?'<div class="good">Macros verificados ingrediente a ingrediente para las cantidades mostradas.</div>':'<div class="notice"><b>Macros de receta, no verificados ingrediente a ingrediente.</b> Los totales se escalan desde la ficha nutricional declarada de la receta. Las cantidades sirven para preparar y ajustar la porción, pero no certifican todavía una suma nutricional reconstruida alimento por alimento.</div>';
    const ingredientHeading=calculated?'Ingredientes y aporte calculado':verified?'Ingredientes y aporte nutricional':'Ingredientes';
    const ingredientNote=calculated?'<p class="small">Se suman los aportes mostrados; el total de la comida se redondea a enteros. No se convierten pesos crudos/cocinados ni gramos/mililitros.</p>':verified?'<p class="small">El aporte mostrado para cada ingrediente forma parte del cálculo verificado de esta ración.</p>':'<p class="small">No se muestra un reparto de macros por ingrediente porque la biblioteca aún no dispone de composición nutricional verificable para todos ellos. Las cantidades marcadas como estimadas/no verificadas han sido inferidas para poder escalar la receta y no proceden de una cantidad original certificada. Evitamos atribuir nutrientes estimados como si fueran exactos.</p>';
    $('mpRecipeDetail').innerHTML='<div class="card mp-recipe-detail"><button class="secondary mp-recipe-close">Cerrar</button><span class="pill">'+esc(meal.slot||meal.recipe.m)+'</span><h2>'+esc(meal.recipe.n)+'</h2><div class="kcal">'+meal.k+' kcal</div><p class="small">P '+meal.p+' g · C '+meal.c+' g · G '+meal.f+' g'+(meta?' · '+meta:'')+'</p>'+nutritionNote+'<button class="mp-log-detail '+(logged?'secondary':'')+'" '+(logged?'disabled':'')+'>'+(logged?'✓ Registrada hoy':'Añadir al diario de hoy')+'</button><h3>'+ingredientHeading+'</h3><ul>'+ingredients+'</ul>'+ingredientNote+preparation+'</div>';
    $('mpRecipeDetail').querySelector('.mp-recipe-close').onclick=()=>{$('mpRecipeDetail').innerHTML=''};
    const logButton=$('mpRecipeDetail').querySelector('.mp-log-detail');if(!logged)logButton.onclick=()=>logMeal(day,item);
    $('mpRecipeDetail').scrollIntoView({behavior:'smooth',block:'start'});
  }
  function render(){
    if(!plan){$('mpResult').innerHTML='<div class="empty">Calcula o ajusta tus macros, elige cuántos días quieres y genera el menú.</div>';return}
    const totalDays=plan.days.length,weeks=Math.ceil(totalDays/7),start=visibleWeek*7,end=Math.min(start+7,totalDays);
    if(visibleWeek>=weeks)visibleWeek=Math.max(0,weeks-1);
    const tabs=Array.from({length:weeks},(_,i)=>'<button class="'+(i===visibleWeek?'active':'')+'" data-week="'+i+'">S'+(i+1)+'</button>').join('');
    const target=plan.preferences;
    const days=plan.days.slice(start,end).map((d,di)=>'<details class="mp-day" '+(di===0?'open':'')+'><summary><span><b>Día '+d.day+' · '+(d.withinTarget?'✓ dentro de tolerancia':'⚠ revisar')+'</b><small>'+d.totals.k+' kcal · P '+d.totals.p+' · C '+d.totals.c+' · G '+d.totals.f+'</small></span><span>›</span></summary>'+d.items.map((x,ii)=>{const day=start+di,logged=loggedToday(sourceKey(day,ii)),fixed=/^fixed-/.test(String(x.recipe?.id||''));return '<div class="mp-meal"><button class="mp-recipe-link" data-recipe="'+day+','+ii+'"><small>'+esc(x.slot)+'</small><b>'+esc(x.recipe.n)+'</b><span>'+x.k+' kcal · P '+x.p+' · C '+x.c+' · G '+x.f+' · Ver receta</span></button><button class="secondary mp-log" data-log="'+day+','+ii+'" '+(logged?'disabled':'')+' aria-label="'+(logged?'Comida registrada':'Registrar comida')+'">'+(logged?'✓':'+')+'</button>'+(fixed?'':'<button class="secondary" data-swap="'+day+','+ii+'" aria-label="Cambiar receta">↻</button>')+'</div>'}).join('')+(d.withinTarget?'':'<div class="notice"><b>Este día necesita ajuste.</b> No se han sustituido los macros calculados por cifras objetivo.</div>')+'</details>').join('');
    const shop=RecompMealPlanner.shoppingByWeek(plan,visibleWeek).map(x=>{const quantity=x.amount!=null&&x.unit?x.amount+' '+x.unit:'×'+x.count;return '<label class="mp-check"><input type="checkbox"> <span>'+esc(x.name)+'</span><small>'+esc(quantity)+'</small></label>'}).join('');
    const reviewCount=plan.days.filter(day=>!day.withinTarget).length;
    $('mpStatus').innerHTML='<div class="'+(reviewCount?'notice':'good')+'"><b>'+totalDays+' días · objetivos usados:</b> '+target.kcal+' kcal · P '+target.protein+' g · C '+target.carbs+' g · G '+target.fat+' g. Tolerancia visible: kcal ±3%, proteína ±5%, carbohidratos ±6% y grasa ±8%. '+(reviewCount?reviewCount+' día(s) necesitan revisión antes de utilizarse.':'Todos los días están dentro de tolerancia y conservan los macros calculados de sus recetas.')+'</div>';
    $('mpResult').innerHTML='<div class="mp-tabs">'+tabs+'</div>'+days+'<div class="card mp-shop"><h3>Compra · semana '+(visibleWeek+1)+'</h3>'+shop+'</div>';
    document.querySelectorAll('[data-recipe]').forEach(b=>b.onclick=()=>{const [d,i]=b.dataset.recipe.split(',').map(Number);showRecipe(d,i)});
    document.querySelectorAll('[data-week]').forEach(b=>b.onclick=()=>{visibleWeek=+b.dataset.week;render()});
    document.querySelectorAll('[data-swap]').forEach(b=>b.onclick=()=>{const [d,i]=b.dataset.swap.split(',').map(Number);swap(d,i)});
    document.querySelectorAll('[data-log]').forEach(b=>b.onclick=()=>{const [d,i]=b.dataset.log.split(',').map(Number);logMeal(d,i)});
  }
  function init(){
    installProfessionalMobile();upgradeNavIcons();ensureLegalLinks();moveIntoNutrition();const root=$('mealPlanner30');if(!root)return;const manual=savedManualTargets(),t=RecompMealPlanner.macroTargets(manual||savedTargets());
    const profile=(()=>{try{return JSON.parse(localStorage.getItem('recomp_unified_profile_v2')||'{}')}catch{return {}}})();
    root.innerHTML='<div class="mp-intro"><span class="pill">NUTRICIÓN</span><h2>Calcula tus macros y genera el menú</h2><p>Un único flujo: calcula kcal, proteína, carbohidratos y grasas; revisa los cuatro objetivos y genera de 1 a 30 días sin cambiar de pantalla.</p></div><div class="card mp-form" id="mpMacroCalculator"><h3>1 · Calculadora de kcal y macros</h3><div class="row"><div><label>Sexo</label><select id="mpCalcSex"><option value="m">Hombre</option><option value="f">Mujer</option></select></div><div><label>Edad</label><input id="mpCalcAge" type="number" min="13" max="100" value="'+esc(profile.age||40)+'"></div></div><div class="row"><div><label>Peso (kg)</label><input id="mpCalcWeight" type="number" min="30" max="300" step="0.1" value="'+esc(profile.weight||75)+'"></div><div><label>Altura (cm)</label><input id="mpCalcHeight" type="number" min="120" max="230" value="'+esc(profile.height||175)+'"></div></div><label>Actividad</label><select id="mpCalcActivity"><option value="1.2">Sedentario</option><option value="1.375">Ligera</option><option value="1.55" selected>3-5 entrenos</option><option value="1.725">Alta</option></select><label>Objetivo</label><select id="mpCalcGoal"><option value="-0.15">Pérdida de grasa</option><option value="0">Mantenimiento</option><option value="0.08" selected>Ganancia muscular</option></select><button id="mpCalculateTargets" style="width:100%;margin-top:10px">Calcular kcal y macros</button></div><div class="card mp-form"><h3>2 · Objetivos diarios editables</h3><div class="good">Estas cuatro cifras son exactamente las que utilizará el generador. Puedes revisarlas o ajustarlas antes de crear el menú.</div><div class="row"><div><label>Calorías</label><input id="mpKcal" type="number" value="'+esc(t.kcal)+'"></div><div><label>Proteína (g)</label><input id="mpProtein" type="number" value="'+esc(t.protein)+'"></div></div><div class="row"><div><label>Carbohidratos (g)</label><input id="mpCarbs" type="number" value="'+esc(t.carbs)+'"></div><div><label>Grasas (g)</label><input id="mpFat" type="number" value="'+esc(t.fat)+'"></div></div><div class="row"><button id="mpSaveTargets" class="secondary">Usar y guardar estos objetivos</button><button id="mpCalculatorTargets" class="secondary">Recuperar calculadora</button></div><div class="row"><div><label>Días</label><input id="mpDays" type="number" min="1" max="30" value="7"></div><div><label>Comidas / día</label><select id="mpMeals"><option>3</option><option selected>4</option><option>5</option></select></div></div><h3>3 · Preferencias</h3><label>Estilo</label><select id="mpDiet"><option value="flexible">Flexible</option><option value="vegetariana">Vegetariano</option><option value="vegana">Vegano</option><option value="pescetariana">Pescetariano</option><option value="sin-lactosa">Sin lactosa</option><option value="sin-gluten">Sin gluten</option></select><label>Alergias o alimentos excluidos</label><input id="mpExcluded" placeholder="Ej. cacahuete, marisco, cebolla"><label>Ingredientes que ya tienes o prefieres</label><input id="mpPantry" placeholder="Ej. arroz, huevos, pollo"><div class="row"><div><label>Tiempo máximo</label><select id="mpTime"><option value="15">15 min</option><option value="30" selected>30 min</option><option value="45">45 min</option><option value="60">60 min</option></select></div><div><label>Presupuesto</label><select id="mpBudget"><option value="bajo">Ajustado</option><option value="medio" selected>Medio</option><option value="alto">Flexible</option></select></div></div><label>Variedad</label><select id="mpVariety"><option value="alta" selected>Alta</option><option value="media">Media</option><option value="baja">Baja</option></select><button id="mpGenerate" style="width:100%;margin-top:14px">Generar menú</button></div><div id="mpRecipeDetail"></div><div id="mpStatus"></div><div id="mpResult"></div>';
    if(profile.sex==='f')$('mpCalcSex').value='f';
    const preferencesCard=$('mpGenerate').closest('.card');
    preferencesCard.querySelector('#mpGenerate').insertAdjacentHTML('beforebegin','<h3>3 · Entrenamiento y desayuno</h3><div class="row"><div><label>Días de entrenamiento / semana</label><input id="mpTrainingDays" type="number" min="0" max="7" value="4"></div><div><label>Hora habitual</label><input id="mpTrainingTime" type="time" value="06:00"></div></div><div class="mp-checks"><label class="mp-check"><input id="mpCake" type="checkbox" checked> <span>Bizcocho de avena, huevo, claras, levadura y chía</span></label><label class="mp-check"><input id="mpShake" type="checkbox" checked> <span>30 g de whey con agua después de entrenar</span></label></div>');
    $('mpCalculateTargets').onclick=calculatePlannerTargets;$('mpGenerate').onclick=generate;$('mpSaveTargets').onclick=()=>persistManualTargets(true);$('mpCalculatorTargets').onclick=useCalculatorTargets;
    ['mpKcal','mpProtein','mpCarbs','mpFat'].forEach(id=>$(id).addEventListener('change',()=>persistManualTargets(false)));
    document.addEventListener('recomp:targets-updated',event=>{localStorage.removeItem(manualKey);applyMacroTargets(event.detail,true)});document.addEventListener('recomp:planned-meal-logged',()=>render());document.addEventListener('recomp:meal-log-changed',render);window.addEventListener('pageshow',()=>applyMacroTargets(savedManualTargets()||savedTargets()));
    try{plan=JSON.parse(localStorage.getItem(key)||'null')}catch{plan=null}render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
