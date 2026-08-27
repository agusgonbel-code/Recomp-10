import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const root=url=>new URL('../'+url,import.meta.url);
const read=file=>readFileSync(root(file),'utf8');

test('release: privacidad y soporte existen y no contienen marcadores provisionales',()=>{
  for(const file of ['privacy.html','support.html']){
    assert.ok(existsSync(root(file)),`${file} no existe`);
    const text=read(file);
    assert.ok(text.length>700,`${file} está demasiado vacío`);
    assert.doesNotMatch(text,/TODO|PLACEHOLDER|example\.com|lorem ipsum/i,`${file} contiene texto provisional`);
  }
  const privacy=read('privacy.html');
  assert.match(privacy,/Política de privacidad/i);
  assert.match(privacy,/elimin/i,'La política debe explicar eliminación/retención');
  assert.match(privacy,/local/i,'La política debe explicar almacenamiento local');
  assert.match(privacy,/fotograf/i,'La política debe contemplar fotografías');
  const support=read('support.html');
  assert.match(support,/mailto:/i,'Soporte necesita una vía de contacto');
  assert.match(support,/privacy\.html/i,'Soporte debe enlazar privacidad');
});

test('release: privacidad y soporte son accesibles desde la app y offline',()=>{
  const ui=read('meal-planner-ui.js'),sw=read('sw.js');
  for(const page of ['privacy.html','support.html']){
    assert.match(ui,new RegExp(page.replace('.','\\.')),`La app no enlaza ${page}`);
    assert.match(sw,new RegExp(page.replace('.','\\.')),`La PWA no cachea ${page}`);
  }
  assert.match(ui,/ensureLegalLinks/);
});

test('release: manifiesto e iconos mínimos son válidos',()=>{
  const manifest=JSON.parse(read('manifest.webmanifest'));
  assert.equal(manifest.display,'standalone');
  assert.ok(manifest.name&&manifest.name.length>=2);
  assert.ok(manifest.short_name&&manifest.short_name.length>=2);
  const sizes=new Set((manifest.icons||[]).map(x=>x.sizes));
  assert.ok(sizes.has('192x192'));
  assert.ok(sizes.has('512x512'));
  assert.ok(existsSync(root('icon-192.png')));
  assert.ok(existsSync(root('icon-512.png')));
});

test('release: no hay dependencias remotas evidentes en el runtime principal',()=>{
  const files=['persistence.js','date-engine.js','training-engine.js','nutrition-engine.js','meal-planner.js','meal-planner-ui.js','coach-engine.js','photo-engine.js'];
  for(const file of files){
    const text=read(file);
    assert.doesNotMatch(text,/https?:\/\//i,`${file} contiene una URL remota; revisar privacidad/offline`);
    assert.doesNotMatch(text,/XMLHttpRequest\s*\(/,`${file} usa XMLHttpRequest remoto`);
  }
});

test('release: los módulos profesionales están conectados al runtime público',()=>{
  const html=read('index.html');
  const required=[
    'recomp-profile-v2.js','recomp-intake-v2.js','nutrition-target-sync-v51.js',
    'meal-planner-six-v52.js','quality-v53.js','quality-v54.js',
    'meal-planner-profile-sync-v52.js','meal-intelligence-v60.js',
    'recomp-review-v3.js','recomp-trend-v3.js','recomp-checkin-v4.js',
    'checkin-local-v55.js','recomp-trend-ui-v3.js','nutrition-menu-experience-v51.js'
  ];
  for(const file of required){
    assert.match(html,new RegExp(`<script[^>]+src=['"]${file.replaceAll('.','\\.')}['"]`),`${file} no está cargado por index.html`);
  }
  assert.ok(html.indexOf('recomp-profile-v2.js')<html.indexOf('recomp-intake-v2.js'),'El perfil debe cargarse antes del formulario unificado');
  assert.ok(html.indexOf('recomp-checkin-v4.js')<html.indexOf('checkin-local-v55.js'),'El parche de fecha local debe cargarse después del motor de check-in');
});
