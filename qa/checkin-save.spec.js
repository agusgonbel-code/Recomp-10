const { test, expect } = require('@playwright/test');

async function openCheckinSaveFixture(page) {
  await page.route('**/__checkin-save-test', route=>route.fulfill({
    contentType:'text/html',
    body:'<!doctype html><html lang="es"><body><div id="coachBox"></div><script src="/recomp-review-v3.js"></script><script src="/recomp-checkin-v4.js"></script><script src="/checkin-local-v55.js"></script></body></html>'
  }));
  await page.goto('http://127.0.0.1:4173/__checkin-save-test');
  const host=page.locator('#recompCheckin360');
  await expect(host).toBeVisible();
  await host.locator('summary').click();
  return host;
}
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

