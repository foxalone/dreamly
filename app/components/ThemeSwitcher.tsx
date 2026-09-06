"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useMessages } from "@/lib/i18n/LocaleProvider";
import { SegmentedPill, segmentedThumbClass } from "./SegmentedPill";

type ThemeChoice = "light" | "dark" | "system";

function applyTheme(choice: ThemeChoice) {
  const c = document.documentElement.classList;
  c.remove("light", "dark");
  if (choice === "light" || choice === "dark") c.add(choice);
}

export default function ThemeSwitcher() {
  const t = useMessages();
  const [theme, setTheme] = useState<ThemeChoice>("system");

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const next: ThemeChoice = saved === "light" || saved === "dark" ? saved : "system";
    setTheme(next);
    applyTheme(next);
  }, []);

  function select(next: ThemeChoice) {
    setTheme(next);
    if (next === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", next);
    applyTheme(next);
  }

  const options = [
    { id: "light" as const, label: t.theme.light, icon: Sun },
    { id: "dark" as const, label: t.theme.dark, icon: Moon },
    { id: "system" as const, label: t.theme.system, icon: Monitor },
  ];

  return (
    <SegmentedPill ariaLabel={t.theme.label}>
      {options.map(({ id, label, icon: Icon }) => {
        const active = theme === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => select(id)}
            className={segmentedThumbClass(active)}
          >
            <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
          </button>
        );
      })}
    </SegmentedPill>
  );
}
