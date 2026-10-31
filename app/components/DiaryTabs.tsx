"use client";

import type { ReactNode } from "react";
import { BookOpen, Moon, NotebookPen, Share2, type LucideIcon } from "lucide-react";
import { useMessages } from "@/lib/i18n/LocaleProvider";
import IpWeatherChip from "./IpWeatherChip";

export type DiaryTabId = "DREAMS" | "STORIES" | "JOURNAL" | "SHARED";

const TABS: { id: DiaryTabId; icon: LucideIcon }[] = [
  { id: "DREAMS", icon: Moon },
  { id: "STORIES", icon: BookOpen },
  { id: "JOURNAL", icon: NotebookPen },
  { id: "SHARED", icon: Share2 },
];

export default function DiaryTabs({
  tab,
  onTab,
  counts,
  extra,
}: {
  tab: DiaryTabId;
  onTab: (tab: DiaryTabId) => void;
  counts: Record<DiaryTabId, number>;
  extra?: ReactNode;
}) {
  const t = useMessages();
  const labels: Record<DiaryTabId, string> = {
    DREAMS: t.nav.dreams,
    STORIES: t.app.tabStories,
    JOURNAL: t.app.tabJournal,
    SHARED: t.app.tabShared,
  };

  return (
    <div className="flex max-w-full items-center gap-2">
      <div className="inline-flex min-w-0 gap-1 overflow-x-auto rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_70%,transparent)] p-1">
        {TABS.map(({ id, icon: Icon }) => {
          const label = labels[id];
          const count = counts[id];
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTab(id)}
              aria-label={`${label} (${count})`}
              title={label}
              className={[
                "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-2 text-sm font-semibold transition sm:px-4",
                active
                  ? "bg-[var(--text)] text-[var(--bg)]"
                  : "text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--text)_10%,transparent)]",
              ].join(" ")}
            >
              <Icon size={16} aria-hidden />
              <span className="hidden sm:inline">{label}</span>
              <span className="hidden sm:inline opacity-70">({count})</span>
            </button>
          );
        })}
        {extra}
      </div>
      <IpWeatherChip />
    </div>
  );
}
