import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeHoroscopeRequests, validReportRange } from './horoscope/request-report';
import { adminHoroscopeRequestsCopy } from './i18n/adminHoroscopeRequests';
import { LOCALES } from './i18n/config';

const entry = (actor: string, day: string, sign: string, source: string) => ({
  path: `horoscope_access/user_${actor.repeat(64)}/days/${day}/signs/${sign}`,
  data: { day, sign, source },
});
test('counts actual unlocks by UTC day and sign, with free and ad totals', () => {
  const rows = summarizeHoroscopeRequests([
    entry('a', '2026-10-25', 'aries', 'free'),
    entry('b', '2026-10-25', 'aries', 'ad'),
    entry('a', '2026-10-26', 'taurus', 'free'),
    entry('a', '2026-10-24', 'aries', 'free'),
  ], '2026-10-25', '2026-10-26');
  assert.deepEqual(rows, [
    { day: '2026-10-26', sign: 'taurus', total: 1, free: 1, ad: 0 },
    { day: '2026-10-25', sign: 'aries', total: 2, free: 1, ad: 1 },
  ]);
});
test('ignores other signs collections, jobs, malformed and mismatched grants', () => {
  const good = entry('a', '2026-10-25', 'aries', 'ad');
  const guest = { ...good, path: good.path.replace('user_', 'guest_') };
  assert.deepEqual(summarizeHoroscopeRequests([
    guest,
    { ...good, path: 'other/x/signs/aries' },
    { ...good, path: 'horoscope_jobs/2026-10-25_aries_en' },
    { ...good, data: { ...good.data, sign: 'taurus' } },
    entry('b', '2026-10-25', 'aries', 'unknown'),
  ], '2026-10-25', '2026-10-25'), [{ day: '2026-10-25', sign: 'aries', total: 1, free: 0, ad: 1 }]);
});
test('date ranges enforce real dates and at most 31 inclusive days', () => {
  assert.equal(validReportRange('2026-10-01', '2026-10-31'), true);
  for (const range of [['2026-10-01', '2026-11-01'], ['2026-10-26', '2026-10-25'], ['2026-02-30', '2026-03-01'], ['', '2026-10-25']]) {
    assert.equal(validReportRange(...range as [string, string]), false);
  }
});
test('report copy is complete in all six locales', () => {
  const keys = Object.keys(adminHoroscopeRequestsCopy.en);
  for (const locale of LOCALES) {
    assert.deepEqual(Object.keys(adminHoroscopeRequestsCopy[locale]), keys);
    assert.ok(Object.values(adminHoroscopeRequestsCopy[locale]).every(value => value.trim()));
  }
});
