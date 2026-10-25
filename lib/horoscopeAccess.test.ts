import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { accessInfo, openFreeAccess, startHoroscopeAd, completeHoroscopeAd, subjectOf, entitlementPath } from './horoscope/access';
import { createAccessPass, readAccessPass, requestHasHoroscopeAccess } from './horoscope/access-cookie';
import { SIGNS } from './horoscope/model';
import { horoscopeAccess } from './i18n/horoscope-access';
import { LOCALES } from './i18n/config';
function database(initial: Record<string,object> = {}) {
  const docs = new Map(Object.entries(structuredClone(initial)));
  let failRead = false, failCommit = false;
  function merge(a: Record<string,unknown>,b:Record<string,unknown>):Record<string,unknown> {
    const out = {...a};
    for (const [key,value] of Object.entries(b)) out[key] = value && typeof value==='object' && !Array.isArray(value) ? merge((a[key] ?? {}) as Record<string,unknown>,value as Record<string,unknown>) : value;
    return out;
  }
  const snap = (path:string) => ({ exists:docs.has(path), data:() => structuredClone(docs.get(path)) });
  let queue = Promise.resolve();
  const db = {
    doc:(path:string) => ({ path, get:async () => { if (failRead) { failRead = false; throw new Error('Storage unavailable'); } return snap(path); } }),
    collection:(name:string) => ({ where:(field:string,_operator:string,value:unknown) => ({ get:async () => { const matches=[...docs].filter(([path,data]) => path.startsWith(name+'/') && !path.slice(name.length+1).includes('/') && (data as Record<string,unknown>)[field]===value).map(([path]) => ({id:path.slice(name.length+1),...snap(path)})); return {docs:matches,size:matches.length}; } }) }),
    runTransaction:<T>(run:(tx:unknown)=>Promise<T>) => {
      const result = queue.then(async () => {
        const writes:Array<()=>void> = [];
        const value = await run({ get:async (ref:{path:string}) => { assert.equal(writes.length,0); return snap(ref.path); },
          set:(ref:{path:string},value:Record<string,unknown>,options?:{merge:boolean}) => writes.push(() => docs.set(ref.path,structuredClone(options?.merge ? merge((docs.get(ref.path) ?? {}) as Record<string,unknown>,value) : value))) });
        if (failCommit) { failCommit=false; throw new Error('Write unavailable'); }
        writes.forEach(write=>write()); return value;
      });
      queue = result.then(()=>{},()=>{}); return result;
    }
  };
  return { docs, db:db as unknown as FirebaseFirestore.Firestore, failRead:()=>{failRead=true;}, failCommit:()=>{failCommit=true;} };
}
const today=Date.parse('2026-10-25T12:00:00Z');
function setup(profile?:object){const store=database(profile?{'users/u':profile}:{});let time=today;return {...store,deps:{db:store.db,now:()=>time},advance:(ms:number)=>{time+=ms;}};}
test('guests must watch an ad; reading access information consumes nothing',async()=>{
 const s=setup(),actor={guestId:'g'};
 assert.deepEqual(await accessInfo(actor,'aries',s.deps),{day:'2026-10-25',tier:'guest',freeLeft:0,unlocked:false});
 await assert.rejects(openFreeAccess(actor,'aries',s.deps),{code:'AD_REQUIRED',status:402});
 assert.equal(s.docs.size,0);
});
test('concurrent requests allow one free distinct sign for members, repeat reading and language changes cost nothing',async()=>{
 const s=setup(),actor={uid:'u'};
 const results=await Promise.allSettled(SIGNS.map(sign=>openFreeAccess(actor,sign,s.deps)));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 for(let i=0;i<20;i++)await openFreeAccess(actor,'aries',s.deps);
 assert.equal((await accessInfo(actor,'aries',s.deps)).freeLeft,0);
 assert.equal((await accessInfo(actor,'aries',s.deps)).unlocked,true);
 assert.equal((await accessInfo(actor,'taurus',s.deps)).unlocked,false);
 s.advance(86400000);assert.equal((await accessInfo(actor,'aries',s.deps)).freeLeft,1);
 assert.equal((await accessInfo(actor,'aries',s.deps)).unlocked,false);
 await openFreeAccess(actor,'taurus',s.deps);
});
test('subscribers receive three signs; expired subscriptions receive one; cancelled access lasts until expiry',async()=>{
 for(const profile of [{subscriptionStatus:'active'},{subscriptionStatus:'trial'},{subscriptionStatus:'cancelled',accessUntilMs:today+60000}]){
  const s=setup(profile),actor={uid:'u'};
  const results=await Promise.allSettled(SIGNS.map(sign=>openFreeAccess(actor,sign,s.deps)));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,3);
  assert.equal((await accessInfo(actor,'aries',s.deps)).freeLeft,0);
 }
 const s=setup({subscriptionStatus:'cancelled',accessUntilMs:today-1});
 assert.equal((await accessInfo({uid:'u'},'aries',s.deps)).tier,'member');
 assert.equal((await accessInfo({uid:'u'},'aries',s.deps)).freeLeft,1);
});
test('an ad challenge opens exactly its sign, stays idempotent, and does not spend free access',async()=>{
 const s=setup(),actor={uid:'u'},other={uid:'someone-else'};
 const {challenge}=await startHoroscopeAd(actor,'cancer','bucket',s.deps);
 assert.equal((await accessInfo(actor,'cancer',s.deps)).unlocked,false);
 await assert.rejects(completeHoroscopeAd(other,challenge,s.deps),{code:'AD_CHALLENGE_INVALID'});
 await Promise.all(Array.from({length:10},()=>completeHoroscopeAd(actor,challenge,s.deps)));
 assert.equal((await accessInfo(actor,'cancer',s.deps)).unlocked,true);
 assert.equal((await accessInfo(actor,'leo',s.deps)).unlocked,false);
 assert.equal((await accessInfo(actor,'leo',s.deps)).freeLeft,1);
 assert.ok(s.docs.has(entitlementPath(subjectOf(actor),'2026-10-25','cancer')));
 await assert.rejects(startHoroscopeAd(actor,'cancer','bucket',s.deps),{code:'ALREADY_UNLOCKED'});
});
test('ad challenges expire after ten minutes and never cross the UTC day; admission is bounded',async()=>{
 const s=setup(),actor={guestId:'g'};
 const {challenge}=await startHoroscopeAd(actor,'aries','b',s.deps);
 s.advance(600001);await assert.rejects(completeHoroscopeAd(actor,challenge,s.deps),{code:'AD_CHALLENGE_INVALID'});
 for(let i=0;i<5;i++)await startHoroscopeAd(actor,'aries','b',s.deps);
 await assert.rejects(startHoroscopeAd(actor,'aries','b',s.deps),{code:'RATE_LIMITED'});
 const t=setup();t.advance(12*3600000-1000);
 const late=await startHoroscopeAd(actor,'aries','b',t.deps);t.advance(1001);
 await assert.rejects(completeHoroscopeAd(actor,late.challenge,t.deps),{code:'AD_CHALLENGE_INVALID'});
});
test('access cookies bind signed capabilities to signs and UTC day and reject tampering',()=>{
 const original=process.env.CRON_SECRET;process.env.CRON_SECRET='test-only-secret';
 try{
  const day=new Date().toISOString().slice(0,10),subject=subjectOf({uid:'u'});
  const one=createAccessPass(subject,day,'aries'),two=createAccessPass(subject,day,'cancer',one);
  assert.deepEqual(readAccessPass(two)?.signs,['aries','cancer']);
  assert.equal(readAccessPass(two+'x'),null);
  assert.equal(readAccessPass(two,Date.parse(day)+86400000),null);
  assert.equal(readAccessPass(createAccessPass(subjectOf({uid:'other'}),day,'leo',two))?.signs.length,1);
  assert.equal(requestHasHoroscopeAccess(new Request('http://localhost',{headers:{cookie:`dreamly_horoscope_access=${two}`}}),'cancer'),true);
  assert.equal(requestHasHoroscopeAccess(new Request('http://localhost',{headers:{cookie:`dreamly_horoscope_access=${two}`}}),'leo'),false);
  process.env.CRON_SECRET='';assert.equal(readAccessPass(two),null);
 }finally{if(original===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=original;}
});
test('protected server reads and generation/status API check access before storage or queue use',()=>{
 const store=readFileSync('lib/horoscope/store.ts','utf8');
 assert.ok(store.indexOf('!await canReadForecast(sign)')<store.indexOf('await readStored'));
 assert.ok(!store.includes('readAvailable'));
 const route=readFileSync('app/api/horoscope/request/route.ts','utf8');
 assert.equal((route.match(/if \(!requestHasHoroscopeAccess/g)||[]).length,2);
 const ad=readFileSync('app/ad/unlock/AdUnlockClient.tsx','utf8');
 assert.ok(ad.includes('kind === "horoscope" && !entitled ? "failed"'));
 assert.ok(ad.includes('kind !== "analysis") return;')); // horoscope never receives no-fill fallback
 const endpoint=readFileSync('app/api/horoscope/ad/route.ts','utf8');
 assert.ok(endpoint.indexOf("if(!cookieFromRequest(request,'FCOEC'))")<endpoint.indexOf('await completeHoroscopeAd'));
 for(const locale of LOCALES)for(const value of Object.values(horoscopeAccess[locale]))assert.ok(value.length>0);
});
