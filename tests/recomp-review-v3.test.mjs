import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';const require=createRequire(import.meta.url);const e=require('../recomp-review-v3.js');
const weekly=['2026-07-01','2026-07-08','2026-07-15','2026-07-22','2026-07-29','2026-08-05','2026-08-12'];
import {execFileSync} from 'node:child_process';

test('missing and invalid measurements cannot create dated evidence or calorie adjustments',()=>{
 const invalid=[null,undefined,'','  ',false,true,[],{},NaN,Infinity,0,-80];
 for(const value of invalid){
  const r=e.review({weights:[80,value,value,value],weightDates:weekly.slice(0,4),dietAdherence:1,trainingAdherence:1,weeksObserved:4});
  assert.equal(r.weight.observations,1,String(value));
  assert.equal(r.weight.sourceObservations,1,String(value));
  assert.equal(r.reliable,false);assert.equal(r.calorieDelta,0);
 }
});

test('invalid measurements cannot dilute a same-day average',()=>{
 const values=[80,null,'',false,0,-1,'79.5',79,78.5];
 const dates=[...Array(6).fill('2026-08-01'),'2026-08-08','2026-08-15','2026-08-22'];
 assert.deepEqual(e.seriesTrend(values,dates),e.seriesTrend([80,79.5,79,78.5],dates.slice(-4)));
});

test('legacy undated trends reject blank measurements but preserve numeric strings',()=>{
 const t=e.seriesTrend([80,null,'',false,0,-1,'79.5',79,78.5]);
 assert.deepEqual(t,e.seriesTrend([80,79.5,79,78.5]));
 assert.equal(e.seriesTrend([80,null,'',false]).enough,false);
});

test('an explicitly supplied empty date series never becomes assumed weekly evidence',()=>{
 for(const dates of [Array(4).fill(''),Array(4).fill(null),new Array(4),['',null,undefined,'']]){
  const t=e.seriesTrend([80,79.8,79.6,79.4],dates);
  assert.equal(t.enough,false);assert.equal(t.timing,'dated');assert.equal(t.observations,0);
 }
 assert.equal(e.seriesTrend([80,79.8,79.6,79.4],[]).timing,'weekly-assumed');
});

test('impossible calendar dates are excluded without normalizing into another day',()=>{
 for(const date of ['2026-02-29','2026-02-30','2026-13-01','2026-08-32']){
  const t=e.seriesTrend([80,79.8,79.6,79.4],['2026-01-01',date,'2026-01-15','2026-01-22']);
  assert.equal(t.observations,3);assert.equal(t.enough,false);
 }
});

test('civil-day spans and slopes remain identical across daylight-saving changes',()=>{
 const cases=[
  ['2026-03-25','2026-03-27','2026-03-29','2026-04-01'],
  ['2026-10-21','2026-10-23','2026-10-25','2026-10-28'],
  ['2026-03-04','2026-03-06','2026-03-08','2026-03-11'],
  ['2026-10-28','2026-10-30','2026-11-01','2026-11-04'],
 ];
 const source=`const e=require(${JSON.stringify(require.resolve('../recomp-review-v3.js'))});console.log(JSON.stringify(${JSON.stringify(cases)}.map(d=>e.seriesTrend([80,79.8,79.6,79.3],d))));`;
 const run=tz=>JSON.parse(execFileSync(process.execPath,['-e',source],{env:{...process.env,TZ:tz},encoding:'utf8'}));
 const utc=run('UTC');
 for(const t of utc){assert.equal(t.enough,true);assert.equal(t.spanDays,7);assert.equal(t.delta,-.7);}
 for(const tz of ['Europe/Madrid','America/New_York'])assert.deepEqual(run(tz),utc,tz);
});

