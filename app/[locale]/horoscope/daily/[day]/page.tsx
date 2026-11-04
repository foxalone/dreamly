import { FeaturedPage, featuredMetadata } from "@/app/horoscope/daily/[day]/page";
import { localeFromParams } from "@/lib/i18n/page-locale";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ locale: string; day: string }> };
export async function generateMetadata({ params }: Props) { const p = await params; return featuredMetadata(await localeFromParams(params), p.day); }
export default async function Page({ params }: Props) { const p = await params; return <FeaturedPage locale={await localeFromParams(params)} day={p.day} />; }
