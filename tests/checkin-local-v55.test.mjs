import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const checkin=require('../recomp-checkin-v4.js');
const guard=require('../checkin-local-v55.js');

test('check-in without date receives the local civil day from the date API',()=>{
  const fakeDate={localDayKey:()=> '2026-08-23'};
  guard.install(checkin,fakeDate);
  const history=checkin.add([],{weight:80,dietAdherence:.9,trainingAdherence:.9});
  assert.equal(history[0].date,'2026-08-23');
});

test('explicit historical date is preserved',()=>{
  const history=checkin.add([],{date:'2026-07-01',weight:80,dietAdherence:.9,trainingAdherence:.9});
  assert.equal(history[0].date,'2026-07-01');
});

test('fallback local day uses civil date components',()=>{
  const d=new Date(2026,7,23,0,15,0);
  assert.equal(guard.fallbackLocalDay(d),'2026-08-23');
});
