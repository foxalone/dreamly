import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { zipSync, strToU8 } from 'fflate';
import { csvRows, normalizeTable, parseUpload, unzipLimited } from './seo/import';
import { aggregate, equivalent, opportunities, publicUrl, resultStatus, resultWindows, totals, type Report, type SearchRow } from './seo/opportunities';
import { seoPage } from './seo/page';
import { forWindow } from '../app/api/admin/seo-opportunities/storage';
const row = (page = 'https://dreamly.art/dreams/snake', changes: Partial<SearchRow> = {}): SearchRow => ({ page, query:'', date:'', clicks:10, impressions:1000, position:8, ctr:.01, ...changes });
const report = (start: string, end: string): Report => ({ id:'test', name:'test', importedAt:'2026-10-10', start, end, chunks:1, rowCount:1, warnings:[] });
const csv = 'Top pages,Clicks,Impressions,CTR,Position\r\nhttps://dreamly.art/dreams/snake,10,1000,1%,8';
test('CSV handles BOM, semicolons, decimal comma, quoted commas/newlines and Russian columns', () => {
  const parsed = normalizeTable(csvRows('\uFEFFСтраница;Клики;Показы;CTR;Средняя позиция\nhttps://dreamly.art/ru/dreams/snake;10;1 000;1%;"8,5"'));
  assert.equal(parsed[0].position, 8.5); assert.equal(parsed[0].ctr, .01);
  assert.deepEqual(csvRows('Query,Clicks\n"snake,\nwater",5'), [['Query','Clicks'],['snake,\nwater','5']]);
  assert.throws(() => csvRows('A,B\n"bad,3'), /кавычки/);
});
test('imports standard ZIP independently from arbitrary filenames, without invented page-query joins', async () => {
  const zip = zipSync({ 'strange name.csv':strToU8(csv), 'other.csv':strToU8('Top queries,Clicks,Impressions,Position\nsnake dream,10,1000,8'), 'Filters.csv':strToU8('Filter,Value\nType,Web') });
  const imported = await parseUpload('report.zip', zip);
  assert.equal(imported.rows.length, 2);
  assert.ok(imported.warnings.some(w => w.includes('Связь')));
  assert.equal(imported.rows.filter(r => r.page && r.query).length, 0);
  assert.equal(totals(imported.rows).impressions, 1000);
});
test('XLSX supports GSC sheets and real URL + Query rows', async () => {
  const book = new ExcelJS.Workbook(); const sheet = book.addWorksheet('Any name');
  sheet.addRow(['Page','Query','Date','Clicks','Impressions','Average position']);
  sheet.addRow(['https://dreamly.art/es/dreams/snake','serpiente','2026-09-30',5,300,9]);
  const parsed = await parseUpload('gsc.xlsx', new Uint8Array(await book.xlsx.writeBuffer()));
  assert.equal(parsed.rows[0].query, 'serpiente'); assert.equal(parsed.rows[0].date,'2026-09-30');
  assert.equal(parsed.warnings.length, 0);
});
test('rejects foreign URLs, invalid values, duplicated dimensions and unsupported files', async () => {
  assert.equal(publicUrl('https://dreamly.art.evil.example/dreams/snake'),null);
  assert.equal(publicUrl('https://dreamly.art@evil.example/dreams/snake'),null);
  assert.equal(publicUrl('https://dreamly.art/dreams/snake?x=1'),null);
  await assert.rejects(parseUpload('gsc.csv',strToU8(csv.replace(',10,1000,',',1001,1000,'))), /показатели/);
  await assert.rejects(parseUpload('gsc.csv',strToU8(csv + '\n' + csv.split('\r\n')[1])), /Повторяются/);
  await assert.rejects(parseUpload('gsc.xls',strToU8(csv)), /XLSX/);
  assert.throws(() => unzipLimited(zipSync({ 'bomb.csv':new Uint8Array(33 * 1024 * 1024) })), /слишком большой/);
});
test('overview never double-counts page, query, date, and joined reports', () => {
  const rows = [row(), row('', { query:'snake' }), row('', { date:'2026-09-30' }), row(undefined, { query:'snake' })];
  assert.equal(totals(rows).impressions, 1000);
  assert.equal(aggregate([row(), row(undefined,{ impressions:100, clicks:10, position:18 })]).position, 98/11);
});
test('opportunities require comparable same-language ranks and never a universal CTR', () => {
  const target = row();
  const peers = ['cat','dog','bird'].map(slug => row(`https://dreamly.art/dreams/${slug}`, { clicks:100, ctr:.1 }));
  assert.equal(opportunities([target])[0].benchmark, null);
  const results = opportunities([target, ...peers]);
  const opportunity = results.find(r => r.url === target.page)!;
  assert.equal(opportunity.benchmark, .1); assert.equal(opportunity.lowCtr, true); assert.equal(opportunity.level,'high');
  assert.equal(opportunities([target,...peers.map(r => ({ ...r,page:r.page.replace('/dreams/','/ru/dreams/') }))]).find(r => r.url === target.page)!.benchmark, null);
});
test('comparisons use exact adjacent equivalent periods, never divide aggregated totals', () => {
  assert.equal(equivalent(report('2026-09-29','2026-10-26'),report('2026-09-01','2026-09-28')),true);
  assert.equal(forWindow([row()],report('2026-08-01','2026-10-01'),'2026-09-01','2026-09-28'),null);
  assert.deepEqual(resultWindows('2026-10-01T12:00:00Z'), { before:{ start:'2026-09-03',end:'2026-09-30' },after:{ start:'2026-10-02',end:'2026-10-29' } });
  assert.equal(resultStatus(null,aggregate([row()])), '⏳ Недостаточно данных');
  assert.equal(resultStatus(aggregate([row()]),aggregate([row(undefined,{ clicks:11 })])), '🟡 Без заметных изменений');
});
test('page resolver preserves six locales and supports actual combination pages only', () => {
  for (const locale of ['','es/','ar/','pt/','de/','ru/']) {
    const page = seoPage(`https://dreamly.art/${locale}dreams/snake`); assert.ok(page); assert.equal(page.locale,locale.replace('/','') || 'en');
    assert.ok(page.links.every(link => seoPage(link)));
  }
  assert.equal(seoPage('https://dreamly.art/en/dreams/snake'),null);
  assert.equal(seoPage('https://dreamly.art/dreams/not-a-real-symbol-abcdef'),null);
  assert.equal(seoPage('https://dreamly.art/dreams'),null);
});
test('admin API rejects unauthenticated overview, results and writes before reading Firestore', async () => {
  const { GET, POST } = await import('../app/api/admin/seo-opportunities/route');
  for (const handler of [GET, POST]) {
    const response = await handler(new Request('https://dreamly.art/api/admin/seo-opportunities?view=results', { method: handler === POST ? 'POST' : 'GET' }));
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: 'Войдите в аккаунт.', code: 'SEO_AUTH' });
  }
});
