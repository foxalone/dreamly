import type { ReactNode } from "react";
import { PREFIX_LOCALES } from "@/lib/i18n/config";

export function generateStaticParams() {
  return PREFIX_LOCALES.map((locale) => ({ locale }));
}

export default function LocaleLayout({ children }: { children: ReactNode }) {
  return children;
}
