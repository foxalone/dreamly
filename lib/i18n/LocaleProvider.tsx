"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_LOCALE, type Locale } from "./config";
import type { UiMessages } from "./messages/types";
import { EN_MESSAGES } from "./messages/en";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);
const MessagesContext = createContext<UiMessages>(EN_MESSAGES);

export function LocaleProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: UiMessages;
  children: ReactNode;
}) {
  return (
    <LocaleContext.Provider value={locale}>
      <MessagesContext.Provider value={messages}>{children}</MessagesContext.Provider>
    </LocaleContext.Provider>
  );
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useMessages(): UiMessages {
  return useContext(MessagesContext);
}