test('timestamped observations retain their captured civil date rather than UTC date',()=>{
 const t=e.seriesTrend([80,79.8,79.6,79.3],['2026-03-25T23:30:00-04:00','2026-03-27T00:30:00+01:00','2026-03-29T00:30:00+01:00','2026-04-01T00:30:00+02:00']);
 assert.equal(t.spanDays,7);assert.equal(t.enough,true);assert.equal(t.delta,-.7);
});
test('recognizes positive recomp with stable weight and falling waist',()=>{const r=e.review({weights:[80,80.1,80,80,79.9,80,80],weightDates:weekly,waist:[90,89.9,89.8,89.6,89.5,89.4,89.3],waistDates:weekly,dietAdherence:.95,trainingAdherence:.9,performance:.2,weeksObserved:7,photoStandardized:true});assert.equal(r.status,'positive-recomp');assert.equal(r.calorieDelta,0);assert.equal(r.confidence,'high');});
test('does not adjust plan when adherence is poor',()=>{const r=e.review({weights:[80,80,80,80,80,80],weightDates:weekly.slice(0,6),waist:[90,90,90,90,90,90],waistDates:weekly.slice(0,6),dietAdherence:.5,trainingAdherence:.9,weeksObserved:6});assert.equal(r.reliable,false);assert.equal(r.calorieDelta,0);});
test('raises calories when dated weekly loss is too aggressive and performance falls',()=>{const r=e.review({weights:[80,79.2,78.5,77.8,77.1,76.5,75.9],weightDates:weekly,waist:[90,89.5,89,88.5,88,87.5,87],waistDates:weekly,dietAdherence:.95,trainingAdherence:.9,performance:-.6,weeksObserved:7});assert.equal(r.status,'too-aggressive');assert.equal(r.calorieDelta,100);});
test('four observations on one day are not treated as a usable trend',()=>{const dates=['2026-08-01','2026-08-01','2026-08-01','2026-08-01'];const t=e.seriesTrend([80,79.8,79.6,79.4],dates);assert.equal(t.enough,false);assert.equal(t.spanDays,0);});
test('duplicate observations across only two days cannot create a usable trend',()=>{const dates=['2026-08-01','2026-08-01','2026-08-08','2026-08-08'];const t=e.seriesTrend([80,80.2,79.8,80],dates);assert.equal(t.enough,false);assert.equal(t.observations,2);assert.equal(t.sourceObservations,4);});
test('a malformed supplied date cannot silently become assumed weekly evidence',()=>{const dates=['2026-08-01','bad','2026-08-15','2026-08-22'];const t=e.seriesTrend([80,79.8,79.6,79.4],dates);assert.equal(t.enough,false);assert.equal(t.timing,'dated');assert.equal(t.observations,3);});
test('dated trends average same-day duplicates before estimating change',()=>{const dates=['2026-08-01','2026-08-01','2026-08-08','2026-08-15','2026-08-22'];const duplicate=e.seriesTrend([79,81,79.5,79,78.5],dates),daily=e.seriesTrend([80,79.5,79,78.5],['2026-08-01','2026-08-08','2026-08-15','2026-08-22']);assert.equal(duplicate.enough,true);assert.equal(duplicate.observations,4);assert.equal(duplicate.sourceObservations,5);assert.equal(duplicate.delta,daily.delta);assert.equal(duplicate.ratePct,daily.ratePct);});
test('out-of-order dated measurements are consolidated and sorted by day',()=>{const t=e.seriesTrend([79,80,78.5,79.5,79.6],['2026-08-15','2026-08-01','2026-08-22','2026-08-08','2026-08-08']);assert.equal(t.enough,true);assert.equal(t.first,79.78);assert.equal(t.last,78.75);});
test('undated observations default to weekly spacing rather than one-day spacing',()=>{const t=e.seriesTrend([80,79.8,79.6,79.4]);assert.equal(t.enough,true);assert.equal(t.timing,'weekly-assumed');assert.ok(Math.abs(t.ratePct)<1);});
test('applied targets reconcile macro energy closely',()=>{const t=e.apply({kcal:2300,protein:170,fat:70},{calorieDelta:-100});assert.ok(Math.abs(t.protein*4+t.carbs*4+t.fat*9-t.kcal)<=4);});
