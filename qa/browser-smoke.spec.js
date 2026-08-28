const { test, expect } = require('@playwright/test');

async function photoFixture(page) {
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 40;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#336699';
    ctx.fillRect(0, 0, 40, 40);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  return { name: 'baseline.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') };
}

async function storedPhotoCount(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('recomp-photos-v1', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('photos', 'readonly');
      const count = transaction.objectStore('photos').count();
      transaction.oncomplete = () => { db.close(); resolve(count.result); };
      transaction.onabort = () => { db.close(); reject(transaction.error); };
    };
  }));
}

for (const failure of ['transaction abort', 'unreadable image']) {
  test(`photo recovery after ${failure} preserves inputs and supports a successful retry`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
    await completeIntake(page);
    await expect(page.locator('#r10IntakeModal')).toBeHidden();
    await page.locator('nav button').filter({ hasText: 'Progreso' }).click();
    const validPhoto = await photoFixture(page);
    const selectedPhoto = failure === 'unreadable image'
      ? { name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not an image') }
      : validPhoto;
    await page.locator('#photoInput').setInputFiles(selectedPhoto);
    await page.locator('#photoNote').fill('Nota conservada para reintentar');
    if (failure === 'transaction abort') {
      await page.evaluate(() => {
        const originalPut = IDBObjectStore.prototype.put;
        IDBObjectStore.prototype.put = function (...args) {
          const request = originalPut.apply(this, args);
          if (this.name === 'photos' && this.transaction.db.name === 'recomp-photos-v1') {
            IDBObjectStore.prototype.put = originalPut;
            const transaction = this.transaction;
            // Exercise an actual browser transaction abort AFTER request success.
            request.addEventListener('success', () => {
              window.__photoWriteAborted = true;
              transaction.abort();
            }, { once: true });
          }
          return request;
        };
      });
    }
    await page.getByRole('button', { name: 'Guardar foto', exact: true }).click();
    await expect(page.locator('#photoStatus')).toContainText(
      failure === 'transaction abort' ? 'Guardado cancelado' : 'no pudo leer'
    );
    if (failure === 'transaction abort') {
      expect(await page.evaluate(() => window.__photoWriteAborted)).toBe(true);
    }
    expect(await storedPhotoCount(page)).toBe(0);
    await expect(page.locator('#photoGrid img')).toHaveCount(0);
    await expect(page.locator('#photoInput')).toBeEnabled();
    await expect(page.locator('#photoNote')).toBeEnabled();
    await expect(page.locator('#photoNote')).toHaveValue('Nota conservada para reintentar');
    expect(await page.locator('#photoInput').evaluate(input => input.files[0]?.name)).toBe(selectedPhoto.name);
    // An aborted transaction can retry the same file; an unreadable file must be replaced.
    if (failure === 'unreadable image') await page.locator('#photoInput').setInputFiles(validPhoto);
    await page.getByRole('button', { name: 'Guardar foto', exact: true }).click();
    await expect(page.locator('#photoStatus')).toContainText('Foto guardada');
    expect(await storedPhotoCount(page)).toBe(1);
    await expect(page.locator('#photoNote')).toHaveValue('');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('nav button').filter({ hasText: 'Progreso' }).click();
    await expect(page.locator('#photoGrid img')).toHaveCount(1);
    await expect(page.locator('#photoGrid')).toContainText('Nota conservada para reintentar');
    await expect.poll(() => page.locator('#photoGrid img').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
    expect(await page.evaluate(() => localStorage.getItem('photos'))).toBeNull();
    expect(errors).toEqual([]);
  });
}

test('photo saving resists repeated taps and persists a single compressed photo', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await completeIntake(page);
  await expect(page.locator('#r10IntakeModal')).toBeHidden();
  await page.locator('nav button').filter({ hasText: 'Progreso' }).click();
  await page.locator('#photoInput').setInputFiles(await photoFixture(page));
  await page.locator('#photoNote').fill('Línea base de prueba');
  const busy = await page.evaluate(async () => {
    const first = window.savePhoto();
    const second = window.savePhoto();
    const input = document.getElementById('photoInput');
    const disabled = input.disabled && document.getElementById('photoNote').disabled &&
      input.parentElement.querySelector('button').disabled;
    await Promise.all([first, second]);
    return disabled;
  });
  expect(busy).toBe(true);
  await expect(page.locator('#photoStatus')).toContainText('Foto guardada');
  await expect(page.locator('#photoGrid img')).toHaveCount(1);
  await expect(page.locator('#photoNote')).toHaveValue('');
  await expect(page.locator('#photoInput')).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Guardar foto', exact: true })).toBeEnabled();
  expect(await page.evaluate(() => localStorage.getItem('photos'))).toBeNull();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('nav button').filter({ hasText: 'Progreso' }).click();
  await expect(page.locator('#photoGrid img')).toHaveCount(1);
  await expect(page.locator('#photoGrid')).toContainText('Línea base de prueba');
  await expect.poll(() => page.locator('#photoGrid img').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
  expect(errors).toEqual([]);
});
async function completeIntake(page){await expect(page.locator('#r10IntakeModal')).toBeVisible();await page.locator('#rWaist').fill('82');await page.locator('#rNext').click();await page.locator('#rNext').click();await page.locator('#rNext').click();await expect(page.locator('#rGenerate')).toBeVisible();await page.locator('#rGenerate').click();await page.waitForFunction(()=>localStorage.getItem('recomp_unified_profile_v2')!==null);await page.waitForFunction(()=>localStorage.getItem('targets')!==null);}
test('fresh launch never exposes personal starter data', async ({ page }) => {await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});await expect(page.locator('#hello')).toHaveText('Configura tu perfil');await expect(page.locator('#dWeight')).toHaveText('—');await expect(page.locator('#profileName')).toHaveValue('Usuario');await expect(page.locator('#age')).toHaveValue('');await expect(page.locator('#weight')).toHaveValue('');await expect(page.locator('#height')).toHaveValue('');const body=await page.locator('body').innerText();expect(body).not.toContain('Agustín');expect(body).not.toContain('81 kg');});
test('unified intake opens, generates nutrition and training, and persists', async ({ page }) => {const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});await expect(page.getByText('Perfil único usuario / cliente')).toBeVisible();await completeIntake(page);const profile=await page.evaluate(()=>JSON.parse(localStorage.getItem('recomp_unified_profile_v2')));const nutrition=await page.evaluate(()=>JSON.parse(localStorage.getItem('recomp_unified_nutrition_v2')));const plan=await page.evaluate(()=>JSON.parse(localStorage.getItem('recomp_unified_plan_v2')));const targets=await page.evaluate(()=>JSON.parse(localStorage.getItem('targets')));expect(profile.meals).toBeGreaterThanOrEqual(3);expect(profile.waist).toBe(82);const baseline=await page.evaluate(()=>JSON.parse(localStorage.getItem('metrics')).filter(item=>item.source==='unified-profile'));expect(baseline).toHaveLength(1);expect(baseline[0].weight).toBe(profile.weight);expect(baseline[0].waist).toBe(82);expect(nutrition.targets.kcal).toBeGreaterThan(1000);expect(targets).toEqual(nutrition.targets);expect(Object.keys(plan.routine).length).toBe(profile.days);const storedRoutines=await page.evaluate(()=>JSON.parse(localStorage.getItem('routines')));expect(Object.keys(storedRoutines)).toEqual(Object.keys(plan.routine));for(const day of Object.keys(plan.routine)){expect(storedRoutines[day].map(item=>item[0])).toEqual(plan.routine[day].map(item=>item.name))}await page.waitForFunction(()=>{const profile=JSON.parse(localStorage.getItem('recomp_unified_profile_v2'));return document.querySelectorAll('#daySelect option').length===profile.days});await expect(page.locator('#r10TrainingPlanSummary')).toContainText('Plan personalizado');await expect(page.locator('#r10TrainingPlanSummary')).toContainText('Progresión:');await expect(page.locator('#r10TrainingPlanSummary')).toContainText('Descarga:');await page.locator('nav button').filter({hasText:'Menús'}).click();await expect(page.locator('#mpGenerate')).toBeVisible();await page.waitForTimeout(1300);await expect(page.locator('#mpGenerate')).toBeVisible();await page.getByRole('button',{name:'Perfil y plan'}).click();await page.locator('#rNext').click();await page.locator('#rNext').click();await page.locator('#rNext').click();await page.locator('#rGenerate').click();await page.waitForTimeout(1200);const baselinesAfterRegeneration=await page.evaluate(()=>JSON.parse(localStorage.getItem('metrics')).filter(item=>item.source==='unified-profile'));expect(baselinesAfterRegeneration).toHaveLength(1);expect(errors).toEqual([]);});
test('unified intake offers a secure baseline photo handoff',async({page})=>{const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});await completeIntake(page);await expect(page.locator('#r10IntakeModal')).toBeHidden();await expect(page.locator('#rAddBaselinePhoto')).toBeVisible();const chooserPromise=page.waitForEvent('filechooser');await page.locator('#rAddBaselinePhoto').click();const chooser=await chooserPromise;await chooser.setFiles([]);await expect(page.locator('#r10IntakeModal')).toBeHidden();await expect(page.locator('#progreso')).toHaveClass(/active/);await expect(page.locator('#photoInput')).toBeVisible();await expect(page.locator('#photoNote')).toHaveValue('Línea base · frontal, lateral o posterior');expect(await page.evaluate(()=>localStorage.getItem('photos'))).toBeNull();expect(errors).toEqual([]);});
test('360 check-in records progress and produces an explainable decision',async({page})=>{const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});await completeIntake(page);await page.waitForSelector('#recompCheckin360');const card=page.locator('#recompCheckin360');await card.locator('summary').click();await card.locator('[data-k="weight"]').fill('80');await card.locator('[data-k="waist"]').fill('90');await card.locator('[data-k="front"]').check();await card.locator('[data-k="side"]').check();await card.locator('[data-k="standardized"]').check();await card.locator('[data-act="save"]').click();const h=await page.evaluate(()=>JSON.parse(localStorage.getItem('recomp_checkins_v4')));expect(h).toHaveLength(1);expect(h[0].photos.standardized).toBeTruthy();await expect(page.locator('#recompCheckin360')).toContainText('Check-in 360°');expect(errors).toEqual([]);});
