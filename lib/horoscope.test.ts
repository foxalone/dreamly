import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Body, Ecliptic, GeoVector, Seasons, SearchMoonPhase } from 'astronomy-engine';
import { aspectBetween, calculateSky, signedMotion, zodiacAt } from './horoscope/astronomy';
import { FIELDS, SIGNS, referenceTime, utcDay, validateGeneratedReadings, validateLocalizedReadings, validateReadings, type Readings } from './horoscope/model';
import { selectForecast, type Forecast } from './horoscope/cache';
import { generateReading } from './horoscope/generate';
import { requestReading, processJob, processRequested, drainRequestedJobs, getReadingStatus, validateRequest, MAX_ATTEMPTS, DAILY_ATTEMPT_LIMIT, expediteRetry, type Dependencies } from './horoscope/jobs';
import { jobId, readingPath, readStored, readAvailable, versionOf, type StoredReading } from './horoscope/persistence';
import { publicRequestBucket } from './horoscope/security';
import { LOCALES, localeDir, type Locale } from './i18n/config';
import { horoscopeCopy, horoscopeDate } from './i18n/horoscope';
import { listPublicPages } from './publicPages';
import { localeMetadata } from './i18n/page-locale';
import { requireCronSecret } from '../app/api/admin/_lib/gsc';
import type OpenAI from 'openai';

