"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { LocaleProvider } from "./LocaleProvider";
import { getMessages } from "./messages";
import { localeFromPathname } from "./path";

export default function AppI18n({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const locale = localeFromPathname(pathname);
  return (
    <LocaleProvider locale={locale} messages={getMessages(locale)}>
      {children}
    </LocaleProvider>
  );
}
