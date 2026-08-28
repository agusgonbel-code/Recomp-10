const { test, expect } = require('@playwright/test');

async function seedReview(page){
 await page.addInitScript(()=>{
  if(!localStorage.getItem('recomp_checkins_v4')){
   const history=['2026-08-01','2026-08-08','2026-08-15','2026-08-22'].map((date,i)=>({id:'review-'+i,date,weight:80,waist:90,dietAdherence:.95,trainingAdherence:.95,performance:0}));
   localStorage.setItem('recomp_checkins_v4',JSON.stringify(history));
   for(const key of ['targets','macro','recomp_targets_v2'])localStorage.setItem(key,JSON.stringify({kcal:2200,protein:160,carbs:250,fat:62}));
  }
  const original=Storage.prototype.setItem;
  window.failDecisionKey=null;window.targetEvents=0;
  Storage.prototype.setItem=function(key,value){
   if(key===window.failDecisionKey)throw new DOMException('Quota exceeded','QuotaExceededError');
   return original.call(this,key,value);
  };
  document.addEventListener('recomp:targets-updated',()=>window.targetEvents++);
 });
}

test('accepting a review rolls back a failed audit write and persists once after retry and reload',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await seedReview(page);
 const host=await openCheckinSaveFixture(page);
 await expect(host.locator('[data-act="accept"]')).toBeEnabled();
 await host.locator('[data-k="notes"]').fill('No perder el borrador');
 const before=await page.evaluate(()=>Object.fromEntries(['targets','macro','recomp_targets_v2','recomp_last_accepted_review_v4','recomp_decisions_v4'].map(k=>[k,localStorage.getItem(k)])));
 await page.evaluate(()=>window.failDecisionKey='recomp_decisions_v4');
 await host.locator('[data-act="accept"]').click();
 await expect(host.locator('[data-checkin-status]')).toContainText('No se pudo guardar');
 await expect(host.locator('[data-k="notes"]')).toHaveValue('No perder el borrador');
 expect(await page.evaluate(()=>Object.fromEntries(['targets','macro','recomp_targets_v2','recomp_last_accepted_review_v4','recomp_decisions_v4'].map(k=>[k,localStorage.getItem(k)])))).toEqual(before);
 expect(await page.evaluate(()=>window.targetEvents)).toBe(0);
 await page.evaluate(()=>window.failDecisionKey=null);
 await host.locator('[data-act="accept"]').click();
 await expect(host.locator('[data-checkin-status]')).toContainText('Recomendación aplicada');
 await expect(host.locator('[data-act="accept"]')).toBeDisabled();
 const targets=await page.evaluate(()=>['targets','macro','recomp_targets_v2'].map(k=>JSON.parse(localStorage.getItem(k))));
 expect(targets[0].kcal).toBe(2100);expect(targets[1]).toEqual(targets[0]);expect(targets[2]).toEqual(targets[0]);
 expect(await page.evaluate(()=>window.targetEvents)).toBe(1);
 await page.reload();
 await expect(host.locator('[data-act="accept"]')).toBeDisabled();
 const audit=await page.evaluate(()=>JSON.parse(localStorage.getItem('recomp_decisions_v4')));
 expect(audit).toHaveLength(1);expect(audit[0].previousTargets.kcal).toBe(2200);expect(audit[0].nextTargets.kcal).toBe(2100);
 expect(errors).toEqual([]);
});

test('a displayed recommendation cannot override goals changed by another view',async({page})=>{
 await seedReview(page);const host=await openCheckinSaveFixture(page);
 await page.evaluate(()=>localStorage.setItem('targets',JSON.stringify({kcal:2400,protein:160,carbs:300,fat:62})));
 await host.locator('[data-act="accept"]').click();
 await expect(host.locator('[data-checkin-status]')).toContainText('han cambiado');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('targets')).kcal)).toBe(2400);
 expect(await page.evaluate(()=>localStorage.getItem('recomp_decisions_v4'))).toBeNull();
});

async function openCheckinSaveFixture(page) {
  await page.route('**/__checkin-save-test', route=>route.fulfill({
    contentType:'text/html; charset=utf-8',
    body:'<!doctype html><html lang="es"><head><meta charset="utf-8"></head><body><div id="coachBox"></div><script src="/recomp-review-v3.js"></script><script src="/recomp-checkin-v4.js"></script><script src="/checkin-local-v55.js"></script></body></html>'
  }));
  await page.goto('http://127.0.0.1:4173/__checkin-save-test');
  const host=page.locator('#recompCheckin360');
  await expect(host).toBeVisible();
  await host.locator('summary').click();
  return host;
}

