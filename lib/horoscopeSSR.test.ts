import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { CosmicForecast, ForecastWaiting } from '../app/horoscope/CosmicForecast';
import { LOCALES } from './i18n/config';
import { horoscopeJobs } from './i18n/horoscope-jobs';
import { horoscopeDesign } from './i18n/horoscope-design';
import type { Reading } from './horoscope/model';

// Presentation fixtures only; generation validation is tested separately.
test('each locale renders stored headline and paragraphs in the initial server HTML', () => {
  for (const locale of LOCALES) {
    const reading = { headline: `Stored headline ${locale}`, general: `Stored paragraph one ${locale}.\n\nStored paragraph two ${locale}.`, explanation: `Stored explanation ${locale}.` } as Reading;
    const html = renderToStaticMarkup(createElement(CosmicForecast, { locale, day: '2026-10-25', selected: true, reading, publishedAt: '2026-10-25T00:05:00Z' }));
    assert.ok(html.includes(horoscopeDesign[locale].forecast));
    assert.ok(html.includes(reading.headline!));
    assert.ok(html.includes(reading.general.split('\n\n')[0]));
    assert.equal((html.match(/class="hc-reading-text"/g) ?? []).length, 2);
    assert.ok(html.includes('dateTime="2026-10-25"'));
    assert.ok(!html.includes('hc-preparing'));
  }
});

test('missing daily readings render localized pending copy and a refresh control on the server', () => {
  for (const locale of LOCALES) {
    const html = renderToStaticMarkup(createElement(CosmicForecast, { locale, day: '2026-10-25', selected: true, refresh: createElement(ForecastWaiting, {}, createElement('button', null, horoscopeJobs[locale].start)) }));
    assert.ok(!html.includes('role="status"'));
    assert.ok(html.includes(horoscopeJobs[locale].start));
    assert.ok(html.includes('dateTime="2026-10-25"'));
    assert.ok(!html.includes('hc-publication'));
    assert.ok(!html.includes('hc-skeleton'));
    assert.ok(!html.includes(horoscopeDesign[locale].preparing));
  }
});

test('refresh reads persisted availability through the server and never imports AI generation', () => {
  const actions = readFileSync('app/horoscope/HoroscopeActions.tsx', 'utf8');
  assert.match(actions, /router\.refresh\(\)/);
  assert.match(actions, /watchReading/);
  assert.match(actions, /method: 'POST'/);
  assert.ok(!/generateReading|\/api\/cron/.test(actions));
  const store = readFileSync('lib/horoscope/store.ts', 'utf8');
  assert.match(store, /readStored\(db, day, sign, locale\)/);
  assert.ok(!/unstable_cache|generateReading|requestReading/.test(store));
  const view = readFileSync('app/horoscope/HoroscopeView.tsx','utf8');
  assert.ok(!/requestReading|processRequested|generateReading/.test(view));
});


test('loading bars appear only while a requested forecast is queued or processing', () => {
  for(const locale of LOCALES) {
    const active=renderToStaticMarkup(createElement(ForecastWaiting,{active:true,busy:true,message:horoscopeJobs[locale].processing}));
    assert.ok(active.includes('hc-skeleton'));assert.ok(active.includes(horoscopeJobs[locale].processing));
    const failed=renderToStaticMarkup(createElement(ForecastWaiting,{message:horoscopeJobs[locale].failed}));
    assert.ok(!failed.includes('hc-skeleton'));assert.ok(failed.includes(horoscopeJobs[locale].failed));
  }
});
