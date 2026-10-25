import type { Locale } from '@/lib/i18n/config';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { localeMetadata, localeOpenGraph } from '@/lib/i18n/page-locale';
import { horoscopeCopy } from '@/lib/i18n/horoscope';
import { isSign, utcDay, type Sign } from '@/lib/horoscope/model';
import { calculateSky } from '@/lib/horoscope/astronomy';
import { getForecast } from '@/lib/horoscope/store';
import { HoroscopeContent } from './HoroscopeContent';

export async function horoscopeMetadata(locale: Locale, sign?: string): Promise<Metadata> {
  if (sign && !isSign(sign)) notFound();
  const t = horoscopeCopy[locale], name = sign ? t.signs[sign as Sign] : t.nav;
  const path = `/horoscope${sign ? `/${sign}` : ''}`;
  const title = `${sign ? `${name} · ` : ''}${t.title} | Dreamly`;
  const description = t.description.replace('{sign}', name);
  const { forecast } = await getForecast();
  return { title, description, ...localeMetadata(path,locale), openGraph: localeOpenGraph(path,locale,title,description), robots: { index: !!forecast, follow: true } };
}
export default async function HoroscopeView({ locale, sign: rawSign }: { locale: Locale; sign?: string }) {
  if (rawSign && !isSign(rawSign)) notFound();
  const today = utcDay();
  const { forecast, stale } = await getForecast(today);
  return <HoroscopeContent locale={locale} sign={rawSign as Sign | undefined} today={today} forecast={forecast} stale={stale} sky={calculateSky(today)} />;
}
