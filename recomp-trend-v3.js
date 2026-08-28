(function(root,factory){'use strict';const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.RecompTrend=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;const pct=(a,b)=>b?((a-b)/b)*100:0;const finite=v=>Number.isFinite(Number(v));
// Coverage is a conservative data-availability gate, not proof that the diet
// was followed. Use seven local civil days, including today, across DST changes.
function mealLogCoverage(meals=[],now=new Date()){
 const windowDays=7,days=new Set();
 const current=now instanceof Date?now:new Date(now);
 if(!Number.isFinite(current.getTime()))return{days:0,windowDays,ratio:0};
 const start=new Date(current.getFullYear(),current.getMonth(),current.getDate()-6);
 for(const meal of Array.isArray(meals)?meals:[]){
  const raw=meal?.date;
  if(typeof raw!=='string')continue;
  const match=/^(\d{4})-(\d{2})-(\d{2})(T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})?)?$/.exec(raw);
  if(!match)continue;
  const [,y,m,d,time]=match,calendar=new Date(+y,+m-1,+d);
  if(calendar.getFullYear()!==+y||calendar.getMonth()!==+m-1||calendar.getDate()!==+d)continue;
  const date=time?new Date(raw):calendar;
  if(!Number.isFinite(date.getTime())||date<start||date>current)continue;
  days.add(`${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`);
 }
 return{days:days.size,windowDays,ratio:days.size/windowDays};
}
function trend(values=[]){const a=values.filter(finite).map(Number);if(a.length<4)return{enough:false,changePct:0};const n=Math.max(2,Math.floor(a.length/2));const start=avg(a.slice(0,n)),end=avg(a.slice(-n));return{enough:true,start,end,changePct:pct(end,start)};}
function evaluate(input={}){const weights=trend(input.weights||[]),waists=trend(input.waists||[]),performance=trend(input.performance||[]),rawAdherence=['number','string'].includes(typeof input.adherence)?Number(input.adherence):NaN,adherence=Number.isFinite(rawAdherence)&&rawAdherence>=0&&rawAdherence<=1?rawAdherence:0,goal=input.goal||'recomp';const reasons=[];let kcalDelta=0;let action='maintain';let confidence='low';if(weights.enough&&waists.enough)confidence='medium';if(weights.enough&&waists.enough&&performance.enough)confidence='high';if(adherence<.75){reasons.push('Adherencia insuficiente: no ajustar calorías por datos poco fiables.');return{action,kcalDelta,confidence:'low',reasons,signals:{weights,waists,performance,adherence}};}
if(goal==='recomp'){
 if(waists.enough&&waists.changePct<=-1&&(!performance.enough||performance.changePct>=-2)){action='maintain';reasons.push('Cintura desciende sin pérdida clara de rendimiento: recomposición favorable.');}
 else if(weights.enough&&weights.changePct>1&&waists.enough&&waists.changePct>1){action='reduce';kcalDelta=-125;reasons.push('Peso y cintura suben de forma conjunta: reducir energía ligeramente.');}
 else if(weights.enough&&weights.changePct<-1.5&&performance.enough&&performance.changePct<-5){action='increase';kcalDelta=125;reasons.push('Pérdida rápida acompañada de caída de rendimiento: recuperar energía.');}
 else reasons.push('Sin señal suficientemente consistente: mantener y recopilar más datos.');
 } else if(goal==='loss'&&weights.enough&&weights.changePct>-0.25){action='reduce';kcalDelta=-125;reasons.push('La tendencia de peso no acompaña el objetivo de pérdida.');}
 else if(goal==='gain'&&weights.enough&&weights.changePct<0.25){action='increase';kcalDelta=125;reasons.push('La tendencia de peso no acompaña el objetivo de ganancia.');}
 else reasons.push('Tendencia compatible con el objetivo actual.');
return{action,kcalDelta,confidence,reasons,signals:{weights,waists,performance,adherence}};}
return{trend,evaluate,mealLogCoverage};});
