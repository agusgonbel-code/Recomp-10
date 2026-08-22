import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const out=path.join(root,'www');
const files=[
  'index.html','privacy.html','support.html','manifest.webmanifest',
  'persistence.js','date-engine.js','training-engine.js','nutrition-engine.js',
  'meal-planner.js','meal-planner-ui.js','meal-planner-six-v52.js','quality-v53.js','quality-v54.js','meal-planner-profile-sync-v52.js','meal-intelligence-v60.js','coach-engine.js','photo-engine.js',
  'recomp-profile-v2.js','recomp-intake-v2.js','nutrition-target-sync-v51.js','recomp-review-v3.js','recomp-trend-v3.js','recomp-trend-ui-v3.js','recomp-checkin-v4.js','checkin-local-v55.js','nutrition-menu-experience-v51.js',
  'icon-192.png','icon-512.png'
];

await rm(out,{recursive:true,force:true});
await mkdir(out,{recursive:true});
for(const file of files){
  const source=path.join(root,file);
  if(!existsSync(source))throw new Error(`Falta archivo obligatorio para iOS: ${file}`);
  await cp(source,path.join(out,file));
}

const indexPath=path.join(out,'index.html');
let html=await readFile(indexPath,'utf8');
html=html.replace(
  "if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js');init();",
  "if(location.protocol==='http:'||location.protocol==='https:'){if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js')}init();"
);
await writeFile(indexPath,html,'utf8');

console.log(`Build móvil listo: ${files.length} archivos en www/`);
