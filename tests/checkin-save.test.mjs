import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const KEY='recomp_checkins_v4';
const source=fs.readFileSync(new URL('../recomp-checkin-v4.js',import.meta.url),'utf8');
function fixture(initial=[],rawInitial=JSON.stringify(initial)){
 const stored=new Map([[KEY,rawInitial]]);
 const fields=Object.fromEntries(Object.entries({weight:'80.5',waist:'90',diet:'85',training:'90',performance:'0',sleep:'3',hunger:'3',stress:'3',notes:'Conservar esta nota'}).map(([k,value])=>[k,{value}]));
 for(const k of ['front','side','back','standardized'])fields[k]={checked:false};
 const status={textContent:'',setAttribute(){}};
 let renders=0,failWrite=false,failRead=false,writes=0;
 const events=[];
 const host={
  style:{},querySelector(selector){if(selector==='[data-checkin-status]')return status;const key=/data-k="([^"]+)"/.exec(selector)?.[1];return fields[key];},
  set innerHTML(value){this.html=value;renders++;},get innerHTML(){return this.html;},
 };
 const storage={
  getItem(key){if(failRead&&key===KEY)throw new Error('storage denied');return stored.get(key)??null;},
  setItem(key,value){writes++;if(failWrite&&key===KEY)throw new Error('quota exceeded');stored.set(key,value);},
 };
 const context={localStorage:storage,CustomEvent:class{constructor(type){this.type=type;}},document:{
  readyState:'complete',getElementById:id=>id==='recompCheckin360'?host:null,
  dispatchEvent(event){events.push({type:event.type,history:JSON.parse(stored.get(KEY))});},
 }};
 vm.runInNewContext(source,context);
 return {host,fields,status,events,stored,save:()=>host.onclick({target:{dataset:{act:'save'}}}),
  get renders(){return renders;},get writes(){return writes;},
  set failWrite(v){failWrite=v;},set failRead(v){failRead=v;},
 };
}
const old={id:'old',date:'2026-08-01',weight:81};

test('save appends to the latest persisted history, not the history captured at render',()=>{
 const f=fixture([old]);
 f.stored.set(KEY,JSON.stringify([old,{id:'other-tab',date:'2026-08-02',weight:80.8}]));
 f.save();
 const history=JSON.parse(f.stored.get(KEY));
 assert.equal(history.length,3);assert.ok(history.some(x=>x.id==='other-tab'));
 assert.equal(f.events.length,1);assert.equal(f.events[0].history.length,3);
});

test('failed write preserves the form and history and announces an actionable error',()=>{
 const f=fixture([old]),before=f.host.innerHTML;
 f.failWrite=true;
 assert.doesNotThrow(()=>f.save());
 assert.equal(f.stored.get(KEY),JSON.stringify([old]));assert.equal(f.events.length,0);
 assert.equal(f.renders,1);assert.equal(f.host.innerHTML,before);
 assert.equal(f.fields.notes.value,'Conservar esta nota');assert.equal(f.fields.weight.value,'80.5');
 assert.match(f.status.textContent,/no se pudo guardar/i);assert.match(f.status.textContent,/reintenta/i);
});

test('retry after a failed write saves exactly one check-in and notifies only after persistence',()=>{
 const f=fixture([old]);f.failWrite=true;
 try{f.save();}catch{}
 f.failWrite=false;f.save();
 const history=JSON.parse(f.stored.get(KEY));
 assert.equal(history.length,2);assert.equal(history.at(-1).notes,'Conservar esta nota');
 assert.equal(f.events.length,1);assert.equal(f.events[0].history.length,2);
 assert.equal(f.renders,2);assert.match(f.status.textContent,/check-in guardado/i);
});

test('read failures cannot replace the history with a stale in-memory snapshot',()=>{
 const f=fixture([old]);f.failRead=true;
 assert.doesNotThrow(()=>f.save());
 assert.equal(f.writes,0);assert.equal(f.events.length,0);assert.equal(f.renders,1);
 assert.match(f.status.textContent,/no se pudo guardar/i);
});

test('malformed persisted history is preserved instead of overwritten during save',()=>{
 for(const raw of ['{broken','{}','null','[null]']){
  const f=fixture([old]);f.stored.set(KEY,raw);
  assert.doesNotThrow(()=>f.save());
  assert.equal(f.stored.get(KEY),raw);assert.equal(f.writes,0);assert.equal(f.events.length,0);
  assert.match(f.status.textContent,/no se pudo guardar/i);
 }
});

test('initial malformed history still renders the form without silently overwriting storage',()=>{
 for(const raw of ['{broken','{}','null','[null]']){
  const f=fixture([],raw);
  assert.equal(f.renders,1);assert.match(f.host.innerHTML,/Guardar check-in/);
  assert.match(f.status.textContent,/no se pudo leer/i);
  assert.doesNotThrow(()=>f.save());
  assert.equal(f.stored.get(KEY),raw);
 }
});
