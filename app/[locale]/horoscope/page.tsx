import HoroscopeView, { horoscopeMetadata } from '@/app/horoscope/HoroscopeView';
import { localeFromParams } from '@/lib/i18n/page-locale';
export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props) { return horoscopeMetadata(await localeFromParams(params)); }
export default async function Page({ params }: Props) { return <HoroscopeView locale={await localeFromParams(params)} />; }
