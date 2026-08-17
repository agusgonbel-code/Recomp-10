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
    pantry:$('mpPantry').value,maxTime:$('mpTime').value,budget:$('mpBudget').value,variety:$('mpVariety').value
  }}
  function applyMacroTargets(input=savedTargets(),notify=false){
    const t=RecompMealPlanner.macroTargets(input);
    [['mpKcal','kcal'],['mpProtein','protein'],['mpCarbs','carbs'],['mpFat','fat']].forEach(([id,k])=>{if($(id))$(id).value=t[k]});
    if(notify&&$('mpStatus'))$('mpStatus').innerHTML='<div class="good">Macros sincronizados desde la calculadora: '+t.kcal+' kcal · P '+t.protein+' g · C '+t.carbs+' g · G '+t.fat+' g.</div>';
    return t;
  }
  function useCalculatorTargets(){localStorage.removeItem(manualKey);applyMacroTargets(savedTargets(),true)}
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
  function swap(day,item){try{RecompMealPlanner.swapMeal(plan,recipeSource(),day,item);save();render();showRecipe(day,item)}catch(e){alert(e.message)}}
  function showRecipe(day,item){
    const meal=plan?.days?.[day]?.items?.[item];if(!meal)return;
    const ingredients=RecompMealPlanner.ingredientsFor(meal).map(value=>'<li>'+esc(value)+'</li>').join('');
    const matched=recipeSource().find(r=>r.id===meal.recipe.id||r.n===meal.recipe.n);
    const steps=(meal.recipe.s?.length?meal.recipe.s:(matched?.s||[])).map(value=>'<li>'+esc(value)+'</li>').join('');
    const preparation=steps?'<h3>Cómo prepararla</h3><ol>'+steps+'</ol>':'<div class="notice">Esta receta no tiene todavía pasos de elaboración en la biblioteca. Cámbiala por otra receta completa.</div>';
    const meta=[meal.recipe.time&&meal.recipe.time+' min',meal.recipe.difficulty].filter(Boolean).map(esc).join(' · '),logged=loggedToday(sourceKey(day,item));
    $('mpRecipeDetail').innerHTML='<div class="card mp-recipe-detail"><button class="secondary mp-recipe-close">Cerrar</button><span class="pill">'+esc(meal.slot||meal.recipe.m)+'</span><h2>'+esc(meal.recipe.n)+'</h2><div class="kcal">'+meal.k+' kcal</div><p class="small">P '+meal.p+' g · C '+meal.c+' g · G '+meal.f+' g'+(meta?' · '+meta:'')+'</p><div class="good">Esta ración y todos sus ingredientes han sido escalados para encajar en los objetivos diarios.</div><button class="mp-log-detail '+(logged?'secondary':'')+'" '+(logged?'disabled':'')+'>'+(logged?'✓ Registrada hoy':'Añadir al diario de hoy')+'</button><h3>Ingredientes exactos</h3><ul>'+ingredients+'</ul>'+preparation+'</div>';
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
    const days=plan.days.slice(start,end).map((d,di)=>'<details class="mp-day" '+(di===0?'open':'')+'><summary><span><b>Día '+d.day+'</b><small>'+d.totals.k+' kcal · P '+d.totals.p+' · C '+d.totals.c+' · G '+d.totals.f+'</small></span><span>›</span></summary>'+d.items.map((x,ii)=>{const day=start+di,logged=loggedToday(sourceKey(day,ii));return '<div class="mp-meal"><button class="mp-recipe-link" data-recipe="'+day+','+ii+'"><small>'+esc(x.slot)+'</small><b>'+esc(x.recipe.n)+'</b><span>'+x.k+' kcal · P '+x.p+' · C '+x.c+' · G '+x.f+' · Ver receta</span></button><button class="secondary mp-log" data-log="'+day+','+ii+'" '+(logged?'disabled':'')+'>'+(logged?'✓':'+')+'</button><button class="secondary" data-swap="'+day+','+ii+'">↻</button></div>'}).join('')+'</details>').join('');
    const shop=RecompMealPlanner.shoppingByWeek(plan,visibleWeek).map(x=>'<label class="mp-check"><input type="checkbox"> <span>'+esc(x.name)+'</span><small>×'+x.count+'</small></label>').join('');
    $('mpStatus').innerHTML='<div class="good"><b>'+totalDays+' días · objetivos usados:</b> '+target.kcal+' kcal · P '+target.protein+' g · C '+target.carbs+' g · G '+target.fat+' g. Todos los días se mantienen en la misma banda nutricional; si una combinación variada no cuadra, se reutiliza una combinación válida antes que entregar macros incorrectos.</div>';
    $('mpResult').innerHTML='<div class="mp-tabs">'+tabs+'</div>'+days+'<div class="card mp-shop"><h3>Compra · semana '+(visibleWeek+1)+'</h3>'+shop+'</div>';
    document.querySelectorAll('[data-recipe]').forEach(b=>b.onclick=()=>{const [d,i]=b.dataset.recipe.split(',').map(Number);showRecipe(d,i)});
    document.querySelectorAll('[data-week]').forEach(b=>b.onclick=()=>{visibleWeek=+b.dataset.week;render()});
    document.querySelectorAll('[data-swap]').forEach(b=>b.onclick=()=>{const [d,i]=b.dataset.swap.split(',').map(Number);swap(d,i)});
    document.querySelectorAll('[data-log]').forEach(b=>b.onclick=()=>{const [d,i]=b.dataset.log.split(',').map(Number);logMeal(d,i)});
  }
  function init(){
    moveIntoNutrition();const root=$('mealPlanner30');if(!root)return;const manual=savedManualTargets(),t=RecompMealPlanner.macroTargets(manual||savedTargets());
    root.innerHTML='<div class="mp-intro"><span class="pill">NUTRICIÓN</span><h2>Menú ajustado a tus macros</h2><p>La calculadora propone unos objetivos, pero tú mandas: puedes editar los cuatro valores antes de generar y la app recordará tus ajustes.</p></div><div class="card mp-form"><h3>1 · Objetivos diarios editables</h3><div class="good">Puedes cambiar estos valores después de calcularlos. El menú se genera con lo que aparezca aquí, no con valores ocultos.</div><div class="row"><div><label>Calorías</label><input id="mpKcal" type="number" value="'+esc(t.kcal)+'"></div><div><label>Proteína (g)</label><input id="mpProtein" type="number" value="'+esc(t.protein)+'"></div></div><div class="row"><div><label>Carbohidratos (g)</label><input id="mpCarbs" type="number" value="'+esc(t.carbs)+'"></div><div><label>Grasas (g)</label><input id="mpFat" type="number" value="'+esc(t.fat)+'"></div></div><div class="row"><button id="mpSaveTargets" class="secondary">Usar y guardar estos objetivos</button><button id="mpCalculatorTargets" class="secondary">Recuperar calculadora</button></div><div class="row"><div><label>Días</label><input id="mpDays" type="number" min="1" max="30" value="7"></div><div><label>Comidas / día</label><select id="mpMeals"><option>3</option><option selected>4</option><option>5</option></select></div></div><h3>2 · Preferencias</h3><label>Estilo</label><select id="mpDiet"><option value="flexible">Flexible</option><option value="vegetariana">Vegetariano</option><option value="vegana">Vegano</option><option value="pescetariana">Pescetariano</option><option value="sin-lactosa">Sin lactosa</option><option value="sin-gluten">Sin gluten</option></select><label>Alergias o alimentos excluidos</label><input id="mpExcluded" placeholder="Ej. cacahuete, marisco, cebolla"><label>Ingredientes que ya tienes o prefieres</label><input id="mpPantry" placeholder="Ej. arroz, huevos, pollo"><div class="row"><div><label>Tiempo máximo</label><select id="mpTime"><option value="15">15 min</option><option value="30" selected>30 min</option><option value="45">45 min</option><option value="60">60 min</option></select></div><div><label>Presupuesto</label><select id="mpBudget"><option value="bajo">Ajustado</option><option value="medio" selected>Medio</option><option value="alto">Flexible</option></select></div></div><label>Variedad</label><select id="mpVariety"><option value="alta" selected>Alta</option><option value="media">Media</option><option value="baja">Baja</option></select><button id="mpGenerate" style="width:100%;margin-top:14px">Generar menú</button></div><div id="mpRecipeDetail"></div><div id="mpStatus"></div><div id="mpResult"></div>';
    $('mpGenerate').onclick=generate;$('mpSaveTargets').onclick=()=>persistManualTargets(true);$('mpCalculatorTargets').onclick=useCalculatorTargets;
    ['mpKcal','mpProtein','mpCarbs','mpFat'].forEach(id=>$(id).addEventListener('change',()=>persistManualTargets(false)));
    document.addEventListener('recomp:targets-updated',event=>{localStorage.removeItem(manualKey);applyMacroTargets(event.detail,true)});document.addEventListener('recomp:planned-meal-logged',()=>render());document.addEventListener('recomp:meal-log-changed',render);window.addEventListener('pageshow',()=>applyMacroTargets(savedManualTargets()||savedTargets()));
    try{plan=JSON.parse(localStorage.getItem(key)||'null')}catch{plan=null}render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();