test('accepted review reaches all four generator fields without rewriting the saved menu',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await seedReview(page);
 await page.addInitScript(()=>{
  localStorage.setItem('recomp_unified_profile_v2',JSON.stringify({name:'Usuario QA',sex:'m',age:40,height:178,weight:80,activity:1.45,goal:'recomp',experience:'intermediate',days:4,minutes:50,equipment:['Máquina','Mancuernas','Barra','Polea'],meals:4,mealPattern:'balanced',diet:'flexible',excluded:'',maxTime:30,budget:'medio'}));
 });
 await page.goto('http://127.0.0.1:4173/',{waitUntil:'load'});
 await page.locator('nav button').filter({hasText:'Menús'}).click();
 await page.locator('#mpDays').fill('2');
 await page.locator('#mpGenerate').click();
 await expect(page.locator('.mp-day').first()).toBeVisible({timeout:15000});
 const menu=await page.evaluate(()=>localStorage.getItem('recomp10.mealPlan30'));
 expect(menu).not.toBeNull();
 await page.locator('nav button').filter({hasText:'Inicio'}).click();
 await page.locator('#recompCheckin360 [data-act="accept"]').click();
 await expect(page.locator('#recompCheckin360 [data-checkin-status]')).toContainText('Recomendación aplicada');
 const targets=await page.evaluate(()=>JSON.parse(localStorage.getItem('targets')));
 expect(targets.kcal).toBe(2100);
 await page.locator('nav button').filter({hasText:'Menús'}).click();
 for(const [id,key] of [['mpKcal','kcal'],['mpProtein','protein'],['mpCarbs','carbs'],['mpFat','fat']])await expect(page.locator('#'+id)).toHaveValue(String(targets[key]));
 expect(await page.evaluate(()=>localStorage.getItem('recomp10.mealPlan30'))).toBe(menu);
 await page.reload({waitUntil:'load'});
 await page.locator('nav button').filter({hasText:'Menús'}).click();
 for(const [id,key] of [['mpKcal','kcal'],['mpProtein','protein'],['mpCarbs','carbs'],['mpFat','fat']])await expect(page.locator('#'+id)).toHaveValue(String(targets[key]));
 expect(await page.evaluate(()=>localStorage.getItem('recomp10.mealPlan30'))).toBe(menu);
 expect(errors).toEqual([]);
});
test('check-in write failure preserves fields and retry persists once across reload',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
    const original=Storage.prototype.setItem;
    window.failCheckinWrite=false;window.checkinEvents=0;
    Storage.prototype.setItem=function(key,value){
      if(key==='recomp_checkins_v4'&&window.failCheckinWrite)throw new DOMException('Quota exceeded','QuotaExceededError');
      return original.call(this,key,value);
    };
    document.addEventListener('recomp:data-changed',()=>window.checkinEvents++);
  });
  const host=await openCheckinSaveFixture(page);
  await host.locator('[data-k="weight"]').fill('80.5');
  await host.locator('[data-k="notes"]').fill('Nota que debe conservarse');
  await page.evaluate(()=>window.failCheckinWrite=true);
  await host.locator('[data-act="save"]').click();
  await expect(host.locator('[data-checkin-status]')).toContainText('No se pudo guardar');
  await expect(host.locator('[data-k="notes"]')).toHaveValue('Nota que debe conservarse');
  await expect(host.locator('[data-k="weight"]')).toHaveValue('80.5');
  expect(await page.evaluate(()=>localStorage.getItem('recomp_checkins_v4'))).toBeNull();
  expect(await page.evaluate(()=>window.checkinEvents)).toBe(0);
  await page.evaluate(()=>window.failCheckinWrite=false);
  await host.locator('[data-act="save"]').click();
  await expect(host.locator('[data-checkin-status]')).toHaveText('Check-in guardado.');
  expect(await page.evaluate(()=>window.checkinEvents)).toBe(1);
  await page.reload();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('recomp_checkins_v4')));
  expect(saved).toHaveLength(1);expect(saved[0].weight).toBe(80.5);expect(saved[0].notes).toBe('Nota que debe conservarse');
  expect(errors).toEqual([]);
});
test('an open check-in form preserves newer history saved from another view',async({page})=>{
  const host=await openCheckinSaveFixture(page);
  await page.evaluate(()=>localStorage.setItem('recomp_checkins_v4',JSON.stringify([{id:'other-view',date:'2026-08-01',weight:81}])));
  await host.locator('[data-k="weight"]').fill('80');
  await host.locator('[data-act="save"]').click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('recomp_checkins_v4')));
  expect(saved).toHaveLength(2);expect(saved.some(row=>row.id==='other-view')).toBe(true);
});
test('check-in cannot overwrite unreadable persisted history',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const host=await openCheckinSaveFixture(page);
  await page.evaluate(()=>localStorage.setItem('recomp_checkins_v4','{broken'));
  await page.reload();
  await expect(host.locator('[data-checkin-status]')).toContainText('No se pudo leer');
  await host.locator('summary').click();
  await host.locator('[data-k="notes"]').fill('Pendiente de guardar');
  await host.locator('[data-act="save"]').click();
  await expect(host.locator('[data-checkin-status]')).toContainText('No se pudo guardar');
  await expect(host.locator('[data-k="notes"]')).toHaveValue('Pendiente de guardar');
  expect(await page.evaluate(()=>localStorage.getItem('recomp_checkins_v4'))).toBe('{broken');
  expect(errors).toEqual([]);
});
