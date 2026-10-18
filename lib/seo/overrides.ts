import { cache } from 'react';
import { createHash } from 'crypto';
import { adminDb } from '@/app/api/admin/_lib/firebaseAdmin';
import type { Locale } from '@/lib/i18n/config';
export const seoId = (url: string) => createHash('sha256').update(url).digest('hex');
export type SeoOverride = { title?: string; description?: string };
export const getSeoOverride = cache(async (slug: string, locale: Locale): Promise<SeoOverride> => {
  const url = `https://dreamly.art${locale === 'en' ? '' : `/${locale}`}/dreams/${slug}`;
  const snapshot = await adminDb().collection('seo_page_overrides').doc(seoId(url)).get();
  const data = snapshot.data();
  return { ...(typeof data?.title === 'string' ? { title: data.title } : {}), ...(typeof data?.description === 'string' ? { description: data.description } : {}) };
});
