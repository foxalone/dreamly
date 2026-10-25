/** Run against a local dev/production server: npx tsx scripts/check-horoscope-routes.ts [origin] */
import assert from 'node:assert/strict';
import { LOCALES } from '../lib/i18n/config';
import { SIGNS } from '../lib/horoscope/model';
import { localePath } from '../lib/i18n/path';
import { horoscopeDesign } from '../lib/i18n/horoscope-design';
import { horoscopeCopy } from '../lib/i18n/horoscope';
async function main() {
  const origin = process.argv[2] || 'http://localhost:3107';
  const paths = LOCALES.flatMap(locale => [undefined,...SIGNS].map(sign => ({locale,sign,path:localePath(`/horoscope${sign ? `/${sign}` : ''}`,locale)})));
  for (let i=0;i<paths.length;i+=4) {
    await Promise.all(paths.slice(i,i+4).map(async ({locale,sign,path}) => {
      const response=await fetch(origin+path), html=await response.text();
      assert.equal(response.status,200,path);
      assert.ok(html.includes(`rel="canonical" href="https://dreamly.art${path}"`),`canonical ${path}`);
      assert.ok(html.includes(horoscopeCopy[locale].title),`localized title ${path}`);
      assert.ok(html.includes('hrefLang="x-default"'),`hreflang ${path}`);
      assert.ok(!html.includes('href="https://dreamly.art/en/horoscope'),path);
      assert.ok(html.includes('id="moon-title"'),`SSR moon ${path}`);
      assert.ok(html.includes(horoscopeDesign[locale].forecast),`localized forecast ${path}`);
      assert.ok(html.includes('class="hc-zodiac-art"'),`SSR artwork ${path}`);
      assert.ok(html.includes('class="hc-lunar-disc"'),`SSR lunar phase ${path}`);
      assert.ok(html.includes('<details class="hc-panel hc-details">'),`technical details collapsed ${path}`);
      assert.ok(html.indexOf('id="forecast-title"')<html.indexOf('id="moon-title"'),`reading before astronomy ${path}`);
      if (sign) assert.ok(html.includes(horoscopeCopy[locale].signs[sign]),`SSR sign ${path}`);
      assert.ok(html.includes(`lang="${locale}" dir="${locale==='ar' ? 'rtl':'ltr'}"`),`direction ${path}`);
    }));
  }
  assert.equal((await fetch(origin+'/horoscope/invalid-sign')).status,404);
  const cron=await fetch(origin+'/api/cron/horoscope');
  assert.ok([401,503].includes(cron.status),'unauthorized cron must fail closed');
  console.log(`Verified ${paths.length} localized pages: SSR, metadata, canonical URLs, hreflang, direction; invalid signs 404; cron fails closed.`);
}
main().catch(error=>{ console.error(error); process.exitCode=1; });
