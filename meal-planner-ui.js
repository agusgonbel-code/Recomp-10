(() => {
  'use strict';
  const key='recomp10.mealPlan30';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let plan=null,visibleWeek=0;
  const recipeSource=()=>typeof recipes!=='undefined'?recipes:(globalThis.recipes||[]);
  const savedTargets=()=>{try{return JSON.parse(localStorage.getItem('targets')||'null')||{}}catch{return {}}};
  function save(){plan=RecompPersistence.cleanMealPlan30(plan);localStorage.setItem(key,JSON.stringify(plan))}
  function formValues(){
    return {kcal:$('mpKcal').value,protein:$('mpProtein').value,meals:$('mpMeals').value,diet:$('mpDiet').value,
      excluded:$('mpExcluded').value,pantry:$('mpPantry').value,maxTime:$('mpTime').value,budget:$('mpBudget').value,variety:$('mpVariety').value};
  }
  function applyMacroTargets(input=savedTargets(),notify=false){
    const targets=RecompMealPlanner.macroTargets(input);
    if($('mpKcal'))$('mpKcal').value=targets.kcal;
    if($('mpProtein'))$('mpProtein').value=targets.protein;
    if(notify&&$('mpStatus'))$('mpStatus').innerHTML='<div class="good">Objetivos actualizados desde la calculadora: '+targets.kcal+' kcal · '+targets.protein+' g de proteína.</div>';
    return targets;
  }
  function generate(){
    try{plan=RecompMealPlanner.generate30Days(recipeSource(),formValues());visibleWeek=0;save();render();$('mpResult').scrollIntoView({behavior:'smooth',block:'start'})}
    catch(e){$('mpStatus').innerHTML='<div class="notice">'+esc(e.message)+'</div>'}
  }
  function swap(day,item){try{RecompMealPlanner.swapMeal(plan,recipeSource(),day,item);save();render()}catch(e){alert(e.message)}}
  function render(){
    if(!plan){$('mpResult').innerHTML='<div class="empty">Completa el formulario para crear tus 30 días.</div>';return}
    const start=visibleWeek*7,end=Math.min(start+7,30);
    const tabs=Array.from({length:5},(_,i)=>'<button class="'+(i===visibleWeek?'active':'')+'" data-week="'+i+'">S'+(i+1)+'</button>').join('');
    const days=plan.days.slice(start,end).map((d,di)=>'<details class="mp-day" '+(di===0?'open':'')+'><summary><span><b>Día '+d.day+'</b><small>'+d.totals.k+' kcal · P '+d.totals.p+' g</small></span><span>›</span></summary>'+
      d.items.map((x,ii)=>'<div class="mp-meal"><div><small>'+esc(x.slot)+'</small><b>'+esc(x.recipe.n)+'</b><span>'+x.k+' kcal · P '+x.p+' · '+x.scale.toFixed(2)+'×</span></div><button class="secondary" data-swap="'+(start+di)+','+ii+'" aria-label="Cambiar '+esc(x.slot)+'">↻</button></div>').join('')+'</details>').join('');
    const shop=RecompMealPlanner.shoppingByWeek(plan,visibleWeek).map(x=>'<label class="mp-check"><input type="checkbox"> <span>'+esc(x.name)+'</span><small>×'+x.count+'</small></label>').join('');
    $('mpStatus').innerHTML='<div class="good">Plan guardado en este dispositivo · '+plan.preferences.kcal+' kcal · '+plan.preferences.protein+' g proteína</div>';
    $('mpResult').innerHTML='<div class="mp-tabs">'+tabs+'</div>'+days+'<div class="card mp-shop"><h3>Compra · semana '+(visibleWeek+1)+'</h3><p class="small">Agrupada a partir de las recetas de esta semana.</p>'+shop+'</div>';
    document.querySelectorAll('[data-week]').forEach(b=>b.onclick=()=>{visibleWeek=+b.dataset.week;render()});
    document.querySelectorAll('[data-swap]').forEach(b=>b.onclick=()=>{const [d,i]=b.dataset.swap.split(',').map(Number);swap(d,i)});
  }
  function init(){
    const root=$('mealPlanner30'); if(!root)return;
    const targets=savedTargets();
    root.innerHTML='<div class="mp-intro"><span class="pill">30 DÍAS</span><h2>Tu menú, decidido de una vez</h2><p>Objetivos, alergias, tiempo y presupuesto en un plan privado que puedes ajustar comida a comida.</p></div>'+
    '<div class="card mp-form"><h3>1 · Objetivo nutricional</h3><div class="good">Sincronizado con tu calculadora de macros. Puedes ajustar estos valores solo para este menú.</div><div class="row"><div><label>Calorías / día</label><input id="mpKcal" type="number" min="1200" max="5000" value="'+esc(targets.kcal)+'"></div><div><label>Proteína (g)</label><input id="mpProtein" type="number" min="40" max="300" value="'+esc(targets.protein)+'"></div></div>'+
    '<div class="row"><div><label>Comidas / día</label><select id="mpMeals"><option>3</option><option selected>4</option><option>5</option></select></div><div><label>Estilo</label><select id="mpDiet"><option value="flexible">Flexible</option><option value="vegetariana">Vegetariano</option><option value="vegana">Vegano</option><option value="pescetariana">Pescetariano</option><option value="sin-lactosa">Sin lactosa</option><option value="sin-gluten">Sin gluten</option></select></div></div>'+
    '<h3>2 · Límites y gustos</h3><label>Alergias o alimentos excluidos <small>· separados por comas</small></label><input id="mpExcluded" placeholder="Ej. cacahuete, marisco, cebolla"><div class="notice">Las exclusiones son un filtro preventivo por texto. Con alergias graves, revisa siempre ingredientes y contaminación cruzada.</div>'+
    '<label>Ingredientes que ya tienes o prefieres</label><input id="mpPantry" placeholder="Ej. arroz, huevos, pollo"><div class="row"><div><label>Tiempo máximo</label><select id="mpTime"><option value="15">15 min</option><option value="30" selected>30 min</option><option value="45">45 min</option><option value="60">60 min</option></select></div><div><label>Presupuesto</label><select id="mpBudget"><option value="bajo">Ajustado</option><option value="medio" selected>Medio</option><option value="alto">Flexible</option></select></div></div>'+
    '<label>Variedad</label><select id="mpVariety"><option value="alta" selected>Alta · menos repeticiones</option><option value="media">Media · cocinar por tandas</option><option value="baja">Baja · máxima sencillez</option></select>'+
    '<button id="mpGenerate" style="width:100%;margin-top:14px">Generar mis 30 días</button><p class="small" style="text-align:center">Orientativo · no sustituye consejo sanitario individual.</p></div><div id="mpStatus"></div><div id="mpResult"></div>';
    $('mpGenerate').onclick=generate;
    document.addEventListener('recomp:targets-updated',event=>applyMacroTargets(event.detail,true));
    window.addEventListener('pageshow',()=>applyMacroTargets());
    try{const saved=JSON.parse(localStorage.getItem(key)||'null');plan=saved?RecompPersistence.cleanMealPlan30(saved):null}
    catch{$('mpStatus').innerHTML='<div class="notice">El plan guardado está dañado. Genera uno nuevo o restaura una copia válida.</div>';plan=null}
    render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();