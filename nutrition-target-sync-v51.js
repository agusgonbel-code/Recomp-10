(()=>{'use strict';
const NUT='recomp_unified_nutrition_v2';
const valid=t=>t&&Number.isFinite(Number(t.kcal))&&Number.isFinite(Number(t.protein))&&Number.isFinite(Number(t.carbs))&&Number.isFinite(Number(t.fat));
const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch{return null}};
const writeTargets=t=>{if(!valid(t))return false;const clean={kcal:Math.round(Number(t.kcal)),protein:Math.round(Number(t.protein)),carbs:Math.round(Number(t.carbs)),fat:Math.round(Number(t.fat))};localStorage.setItem('targets',JSON.stringify(clean));localStorage.setItem('macro',JSON.stringify(clean));localStorage.setItem('recomp_targets_v2',JSON.stringify(clean));document.dispatchEvent(new CustomEvent('recomp:targets-updated',{detail:clean}));return true};
function syncAfterIntake(){const nutrition=read(NUT);return writeTargets(nutrition?.targets)}
function install(){if(!localStorage.getItem('targets'))syncAfterIntake();const button=document.getElementById('rGenerate');if(button&&!button.dataset.targetSync){button.dataset.targetSync='1';button.addEventListener('click',()=>setTimeout(syncAfterIntake,30));}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0),{once:true});else setTimeout(install,0);
setTimeout(install,400);
globalThis.RecompTargetSync={syncAfterIntake,writeTargets};
})();
