import type { Metadata } from "next";
import GalleryView from "../../gallery/GalleryView";
import { listDreamPageImages } from "@/lib/getDreamPageImage";
import { listGalleryHeartCounts } from "@/lib/getGalleryHearts";
import { getMessages } from "@/lib/i18n/messages";
import { localeFromParams, localeMetadata, localeOpenGraph } from "@/lib/i18n/page-locale";

export const revalidate = 3600;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = getMessages(locale);
  return {
    title: t.gallery.seoTitle,
    description: t.gallery.seoDescription,
    ...localeMetadata("/gallery", locale),
    openGraph: localeOpenGraph("/gallery", locale, t.gallery.h1, t.gallery.lead),
  };
}

export default async function Page({ params }: Props) {
  const locale = await localeFromParams(params);
  const [images, heartCounts] = await Promise.all([
    listDreamPageImages(),
    listGalleryHeartCounts(),
  ]);
  return <GalleryView locale={locale} images={images} heartCounts={heartCounts} />;
}
