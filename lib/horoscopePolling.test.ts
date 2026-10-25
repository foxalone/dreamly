import test from 'node:test';
import assert from 'node:assert/strict';
import { watchReading, MAX_POLLS, POLL_INTERVAL_MS } from './horoscope/polling';
import { horoscopeJobs } from './i18n/horoscope-jobs';
import { LOCALES } from './i18n/config';
import type { PublicStatus } from './horoscope/jobs';
const settle=()=>new Promise<void>(resolve=>setImmediate(resolve));
function controls(read:()=>Promise<PublicStatus>) {
  const timers:Array<()=>void>=[], updates:PublicStatus[]=[];
  let ready=0,timedOut=0,unavailable=0,cancelled=0;
  const stop=watchReading(read, {day:'2026-10-25',update:s=>updates.push(s),ready:()=>{ready++;},timedOut:()=>{timedOut++;},unavailable:()=>{unavailable++;},
    schedule:(callback,ms)=>{assert.equal(ms,POLL_INTERVAL_MS);timers.push(callback);return timers.length as unknown as ReturnType<typeof setTimeout>;},cancel:()=>{cancelled++;}});
  return {timers,updates,stop,result:()=>({ready,timedOut,unavailable,cancelled})};
}
test('polling stops at completion and requests a server refresh, with no overlapping reads',async()=>{
  let calls=0;
  const c=controls(async()=>({day:'2026-10-25',status:++calls===2?'ready':'queued'}));
  await settle();assert.equal(calls,1);assert.equal(c.timers.length,1);
  c.timers.shift()!();await settle();assert.equal(calls,2);assert.equal(c.result().ready,1);assert.equal(c.timers.length,0);
});
test('polling stops after a bounded waiting period and never initiates a job',async()=>{
  let calls=0;
  const c=controls(async()=>{calls++;return {day:'2026-10-25',status:'processing'};});
  await settle();
  while(c.timers.length){c.timers.shift()!();await settle();}
  assert.equal(calls,MAX_POLLS);assert.equal(c.result().timedOut,1);
});
test('unmount cancels timers and ignores a late status response',async()=>{
  let resolve!:(status:PublicStatus)=>void;
  const c=controls(()=>new Promise(done=>{resolve=done;}));
  c.stop();resolve({day:'2026-10-25',status:'ready'});await settle();
  assert.equal(c.result().ready,0);assert.equal(c.timers.length,0);
});
test('missing/exhausted results stop polling, network errors are bounded, UTC rollover refreshes',async()=>{
  for(const status of ['missing','failed'] as const){const c=controls(async()=>({day:'2026-10-25',status}));await settle();assert.equal(c.timers.length,0);assert.equal(c.updates[0].status,status);}
  const error=controls(async()=>{throw new Error('offline');});await settle();assert.equal(error.result().unavailable,1);assert.equal(error.timers.length,0);
  const rollover=controls(async()=>({day:'2026-10-26',status:'missing'}));await settle();assert.equal(rollover.result().ready,1);
});
test('waiting, failure and initiation labels exist in all six locales',()=>{
  for(const locale of LOCALES) for(const text of Object.values(horoscopeJobs[locale])) assert.ok(text.trim().length>4);
});
