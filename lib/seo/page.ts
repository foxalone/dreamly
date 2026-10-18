import { getDreamEntry, getRelatedDreams, getParentEntry, getDreamVariations, getCombosForSymbol } from '@/lib/dream-dictionary';
import { getLocalizedEntry } from '@/lib/i18n/localize-dictionary';
import { isPrefixLocale, type Locale } from '@/lib/i18n/config';
import { getCtrExperimentMeta } from '@/lib/seo/ctr-experiment';
import { publicUrl } from './opportunities';

export function seoPage(raw: string) {
  const url = publicUrl(raw); if (!url) return null;
  const parts = new URL(url).pathname.split('/').filter(Boolean);
  const locale: Locale = isPrefixLocale(parts[0]) ? parts.shift() as Locale : 'en';
  if (parts.length !== 2 || parts[0] !== 'dreams') return null;
  const entry = getLocalizedEntry(parts[1], locale), english = getDreamEntry(parts[1]);
  if (!entry || !english || entry.canonicalSlug !== parts[1]) return null;
  const prefix = locale === 'en' ? '' : `/${locale}`;
  const candidates = [...getRelatedDreams(english), getParentEntry(english), ...getDreamVariations(english), ...getCombosForSymbol(english.slug)];
  const links = [...new Set(candidates.filter(e => e.slug !== english.slug).map(e => `https://dreamly.art${prefix}/dreams/${e.canonicalSlug}`))].slice(0, 15);
  const experiment = getCtrExperimentMeta(entry.slug, locale);
  return { url, locale, entry, links, title: experiment?.title ?? entry.seoTitle, description: experiment?.description ?? entry.seoDescription };
}
