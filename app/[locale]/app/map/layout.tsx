import type { Metadata } from "next";
import type { ReactNode } from "react";
import { localeFromParams } from "@/lib/i18n/page-locale";
import { MapShell, mapMetadata } from "../../../app/map/mapSeo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return mapMetadata(await localeFromParams(params));
}

export default async function Layout({ children, params }: Props & { children: ReactNode }) {
  const locale = await localeFromParams(params);
  return <MapShell locale={locale}>{children}</MapShell>;
}
