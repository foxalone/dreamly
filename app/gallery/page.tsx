import type { Metadata } from "next";
import { listDreamPageImages } from "@/lib/getDreamPageImage";
import { listGalleryHeartCounts } from "@/lib/getGalleryHearts";
import { getMessages } from "@/lib/i18n/messages";
import { localeMetadata, localeOpenGraph } from "@/lib/i18n/page-locale";
import GalleryView from "./GalleryView";

export const revalidate = 3600;

const t = getMessages("en");

export const metadata: Metadata = {
  title: t.gallery.seoTitle,
  description: t.gallery.seoDescription,
  ...localeMetadata("/gallery", "en"),
  openGraph: localeOpenGraph("/gallery", "en", t.gallery.h1, t.gallery.lead),
};

export default async function GalleryPage() {
  const [images, heartCounts] = await Promise.all([
    listDreamPageImages(),
    listGalleryHeartCounts(),
  ]);
  return <GalleryView locale="en" images={images} heartCounts={heartCounts} />;
}
