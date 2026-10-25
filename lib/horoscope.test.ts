import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Body, Ecliptic, GeoVector, Seasons, SearchMoonPhase } from 'astronomy-engine';
import { aspectBetween, calculateSky, signedMotion, zodiacAt } from './horoscope/astronomy';
import { FIELDS, SIGNS, referenceTime, utcDay, validateReadings, type Readings } from './horoscope/model';
import { selectForecast, type Forecast } from './horoscope/cache';
import { generateDailyHoroscope } from './horoscope/generate';
import { LOCALES, localeDir } from './i18n/config';
import { horoscopeCopy, horoscopeDate } from './i18n/horoscope';
import { listPublicPages } from './publicPages';
import { localeMetadata } from './i18n/page-locale';
import { requireCronSecret } from '../app/api/admin/_lib/gsc';
import type OpenAI from 'openai';

function readings(): Readings {
  return Object.fromEntries(SIGNS.map(sign => [sign, Object.fromEntries(FIELDS.map(field => [field, `${sign} ${field}: pause and reflect on a practical step you can take today.`]))])) as Readings;
}
function forecast(day = '2026-10-25'): Forecast {
  return { day, publishedAt:`${day}T00:05:00Z`, version:1, complete:true, sky:calculateSky(day), locales:Object.fromEntries(LOCALES.map(l => [l,readings()])) as Forecast['locales'] };
}
test('tropical signs include every boundary, negative values and longitude wraparound', () => {
  for (let i=0;i<12;i++) {
    assert.equal(zodiacAt(i*30).sign,SIGNS[i]);
    assert.equal(zodiacAt(i*30 + 29.99999).sign,SIGNS[i]);
    assert.equal(zodiacAt(i*30 + 360).degree,0);
  }
  assert.equal(zodiacAt(360).sign,'aries');
  assert.equal(zodiacAt(-0.01).sign,'pisces');
  assert.throws(() => zodiacAt(NaN));
  assert.equal(signedMotion(359,1),2);
  assert.equal(signedMotion(1,359),-2);
});
test('aspects use shortest angular separation and a six-degree inclusive orb', () => {
  assert.equal(aspectBetween(359,1)?.name,'conjunction');
  for (const [angle,name] of [[60,'sextile'],[90,'square'],[120,'trine'],[180,'opposition']] as const) assert.equal(aspectBetween(0,angle)?.name,name);
  assert.equal(aspectBetween(0,66)?.orb,6);
  assert.equal(aspectBetween(0,66.001),null);
});
test('UTC reference time is stable across time zones and rejects invalid dates', () => {
  assert.equal(utcDay(new Date('2026-10-25T01:00:00+03:00')),'2026-10-24');
  assert.equal(referenceTime('2026-10-25').toISOString(),'2026-10-25T12:00:00.000Z');
  assert.throws(() => referenceTime('2026-02-30'));
  assert.throws(() => referenceTime('2026-2-01'));
});
test('Sun longitude agrees with the equinox, Moon phase agrees with a full moon event', () => {
  const equinox = Seasons(2026).mar_equinox.date;
  const longitude = Ecliptic(GeoVector(Body.Sun,equinox,true)).elon;
  assert.ok(Math.abs(signedMotion(0,longitude)) < .02);
  const full = SearchMoonPhase(180,new Date('2026-10-01T00:00:00Z'),35)!;
  const sky = calculateSky(utcDay(full.date));
  assert.ok(Math.abs(sky.moon.phase-180) < 8, 'daily noon is within a day of the full moon');
  assert.ok(sky.moon.illuminated > .99);
});
test('all ten actual geocentric positions are finite; Mercury retrograde works across known intervals', () => {
  for (const day of ['2024-04-10','2024-05-10','2026-10-25']) {
    const sky = calculateSky(day);
    assert.equal(sky.planets.length,10);
    for (const p of sky.planets) {
      assert.ok(p.longitude>=0 && p.longitude<360);
      assert.ok(p.degree>=0 && p.degree<30);
      assert.ok(Number.isFinite(p.dailyMotion));
      assert.equal(p.sign,zodiacAt(p.longitude).sign);
    }
    assert.equal(sky.planets.find(p => p.body==='Sun')?.retrograde,false);
  }
  assert.equal(calculateSky('2024-04-10').planets.find(p => p.body==='Mercury')?.retrograde,true);
  assert.equal(calculateSky('2024-05-10').planets.find(p => p.body==='Mercury')?.retrograde,false);
});
test('cached forecasts never relabel stale dates, partial and future results are rejected', () => {
  const previous = forecast('2026-10-24'), today = forecast();
  assert.deepEqual(selectForecast(today.day,today,previous),{ forecast:today,stale:false });
  assert.deepEqual(selectForecast(today.day,{ complete:false },previous),{ forecast:previous,stale:true });
  assert.equal(selectForecast(today.day,null,forecast('2026-10-26')).forecast,null);
  assert.equal(selectForecast(today.day,{...today,locales:{en:readings()}},null).forecast,null);
  assert.equal(selectForecast(today.day,null,null).forecast,null);
  assert.equal(selectForecast(today.day,{...today,sky:{day:today.day}},null).forecast,null);
  const invalid = readings(); invalid.aries.money = '<script>invalid content</script>';
  assert.throws(() => validateReadings(invalid));
});
test('all six locales have complete native labels, zodiac names, phases and canonical/hreflang routes', () => {
  const pages = listPublicPages().filter(p => /\/horoscope(?:\/|$)/.test(p.url));
  assert.equal(pages.length,78);
  for (const locale of LOCALES) {
    const t = horoscopeCopy[locale];
    assert.equal(Object.keys(t.signs).length,12);
    assert.equal(t.phases.length,8);
    assert.equal(Object.keys(t.planets).length,10);
    assert.ok(horoscopeDate('2026-10-25',locale).length>8);
    for (const sign of SIGNS) {
      assert.ok(t.signs[sign]);
      const metadata = localeMetadata(`/horoscope/${sign}`,locale);
      assert.equal(Object.keys(metadata.alternates.languages).length,7);
      assert.ok(!metadata.alternates.canonical.startsWith('/en'));
      assert.ok(pages.some(p => p.url.endsWith(metadata.alternates.canonical)));
    }
  }
  assert.equal(localeDir('ar'),'rtl');
  assert.ok(/\p{Script=Arabic}/u.test(horoscopeCopy.ar.title));
  assert.ok(/\p{Script=Cyrillic}/u.test(horoscopeCopy.ru.title));
});