// Deliberately repetitive, labeled test fixtures; never published or used as fallback.
function readings(locale: Locale = 'en'): Readings {
  const prose = {
    en: 'Today you can pause and reflect on your plans with a little care and give yourself the time to listen.',
    es: 'Hoy puedes mirar tus planes con calma y escuchar lo que necesitas para cuidar tu tiempo y tu energía diaria.',
    ar: 'يمكنك اليوم التأمل في خططك بهدوء والاستماع إلى احتياجاتك مع الاهتمام بوقتك وطاقتك وترك مساحة للتواصل والراحة والتفكير قبل أي خطوة.',
    pt: 'Hoje você pode olhar seus planos com calma e ouvir o que precisa para cuidar do seu tempo e da sua energia.',
    de: 'Heute kannst du deine Pläne mit Ruhe betrachten und dir die Zeit nehmen die du für deine Gedanken und deine Erholung brauchst.',
    ru: 'Сегодня можно спокойно обдумать свои планы и прислушаться к себе чтобы найти время для отдыха общения и небольшого шага к ясности.',
  }[locale];
  const title = {en:'A thoughtful moment for your day', es:'Un momento de calma para hoy', ar:'لحظة تأمل هادئة في هذا اليوم', pt:'Um momento de calma para hoje', de:'Ein ruhiger Moment für deinen Tag', ru:'Спокойное время для размышлений о дне'}[locale];
  return Object.fromEntries(SIGNS.map((sign,index) => [sign, {
    ...Object.fromEntries(FIELDS.map(field => [field, field === 'general' ? `${index + 1}. ${Array(3).fill(prose).join(' ')}\n\n${Array(3).fill(prose).join(' ')}` : `${index + 1}. ${prose}`])), headline: title,
  }])) as Readings;
}
function forecast(day = '2026-10-25'): Forecast {
  return { day, publishedAt:`${day}T00:05:00Z`, version:1, complete:true, sky:calculateSky(day), locales:Object.fromEntries(LOCALES.map(l => [l,readings(l)])) as Forecast['locales'] };
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
  assert.deepEqual(selectForecast(today.day,today),{ forecast:today,stale:false });
  assert.deepEqual(selectForecast(today.day,previous),{ forecast:null,stale:false });
  assert.deepEqual(selectForecast(today.day,{ complete:false }),{ forecast:null,stale:false });
  assert.equal(selectForecast(today.day,forecast('2026-10-26')).forecast,null);
  assert.equal(selectForecast(today.day,{...today,locales:{en:readings()}}).forecast,null);
  assert.equal(selectForecast(today.day,null).forecast,null);
  assert.equal(selectForecast(today.day,{...today,sky:{day:today.day}}).forecast,null);
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
function api(failArabic = false) {
  const calls:string[] = [];
  const client = { chat:{ completions:{ create:async (request:{messages:Array<{content:string}>; response_format:{json_schema:{schema:{required:string[]}}}}) => {
    const prompt = request.messages[0].content; calls.push(prompt);
    if (failArabic && prompt.includes('Modern Standard Arabic')) throw new Error('Provider unavailable');
    const locale: Locale = prompt.includes('Modern Standard Arabic') ? 'ar' : prompt.includes('Latin American Spanish') ? 'es' : prompt.includes('Brazilian Portuguese') ? 'pt' : prompt.includes('Standard German') ? 'de' : prompt.includes('natural literary Russian') ? 'ru' : 'en';
    const data = readings(locale);
    return { choices:[{ finish_reason:'stop',message:{content:JSON.stringify(Object.fromEntries(request.response_format.json_schema.schema.required.map(sign => [sign, data[sign as keyof Readings]])))} }] };
  } } } } as unknown as OpenAI;
  return { client,calls };
}
test('new AI editions require a localized headline, 100–160 words, exact signs and safe prose', () => {
  for (const locale of LOCALES) assert.doesNotThrow(() => validateGeneratedReadings(readings(locale), locale, locale === 'en' ? undefined : readings()));
  const noHeadline = readings(); delete noHeadline.aries.headline;
  assert.throws(() => validateGeneratedReadings(noHeadline, 'en'), /headline/);
  const short = readings(); short.aries.general = 'A short but incomplete horoscope reading for a quiet day.';
  assert.throws(() => validateGeneratedReadings(short, 'en'), /word count/);
  const wrongSign = readings() as unknown as Record<string, unknown>; wrongSign.ophiuchus = wrongSign.aries; delete wrongSign.aries;
  assert.throws(() => validateGeneratedReadings(wrongSign, 'en'), /sign/);
  const duplicate = readings(); duplicate.taurus.general = duplicate.aries.general;
  assert.throws(() => validateGeneratedReadings(duplicate, 'en'), /Repeated/);
  for (const locale of LOCALES.filter(l => l !== 'en')) assert.throws(() => validateGeneratedReadings(readings(), locale));
  assert.throws(() => validateGeneratedReadings(readings(), 'es', readings()), /Untranslated/);
  const html = readings(); html.aries.headline = '<script>unsafe headline</script>';
  assert.throws(() => validateGeneratedReadings(html, 'en'), /headline/);
  // Valid historical seven-field editions are preserved without invented headings.
  for (const sign of SIGNS) delete noHeadline[sign].headline;
  assert.doesNotThrow(() => validateReadings(noHeadline));
  assert.doesNotThrow(() => validateLocalizedReadings(noHeadline, 'en'));
  assert.throws(() => validateLocalizedReadings(noHeadline, 'es', noHeadline), /Untranslated/);
});

const DAY = '2026-10-25';
const NOW = Date.parse(`${DAY}T15:00:00Z`);
const jobPath = (locale: Locale = 'en', sign = 'leo', day = DAY) => `horoscope_jobs/${day}_${sign}_${locale}`;
function setup(initial: Record<string, object> = {}) {
  const storage = database(initial), model = api(); let time = NOW;
  const dependencies: Dependencies = { db: storage.db, client: model.client, now: () => time };
  return { ...storage, ...model, dependencies, advance: (ms: number) => { time += ms; }, setTime: (ms: number) => { time = ms; } };
}
function stored(locale: Locale = 'en', sign: typeof SIGNS[number] = 'leo'): StoredReading {
  const master = readings().leo;
  return { day: DAY, sign, locale, reading: readings(locale)[sign], astronomySnapshot: calculateSky(DAY), generatedAt: `${DAY}T00:05:00Z`, masterVersion: versionOf(master) };
}

test('first visitor creates a durable requested-sign job; second visitor reuses it with no AI work in initiation', async () => {
  const s = setup();
  assert.equal((await requestReading('leo','en','test',s.dependencies)).status,'queued');
  assert.equal((await requestReading('leo','en','test',s.dependencies)).status,'queued');
  assert.deepEqual([...s.docs.keys()].filter(key=>key.startsWith('horoscope_jobs/')), [jobPath()]);
  assert.equal(s.calls.length,0);
  await processRequested(DAY,'leo','en',s.dependencies);
  assert.equal(s.calls.length,1);
  assert.equal((await getReadingStatus('leo','en',s.dependencies)).status,'ready');
  assert.equal((await requestReading('leo','en','test',s.dependencies)).status,'ready');
  await processRequested(DAY,'leo','en',s.dependencies);
  assert.equal(s.calls.length,1);
});

test('twenty concurrent visitors and workers generate exactly one English master', async () => {
  const s = setup();
  await Promise.all(Array.from({length:20},(_,i)=>requestReading('leo','en',`test${i}`,s.dependencies)));
  await Promise.all(Array.from({length:20},()=>processRequested(DAY,'leo','en',s.dependencies)));
  assert.equal(s.calls.length,1);
  assert.equal((s.docs.get(jobPath()) as { attempts:number }).attempts,1);
  assert.deepEqual((await readStored(s.db,DAY,'leo','en'))?.reading,readings().leo);
});

test('100 Russian visitors share one master and one translation; Spanish reuses that same master', async () => {
  const s = setup();
  await Promise.all(Array.from({length:100},(_,i)=>requestReading('sagittarius','ru',`test${i}`,s.dependencies)));
  await Promise.all(Array.from({length:20},()=>processRequested(DAY,'sagittarius','ru',s.dependencies)));
  // A translation may wait for the winning master worker. Durable draining completes it.
  await drainRequestedJobs(s.dependencies);
  assert.equal(s.calls.length,2);
  assert.equal((await getReadingStatus('sagittarius','ru',s.dependencies)).status,'ready');
  await requestReading('sagittarius','es','test',s.dependencies);
  await processRequested(DAY,'sagittarius','es',s.dependencies);
  assert.equal(s.calls.length,3);
  await requestReading('sagittarius','ru','another',s.dependencies);
  assert.equal(s.calls.length,3);
  const paths=[...s.docs.keys()].filter(key=>key.startsWith('daily_horoscopes/'));
  assert.equal(paths.length,3);
  assert.ok(paths.every(path=>path.includes('/sagittarius/')));
  assert.ok(!paths.some(path=>path.endsWith('/de')||path.endsWith('/ar')||path.endsWith('/pt')));
});

test('stored and legacy seven-field readings are reused independently of the other signs/languages', async () => {
  const legacy = readings('ru'); for(const sign of SIGNS) delete legacy[sign].headline;
  const s = setup({[`daily_horoscopes/${DAY}`]: { day:DAY, locales:{ru:{leo:legacy.leo}}, sky:calculateSky(DAY), publishedAt:`${DAY}T00:05:00Z` }});
  assert.equal((await requestReading('leo','ru','test',s.dependencies)).status,'ready');
  assert.equal(s.calls.length,0); assert.ok(!s.docs.has(jobPath('ru')));
  assert.equal((await readStored(s.db,DAY,'leo','en')),null); // Never substitute English for Russian or vice versa.
  const fresh=setup({[readingPath(DAY,'leo','en')]:stored()});
  assert.equal((await requestReading('leo','en','test',fresh.dependencies)).status,'ready');
  assert.equal(fresh.calls.length,0);
});

test('expired leases recover and an active lease skips generation', async () => {
  const s=setup(); await requestReading('leo','en','test',s.dependencies);
  const original=s.docs.get(jobPath())!;
  s.docs.set(jobPath(),{...original,owner:'crashed',status:'processing',leaseUntil:NOW+1000,attempts:1});
  assert.equal(await processJob(jobId(DAY,'leo','en'),s.dependencies),'not-claimed');
  s.advance(1001);
  assert.equal(await processJob(jobId(DAY,'leo','en'),s.dependencies),'ready');
  assert.equal(s.calls.length,1);
  assert.equal((s.docs.get(jobPath()) as {attempts:number}).attempts,2);
});

test('stale worker cannot overwrite a newer completed result or job owner', async () => {
  const s=setup(); await requestReading('leo','en','test',s.dependencies);
  let release!:()=>void, entered!:()=>void;
  const waiting=new Promise<void>(resolve=>{release=resolve;}), started=new Promise<void>(resolve=>{entered=resolve;});
  const original=s.client.chat.completions.create.bind(s.client.chat.completions);
  const client={chat:{completions:{create:async(request:never)=>{entered(); await waiting; return original(request);}}}} as unknown as OpenAI;
  const pending=processJob(jobId(DAY,'leo','en'),{...s.dependencies,client});
  await started;
  const newer=stored(); newer.reading={...newer.reading,headline:'A newer completed reading for today'};
  s.docs.set(readingPath(DAY,'leo','en'),newer);
  s.docs.set(jobPath(),{...s.docs.get(jobPath()),owner:'new-worker',status:'ready',leaseUntil:NOW+200000});
  release();
  assert.equal(await pending,'stale-worker');
  assert.deepEqual(s.docs.get(readingPath(DAY,'leo','en')),newer);
  assert.equal((s.docs.get(jobPath()) as {owner:string}).owner,'new-worker');
});

test('translation failure preserves master, backs off, and retries only the requested translation', async () => {
  const s=setup(); await requestReading('leo','ar','test',s.dependencies);
  const failing=api(true);
  await processRequested(DAY,'leo','ar',{...s.dependencies,client:failing.client});
  const master=await readStored(s.db,DAY,'leo','en'); assert.ok(master);
  assert.equal((await getReadingStatus('leo','ar',s.dependencies)).status,'retrying');
  await processRequested(DAY,'leo','ar',s.dependencies); assert.equal(s.calls.length,0);
  s.advance(60001);
  await processRequested(DAY,'leo','ar',s.dependencies);
  assert.equal(s.calls.length,1);
  assert.deepEqual(await readStored(s.db,DAY,'leo','en'),master);
  assert.equal((await getReadingStatus('leo','ar',s.dependencies)).status,'ready');
});

test('provider failures, malformed JSON, refusal and truncation persist bounded retry state without fabricated content', async () => {
  for(const response of [new Error('Timeout'), {finish_reason:'stop',message:{content:'{bad-json'}}, {finish_reason:'length',message:{content:'{}'}}, {finish_reason:'stop',message:{refusal:'refused',content:'{}'}}]) {
    const s=setup(); await requestReading('leo','en','test',s.dependencies);
    let calls=0;
    const client={chat:{completions:{create:async()=>{calls++; if(response instanceof Error) throw response; return {choices:[response]};}}}} as unknown as OpenAI;
    for(let i=0;i<MAX_ATTEMPTS;i++) {await processRequested(DAY,'leo','en',{...s.dependencies,client});s.advance(5*60000);}
    await requestReading('leo','en','test',s.dependencies);
    await processRequested(DAY,'leo','en',{...s.dependencies,client});
    assert.equal(calls,MAX_ATTEMPTS);
    assert.equal((await getReadingStatus('leo','en',s.dependencies)).status,'failed');
    assert.equal(await readStored(s.db,DAY,'leo','en'),null);
    assert.ok((s.docs.get(jobPath()) as {error:unknown}).error);
  }
});

test('Firestore claim failure makes no AI calls; completion failure leaves a recoverable failed job', async () => {
  const s=setup(); await requestReading('leo','en','test',s.dependencies);
  s.failCommit(); await assert.rejects(processJob(jobId(DAY,'leo','en'),s.dependencies),/Write unavailable/);
  assert.equal(s.calls.length,0);
  const original=s.client.chat.completions.create.bind(s.client.chat.completions);
  const client={chat:{completions:{create:async(request:never)=>{const result=await original(request);s.failCommit();return result;}}}} as unknown as OpenAI;
  assert.equal(await processJob(jobId(DAY,'leo','en'),{...s.dependencies,client}),'failed');
  assert.equal((s.docs.get(jobPath()) as {status:string}).status,'failed');
  assert.equal(await readStored(s.db,DAY,'leo','en'),null);
  s.advance(60001); await processRequested(DAY,'leo','en',s.dependencies);
  assert.equal((await getReadingStatus('leo','en',s.dependencies)).status,'ready');
  s.failRead(); await assert.rejects(requestReading('virgo','en','test',s.dependencies),/Storage unavailable/);
});

test('date rollover creates only a new requested-date job and leaves previous dates intact', async () => {
  const s=setup();s.setTime(Date.parse(`${DAY}T23:59:59Z`));
  await requestReading('leo','en','test',s.dependencies);
  await processRequested(DAY,'leo','en',s.dependencies);
  const previous=s.docs.get(readingPath(DAY,'leo','en'));
  s.advance(2000);
  assert.equal((await requestReading('leo','en','test',s.dependencies)).day,'2026-10-26');
  assert.equal(await processJob(jobId(DAY,'leo','en'),s.dependencies),'expired-date');
  await processRequested('2026-10-26','leo','en',s.dependencies);
  assert.deepEqual(s.docs.get(readingPath(DAY,'leo','en')),previous);
  assert.ok(s.docs.has(readingPath('2026-10-26','leo','en')));
});

test('public initiation is rate limited and global provider attempt budget is atomic', async () => {
  const s=setup();
  for(let i=0;i<30;i++) await requestReading('leo','en','same-network',s.dependencies);
  await assert.rejects(requestReading('leo','en','same-network',s.dependencies),{status:429});
  s.advance(60001); assert.equal((await requestReading('leo','en','same-network',s.dependencies)).status,'queued');
  s.docs.set(`horoscope_usage/${DAY}`,{attempts:DAILY_ATTEMPT_LIMIT});
  await processRequested(DAY,'leo','en',s.dependencies);
  assert.equal(s.calls.length,0); assert.equal((s.docs.get(jobPath()) as {status:string}).status,'exhausted');
});

test('polling is read-only; worker drain processes only persisted requests and survives the initiating client leaving', async () => {
  const s=setup(); await requestReading('leo','ru','test',s.dependencies);
  const before=structuredClone([...s.docs]);
  for(let i=0;i<5;i++) await getReadingStatus('leo','ru',s.dependencies);
  assert.deepEqual([...s.docs],before); assert.equal(s.calls.length,0);
  await drainRequestedJobs(s.dependencies);
  assert.equal((await getReadingStatus('leo','ru',s.dependencies)).status,'ready');
  assert.equal(s.calls.length,2);
  await drainRequestedJobs(s.dependencies); assert.equal(s.calls.length,2);
  assert.equal((await getReadingStatus('virgo','de',s.dependencies)).status,'missing');
});

test('public input forbids prompts, dates, unsupported signs and locales; origin protection fails closed', () => {
  for(const input of [{sign:'leo',locale:'en',day:DAY},{sign:'leo',locale:'en',prompt:'anything'},{sign:'snake',locale:'en'},{sign:'leo',locale:'he'},null]) assert.throws(()=>validateRequest(input));
  const request=(origin:string)=>new Request('https://dreamly.art/api/horoscope/request',{method:'POST',headers:{origin,'x-horoscope-request':'1','x-vercel-forwarded-for':'192.0.2.1'}});
  assert.throws(()=>publicRequestBucket(request('https://evil.example'),{CRON_SECRET:'test'}),{status:403});
  assert.throws(()=>publicRequestBucket(request('https://dreamly.art'),{}),{status:503});
  const bucket=publicRequestBucket(request('https://dreamly.art'),{CRON_SECRET:'test',VERCEL:'1'});
  assert.match(bucket,/^[a-f0-9]{32}$/);assert.ok(!bucket.includes('192.0.2.1'));
});

test('worker authentication remains secret-protected and the old bulk schedule is disabled', t => {
  const secret=process.env.CRON_SECRET;t.after(()=>{if(secret===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=secret;});
  delete process.env.CRON_SECRET;
  assert.throws(()=>requireCronSecret(new Request('https://dreamly.art/api/cron/horoscope-worker')),/not configured/);
  process.env.CRON_SECRET='test-secret';
  assert.throws(()=>requireCronSecret(new Request('https://dreamly.art/api/cron/horoscope-worker')),/UNAUTHENTICATED/);
  assert.doesNotThrow(()=>requireCronSecret(new Request('https://dreamly.art/api/cron/horoscope-worker',{headers:{authorization:'Bearer test-secret'}})));
  const config=JSON.parse(readFileSync('vercel.json','utf8'));
  assert.ok(!config.crons.some((job:{path:string})=>job.path==='/api/cron/horoscope'));
  assert.deepEqual(config.crons.find((job:{path:string})=>job.path==='/api/cron/horoscope-worker'),{path:'/api/cron/horoscope-worker',schedule:'*/5 * * * *'});
  assert.ok(readFileSync('app/api/cron/horoscope/route.ts','utf8').includes("status: 'retired'"));
});

test('both horoscope models use GPT-5 mini; requests carry only one sign and computed sky or its master', async () => {
  const {HOROSCOPE_MODEL,HOROSCOPE_TRANSLATE_MODEL,TRANSLATE_MODEL}=await import('./aiModels');
  assert.equal(HOROSCOPE_MODEL,'gpt-5-mini');assert.equal(HOROSCOPE_TRANSLATE_MODEL,'gpt-5-mini');assert.equal(TRANSLATE_MODEL,'gpt-5-nano');
  const observed:Array<{model:string;messages:Array<{content:string}>;response_format:{json_schema:{schema:{required:string[]}}}}>=[];
  const original=api().client.chat.completions.create;
  const client={chat:{completions:{create:async(request:typeof observed[number])=>{observed.push(request);return original(request as never);}}}} as unknown as OpenAI;
  const master=await generateReading(DAY,'leo','en',calculateSky(DAY),undefined,client);
  await generateReading(DAY,'leo','ru',calculateSky(DAY),master.reading,client);
  assert.deepEqual(observed[0].response_format.json_schema.schema.required,['leo']);
  assert.deepEqual(JSON.parse(observed[0].messages[1].content).sky,calculateSky(DAY));
  assert.deepEqual(JSON.parse(observed[1].messages[1].content).readings,{leo:master.reading});
});

test('admin recovery expedites failure and grants at most one extra attempt without resetting quotas', async () => {
  const s=setup(); await requestReading('leo','en','test',s.dependencies);
  s.docs.set(jobPath(),{...s.docs.get(jobPath()),status:'failed',attempts:1,nextAttemptAt:NOW+60000});
  await expediteRetry(jobId(DAY,'leo','en'),s.dependencies);
  assert.equal((s.docs.get(jobPath()) as {nextAttemptAt:number}).nextAttemptAt,NOW);
  assert.equal((s.docs.get(jobPath()) as {attempts:number}).attempts,1);
  s.docs.set(jobPath(),{...s.docs.get(jobPath()),status:'exhausted',attempts:MAX_ATTEMPTS});
  await expediteRetry(jobId(DAY,'leo','en'),s.dependencies);
  assert.equal((s.docs.get(jobPath()) as {attempts:number}).attempts,MAX_ATTEMPTS);
  assert.equal((s.docs.get(jobPath()) as {manualRecoveryGranted:boolean}).manualRecoveryGranted,true);
  s.docs.set(jobPath(),{...s.docs.get(jobPath()),status:'exhausted',attempts:MAX_ATTEMPTS+1});
  await assert.rejects(expediteRetry(jobId(DAY,'leo','en'),s.dependencies),{status:409});
  s.docs.set(`horoscope_usage/${DAY}`,{attempts:DAILY_ATTEMPT_LIMIT});
  await assert.rejects(expediteRetry(jobId(DAY,'leo','en'),s.dependencies),{status:429});
});


test('landing previews discover completed requested combinations without creating new jobs or requiring all languages', async () => {
  const s=setup(); await requestReading('leo','ru','test',s.dependencies);
  await processRequested(DAY,'leo','ru',s.dependencies);
  const before=structuredClone([...s.docs]);
  const available=await readAvailable(s.db,DAY,'ru');
  assert.equal(available.length,1);assert.equal(available[0].sign,'leo');
  assert.deepEqual(available[0].reading,readings('ru').leo);
  assert.equal((await readAvailable(s.db,DAY,'es')).length,0);
  assert.deepEqual([...s.docs],before);assert.equal(s.calls.length,2);
});


test('worker awaits independent jobs when one storage read fails, then recovers the queued request', async () => {
  const s=setup();
  await requestReading('leo','en','test',s.dependencies);
  await requestReading('virgo','en','test',s.dependencies);
  s.failRead();
  await drainRequestedJobs(s.dependencies);
  assert.equal((await getReadingStatus('virgo','en',s.dependencies)).status,'ready');
  assert.equal((await getReadingStatus('leo','en',s.dependencies)).status,'queued');
  await drainRequestedJobs(s.dependencies);
  assert.equal((await getReadingStatus('leo','en',s.dependencies)).status,'ready');
  assert.equal(s.calls.length,2);
});


test('same-origin localhost normalization accepts the real Host but rejects a different browser origin', () => {
  const request = (origin: string) => new Request('http://localhost:3117/api/horoscope/request', { method: 'POST', headers: { host: '127.0.0.1:3117', origin, 'x-horoscope-request': '1' } });
  assert.match(publicRequestBucket(request('http://127.0.0.1:3117'), { CRON_SECRET: 'test' }), /^[a-f0-9]{32}$/);
  assert.throws(() => publicRequestBucket(request('http://localhost:3117'), { CRON_SECRET: 'test' }), { status: 403 });
});

test('validation failures record safe field diagnostics while provider secrets never enter stored errors', async () => {
  const invalid=readings(); invalid.leo.general='This deliberately short fixture must fail the general forecast length check.';
  const s=setup(); await requestReading('leo','en','test',s.dependencies);
  const client={chat:{completions:{create:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify({leo:invalid.leo})}}]})}}} as unknown as OpenAI;
  assert.equal(await processJob(jobId(DAY,'leo','en'),{...s.dependencies,client}),'failed');
  const failure=(s.docs.get(jobPath()) as {error:{code:string;reason:string}}).error;
  assert.equal(failure.code,'READING_VALIDATION'); assert.match(failure.reason,/Invalid leo\.general word count: \d+/);
  assert.ok(!JSON.stringify(failure).includes('deliberately short fixture'));
  const other=setup(); await requestReading('leo','en','test',other.dependencies);
  const provider={chat:{completions:{create:async()=>{throw new Error('private-provider-message-secret');}}}} as unknown as OpenAI;
  await processJob(jobId(DAY,'leo','en'),{...other.dependencies,client:provider});
  assert.ok(!JSON.stringify(other.docs.get(jobPath())).includes('private-provider-message-secret'));
  assert.ok(!('error' in await getReadingStatus('leo','en',s.dependencies)));
});
