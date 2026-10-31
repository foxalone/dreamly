"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useMessages } from "@/lib/i18n/LocaleProvider";
import type { Locale } from "@/lib/i18n/config";

const INTL: Record<Locale, string> = {
  en: "en",
  es: "es",
  ar: "ar",
  pt: "pt-BR",
  de: "de",
  ru: "ru",
};

/** en/US weeks start Sunday, Arabic weeks start Saturday, the rest Monday. */
const WEEK_START: Record<Locale, number> = {
  en: 0,
  es: 1,
  ar: 6,
  pt: 1,
  de: 1,
  ru: 1,
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function localDateKey(value: Date | number) {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export default function DiaryCalendar({ markedDays = [] }: { markedDays?: string[] }) {
  const locale = useLocale();
  const t = useMessages();
  const today = useMemo(() => new Date(), []);
  const todayKey = localDateKey(today);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const marked = useMemo(() => new Set(markedDays), [markedDays]);
  const intl = INTL[locale];
  const weekStart = WEEK_START[locale];

  const monthLabel = new Intl.DateTimeFormat(intl, { month: "long", year: "numeric" }).format(cursor);
  const weekday = new Intl.DateTimeFormat(intl, { weekday: "narrow" });
  const weekdays = Array.from({ length: 7 }, (_, index) => weekday.format(new Date(2024, 0, 7 + weekStart + index)));

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const lead = (new Date(year, month, 1).getDay() - weekStart + 7) % 7;
  const days = new Date(year, month + 1, 0).getDate();

  return (
    <aside
      aria-label={t.app.calendarLabel}
      className="flex w-full shrink-0 flex-col rounded-3xl border border-[var(--border)] bg-[var(--card)] p-2.5 sm:w-52"
    >
      <div className="flex items-center justify-between gap-1">
        <button
          type="button"
          className="inline-flex size-6 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--text)_10%,transparent)] hover:text-[var(--text)]"
          aria-label={t.app.previousMonth}
          onClick={() => setCursor(new Date(year, month - 1, 1))}
        >
          <ChevronLeft size={14} aria-hidden className="rtl:rotate-180" />
        </button>
        <h2 className="text-xs font-semibold capitalize text-[var(--text)]">{monthLabel}</h2>
        <button
          type="button"
          className="inline-flex size-6 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--text)_10%,transparent)] hover:text-[var(--text)]"
          aria-label={t.app.nextMonth}
          onClick={() => setCursor(new Date(year, month + 1, 1))}
        >
          <ChevronRight size={14} aria-hidden className="rtl:rotate-180" />
        </button>
      </div>
      <div className="mt-1.5 grid flex-1 grid-cols-7 content-center text-center">
        {weekdays.map((name, index) => (
          <div key={`${name}-${index}`} className="py-0.5 text-[10px] font-medium text-[var(--muted)]">
            {name}
          </div>
        ))}
        {Array.from({ length: lead }, (_, index) => (
          <div key={`pad-${index}`} />
        ))}
        {Array.from({ length: days }, (_, index) => {
          const day = index + 1;
          const key = `${year}-${pad(month + 1)}-${pad(day)}`;
          const isToday = key === todayKey;
          const hasEntry = marked.has(key);
          return (
            <div key={key} className="flex items-center justify-center">
              <span
                aria-current={isToday ? "date" : undefined}
                title={isToday ? t.app.today : undefined}
                className={[
                  "relative flex size-6 items-center justify-center rounded-full text-xs",
                  isToday
                    ? "bg-[var(--text)] font-semibold text-[var(--bg)]"
                    : "text-[var(--text)]",
                ].join(" ")}
              >
                <span className={hasEntry ? "-translate-y-px" : undefined}>{day}</span>
                {hasEntry ? (
                  <span className="absolute bottom-0 size-1 rounded-full bg-purple-500" aria-hidden />
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
