"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { LocaleProvider } from "./LocaleProvider";
import { LOCALE_META } from "./config";
import { getMessages } from "./messages";
import { localeFromPathname } from "./path";
import BrowserLanguageSuggestion from "./BrowserLanguageSuggestion";
import { isJaPilotPath } from "@/lib/jaPilotPaths";

export default function AppI18n({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const locale = localeFromPathname(pathname);
  useEffect(() => {
    const root = document.documentElement;
    const { htmlLang, dir } = LOCALE_META[locale];
    root.lang = htmlLang;
    root.dir = dir;
    root.classList.toggle("locale-ar", locale === "ar");
    root.classList.toggle("locale-ru", locale === "ru");
  }, [locale]);
  return (
    <LocaleProvider locale={locale} messages={getMessages(locale)}>
      {children}
      {!(pathname.startsWith("/ja/dreams") && isJaPilotPath(pathname)) ? <BrowserLanguageSuggestion /> : null}
    </LocaleProvider>
  );
}
