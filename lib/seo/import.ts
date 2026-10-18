import ExcelJS from 'exceljs';
import { Unzip, UnzipInflate } from 'fflate';
import { publicUrl, validDate, type SearchRow } from './opportunities';

const MAX_BYTES = 4 * 1024 * 1024;
const MAX_EXPANDED = 32 * 1024 * 1024;
const MAX_ROWS = 20000;
const aliases: Record<string, string[]> = {
  page: ['page', 'pages', 'top pages', 'url', 'landing page', 'страница', 'страницы', 'популярные страницы', 'самые популярные страницы', 'páginas', 'página', 'páginas principales', 'páginas principais', 'seiten', 'seite', 'häufigste seiten', 'الصفحات', 'أهم الصفحات', 'الصفحة'],
  query: ['query', 'queries', 'top queries', 'запрос', 'запросы', 'популярные запросы', 'самые популярные запросы', 'consultas', 'consulta', 'consultas principales', 'consultas principais', 'suchanfragen', 'suchanfrage', 'häufigste suchanfragen', 'طلبات البحث', 'أهم طلبات البحث'],
  clicks: ['clicks', 'клики', 'clics', 'cliques', 'klicks', 'النقرات', 'عدد النقرات'],
  impressions: ['impressions', 'показы', 'impresiones', 'impressões', 'impressionen', 'مرات الظهور', 'عدد مرات الظهور'],
  position: ['position', 'average position', 'avg position', 'позиция', 'средняя позиция', 'posición', 'posición media', 'posição', 'posição média', 'متوسط موضع الإعلان', 'متوسط موضع الظهور', 'durchschnittliche position'],
  date: ['date', 'dates', 'дата', 'даты', 'fecha', 'data', 'datum', 'التاريخ'],
};
function key(s: unknown) { return String(s ?? '').replace(/^\uFEFF/, '').trim().toLowerCase(); }
export function csvRows(text: string): string[][] {
  const first = text.split(/\r?\n/, 1)[0];
  const delimiter = ['\t', ';', ','].sort((a, b) => first.split(b).length - first.split(a).length)[0];
  const result: string[][] = []; let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (!quoted && (c === delimiter || c === '\n' || c === '\r')) {
      row.push(cell); cell = '';
      if (c !== delimiter) { if (c === '\r' && text[i + 1] === '\n') i++; if (row.some(Boolean)) result.push(row); row = []; }
    } else cell += c;
    if (result.length > MAX_ROWS + 20 || cell.length > 10000) throw new Error('Слишком большой отчёт. Максимум 20 000 строк.');
  }
  if (quoted) throw new Error('В CSV не закрыты кавычки. Экспортируйте файл заново.');
  row.push(cell); if (row.some(Boolean)) result.push(row); return result;
}
function number(v: unknown) {
  const s = String(v ?? '').trim().replace(/[\s\u00a0%]/g, '').replace(',', '.');
  if (!s || !/^\d+(\.\d+)?$/.test(s)) return NaN;
  return Number(s);
}
export function normalizeTable(table: unknown[][]): SearchRow[] {
  const headerIndex = table.findIndex(row => row.some(c => aliases.clicks.includes(key(c))) && row.some(c => aliases.impressions.includes(key(c))));
  if (headerIndex < 0) return [];
  const header = table[headerIndex].map(key);
  const indexes = Object.fromEntries(Object.entries(aliases).map(([k, list]) => [k, header.findIndex(c => list.includes(c))]));
  if (indexes.position < 0 || (indexes.page < 0 && indexes.query < 0 && indexes.date < 0)) return [];
  const out: SearchRow[] = [];
  for (const row of table.slice(headerIndex + 1)) {
    if (!row.some(v => String(v ?? '').trim())) continue;
    const get = (k: string) => row[indexes[k]];
    const page = indexes.page >= 0 ? publicUrl(String(get('page') || '').trim()) : '';
    const query = indexes.query >= 0 ? String(get('query') || '').trim() : '';
    let date = indexes.date >= 0 ? (get('date') instanceof Date ? (get('date') as Date).toISOString().slice(0, 10) : String(get('date') || '').trim()) : '';
    if (date && !validDate(date)) throw new Error('Дата должна иметь вид ГГГГ-ММ-ДД.');
    date ||= '';
    const clicks = number(get('clicks')), impressions = number(get('impressions')), position = number(get('position'));
    if (page === null) throw new Error('В отчёте есть некорректный URL. Допускаются только HTTPS-страницы dreamly.art без параметров.');
    if (query.length > 500 || !Number.isFinite(clicks) || !Number.isFinite(impressions) || !Number.isFinite(position) || clicks > impressions || position < 0 || position > 1000 || !Number.isSafeInteger(clicks) || !Number.isSafeInteger(impressions)) throw new Error('Некорректные показатели в отчёте. Проверьте клики, показы и позицию.');
    out.push({ page: page || '', query, date, clicks, impressions, position, ctr: impressions ? clicks / impressions : 0 });
  }
  return out;
}
/** Streaming decompression caps actual bytes, including archives with dishonest size headers. Never extracts paths. */
export function unzipLimited(bytes: Uint8Array, budget = { used: 0 }): { name: string; bytes: Uint8Array }[] {
  const files: { name: string; bytes: Uint8Array }[] = []; let count = 0; let limitError: Error | null = null;
  const unzip = new Unzip(file => {
    if (++count > 100) throw new Error('В архиве слишком много файлов.');
    if (file.name.endsWith('/')) return;
    if (file.originalSize && file.originalSize > MAX_EXPANDED - budget.used) throw new Error('Распакованный архив слишком большой (максимум 32 МБ).');
    const chunks: Uint8Array[] = [];
    file.ondata = (err, data, final) => {
      if (err) throw limitError || new Error('Повреждённый ZIP-архив.');
      budget.used += data.length; if (budget.used > MAX_EXPANDED) { limitError = new Error('Распакованный архив слишком большой (максимум 32 МБ).'); throw limitError; }
      chunks.push(data);
      if (final) { const size = chunks.reduce((n, b) => n + b.length, 0); const combined = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { combined.set(chunk, offset); offset += chunk.length; } files.push({ name: file.name, bytes: combined }); }
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  for (let offset = 0; offset < bytes.length; offset += 4096) unzip.push(bytes.subarray(offset, offset + 4096), offset + 4096 >= bytes.length);
  return files;
}
export async function parseUpload(name: string, bytes: Uint8Array) {
  if (!bytes.length || bytes.length > MAX_BYTES) throw new Error('Размер файла должен быть от 1 байта до 4 МБ.');
  const rows: SearchRow[] = []; const warnings: string[] = []; const budget = { used: 0 };
  async function parse(n: string, data: Uint8Array) {
    if (/\.csv$/i.test(n)) {
      const encoding = data[0] === 255 && data[1] === 254 ? 'utf-16le' : 'utf-8';
      const parsed = normalizeTable(csvRows(new TextDecoder(encoding).decode(data)));
      if (!parsed.length) warnings.push(`Пропущен файл без показателей страниц, запросов или дат: ${n.slice(0, 120)}`);
      rows.push(...parsed);
    } else if (/\.xlsx$/i.test(n)) {
      unzipLimited(data, budget); // Enforce a decompressed-size limit before handing XML to the workbook parser.
      const book = new ExcelJS.Workbook(); await book.xlsx.load(Buffer.from(data) as never);
      for (const sheet of book.worksheets) {
        if (sheet.rowCount > MAX_ROWS + 20 || sheet.columnCount > 40) throw new Error('Слишком большая таблица Excel.');
        const table: unknown[][] = [];
        sheet.eachRow(r => table.push((r.values as unknown[]).slice(1).map(v => typeof v === 'object' && v && 'text' in v ? String(v.text) : v)));
        rows.push(...normalizeTable(table));
      }
    } else throw new Error('Поддерживаются CSV, XLSX и ZIP с CSV/XLSX. Старый формат XLS сохраните как XLSX.');
    if (rows.length > MAX_ROWS) throw new Error('Максимум 20 000 строк на импорт. Разделите отчёт.');
  }
  if (/\.zip$/i.test(name)) {
    for (const file of unzipLimited(bytes, budget)) if (/\.(csv|xlsx)$/i.test(file.name) && !file.name.startsWith('__MACOSX/')) await parse(file.name, file.bytes);
  } else await parse(name, bytes);
  if (!rows.length) throw new Error('Не найдены показатели GSC. Нужны столбцы страницы/запроса/даты, кликов, показов и позиции.');
  if (new Set(rows.filter(r => r.page).map(r => r.page)).size > 5000) throw new Error('Максимум 5000 страниц на импорт. Разделите отчёт.');
  const seen = new Set<string>();
  for (const r of rows) { const k = JSON.stringify([r.page, r.query, r.date]); if (seen.has(k)) throw new Error('Повторяются одинаковые строки. Не объединяйте отчёты за разные периоды или устройства в одном файле.'); seen.add(k); }
  if (!rows.some(r => r.page && r.query)) warnings.push('Связь страниц с запросами отсутствует. Запросы не будут приписаны страницам. Загрузите дополнительный отчёт URL + Query за тот же период.');
  return { rows, warnings: warnings.slice(0, 10) };
}