function database(initial: Record<string,object> = {}) {
  const docs = new Map(Object.entries(structuredClone(initial)));
  function merge(a: Record<string,unknown>,b:Record<string,unknown>):Record<string,unknown> {
    const out = {...a};
    for (const [key,value] of Object.entries(b)) out[key] = value && typeof value==='object' && !Array.isArray(value) ? merge((a[key] ?? {}) as Record<string,unknown>,value as Record<string,unknown>) : value;
    return out;
  }
  const snap = (path:string) => ({ exists:docs.has(path), data:() => structuredClone(docs.get(path)) });
  let queue = Promise.resolve();
  const db = {
    doc:(path:string) => ({ path, get:async () => snap(path) }),
    runTransaction:<T>(run:(tx:unknown)=>Promise<T>) => {
      const result = queue.then(async () => {
        const writes:Array<()=>void> = [];
        const value = await run({ get:async (ref:{path:string}) => { assert.equal(writes.length,0); return snap(ref.path); },
          set:(ref:{path:string},value:Record<string,unknown>,options?:{merge:boolean}) => writes.push(() => docs.set(ref.path,structuredClone(options?.merge ? merge((docs.get(ref.path) ?? {}) as Record<string,unknown>,value) : value))) });
        writes.forEach(write=>write()); return value;
      });
      queue = result.then(()=>{},()=>{}); return result;
    }
  };
  return { docs, db:db as unknown as FirebaseFirestore.Firestore };
}
function api(failArabic = false) {
  const calls:string[] = [];
  const client = { chat:{ completions:{ create:async (request:{messages:Array<{content:string}>}) => {
    const prompt = request.messages[0].content; calls.push(prompt);
    if (failArabic && prompt.includes('Modern Standard Arabic')) throw new Error('Provider unavailable');
    return { choices:[{ finish_reason:'stop',message:{content:JSON.stringify(readings())} }] };
  } } } } as unknown as OpenAI;
  return { client,calls };
}
test('concurrent cron jobs acquire one lease and publish one six-call batch; reruns make no AI calls', async () => {
  const { db,docs }=database(), {client,calls}=api();
  const results = await Promise.all([generateDailyHoroscope('2026-10-25',{db,client}),generateDailyHoroscope('2026-10-25',{db,client})]);
  assert.deepEqual(results.map(r=>r.status).sort(),['cached-or-running','published']);
  assert.equal(calls.length,6);
  const stored = docs.get('horoscope_publication/latest') as Forecast;
  assert.equal(stored.day,'2026-10-25');
  assert.equal(Object.keys(stored.locales).length,6);
  await generateDailyHoroscope('2026-10-25',{db,client}); assert.equal(calls.length,6);
});
test('failed translations retry, preserve previous publication, and resume only missing languages', async () => {
  const previous=forecast('2026-10-24'), {db,docs}=database({'horoscope_publication/latest':previous});
  const failing=api(true);
  await assert.rejects(generateDailyHoroscope('2026-10-25',{db,client:failing.client}));
  assert.deepEqual(docs.get('horoscope_publication/latest'),previous);
  assert.equal(failing.calls.filter(p=>p.includes('Modern Standard Arabic')).length,2);
  assert.equal((docs.get('daily_horoscopes/2026-10-25') as {leaseUntil:number}).leaseUntil,0);
  const retry=api(); await generateDailyHoroscope('2026-10-25',{db,client:retry.client});
  assert.equal(retry.calls.length,1);
  assert.match(retry.calls[0],/Modern Standard Arabic/);
  assert.equal((docs.get('horoscope_publication/latest') as Forecast).day,'2026-10-25');
});
test('expired leases recover, active leases skip, and older retries cannot replace a newer publication', async () => {
  const {db,docs}=database({'daily_horoscopes/2026-10-25':{leaseUntil:1},'horoscope_publication/latest':forecast('2026-10-26')});
  const {client}=api(); await generateDailyHoroscope('2026-10-25',{db,client});
  assert.equal((docs.get('horoscope_publication/latest') as Forecast).day,'2026-10-26');
  const locked=database({'daily_horoscopes/2026-10-25':{leaseUntil:Date.now()+60000}}), unused=api();
  assert.equal((await generateDailyHoroscope('2026-10-25',{db:locked.db,client:unused.client})).status,'cached-or-running');
  assert.equal(unused.calls.length,0);
});
test('cron rejects missing and invalid secrets before work; one daily UTC schedule is registered', t => {
  const secret=process.env.CRON_SECRET;
  t.after(()=> { if (secret===undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET=secret; });
  delete process.env.CRON_SECRET;
  assert.throws(()=>requireCronSecret(new Request('https://dreamly.art/api/cron/horoscope')),/not configured/);
  process.env.CRON_SECRET='test-only-secret';
  for (const headers of [{} as Record<string,string>,{authorization:'Bearer wrong'}]) assert.throws(()=>requireCronSecret(new Request('https://dreamly.art/api/cron/horoscope',{headers})),/UNAUTHENTICATED/);
  assert.doesNotThrow(()=>requireCronSecret(new Request('https://dreamly.art/api/cron/horoscope',{headers:{authorization:'Bearer test-only-secret'}})));
  const config=JSON.parse(readFileSync('vercel.json','utf8'));
  assert.deepEqual(config.crons.filter((c:{path:string})=>c.path==='/api/cron/horoscope'),[{path:'/api/cron/horoscope',schedule:'5 0 * * *'}]);
});
