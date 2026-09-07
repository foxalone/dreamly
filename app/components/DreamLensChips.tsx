"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  DREAM_LENSES,
  DEFAULT_DREAM_LENS,
  parseDreamLens,
  readStoredDreamLens,
  writeStoredDreamLens,
  type DreamLens,
} from "@/lib/dream-lenses";
import { useMessages } from "@/lib/i18n/LocaleProvider";

export function useDreamLens(initial?: DreamLens | null): [DreamLens, (lens: DreamLens) => void] {
  const [lens, setLens] = useState<DreamLens>(() => parseDreamLens(initial) || DEFAULT_DREAM_LENS);

  useEffect(() => {
    if (initial) return;
    setLens(readStoredDreamLens());
  }, [initial]);

  function update(next: DreamLens) {
    setLens(next);
    writeStoredDreamLens(next);
  }

  return [lens, update];
}

export function DreamLensSelect({
  value,
  onChange,
  disabled,
  className,
}: {
  value: DreamLens;
  onChange: (lens: DreamLens) => void;
  disabled?: boolean;
  className?: string;
}) {
  const t = useMessages();

  return (
    <label className={["relative inline-flex min-w-[11.5rem] shrink-0", className].filter(Boolean).join(" ")}>
      <span className="sr-only">{t.lens.label}</span>
      <select
        value={value}
        disabled={disabled}
        aria-label={t.lens.label}
        onChange={(event) => onChange(parseDreamLens(event.target.value))}
        className="
          h-full w-full appearance-none rounded-2xl
          border border-[var(--border)] bg-[var(--card)]
          px-3 py-2.5 pe-9
          text-sm font-semibold text-[var(--text)]
          outline-none
          focus:border-[color-mix(in_srgb,var(--text)_22%,var(--border))]
          disabled:opacity-60
        "
      >
        {DREAM_LENSES.map((lens) => (
          <option key={lens} value={lens}>
            {t.lens[lens]}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        aria-hidden
        className="pointer-events-none absolute inset-y-0 end-2.5 my-auto text-[var(--muted)]"
      />
    </label>
  );
}

export default function DreamLensChips({
  value,
  onChange,
  disabled,
  tone = "onSurface",
}: {
  value: DreamLens;
  onChange: (lens: DreamLens) => void;
  disabled?: boolean;
  tone?: "onBrand" | "onSurface" | "onDictionary";
}) {
  const t = useMessages();
  const onBrand = tone === "onBrand";
  const onDictionary = tone === "onDictionary";

  return (
    <div>
      <p
        className={
          onBrand
            ? "mb-1.5 px-0.5 text-[11px] font-medium text-white/75"
            : onDictionary
              ? "mb-1.5 text-[11px] font-medium text-[var(--dd-subtle)]"
              : "mb-1.5 text-[11px] font-medium text-[var(--muted)]"
        }
      >
        {t.lens.label}
      </p>
      <div
        role="radiogroup"
        aria-label={t.lens.label}
        className="flex flex-nowrap gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {DREAM_LENSES.map((lens) => {
          const selected = value === lens;
          return (
            <button
              key={lens}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(lens)}
              className={[
                "shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold transition disabled:opacity-60",
                onBrand
                  ? selected
                    ? "bg-white text-purple-700"
                    : "bg-white/15 text-white hover:bg-white/25"
                  : onDictionary
                    ? selected
                      ? "bg-violet-500 text-white"
                      : "border border-[var(--dd-border)] bg-[var(--dd-surface)] text-[var(--dd-muted)] hover:border-violet-400/50 hover:text-[var(--dd-text)]"
                    : selected
                      ? "bg-purple-600 text-white"
                      : "border border-[var(--border)] bg-[var(--card)] text-[var(--muted)] hover:border-[var(--text)] hover:text-[var(--text)]",
              ].join(" ")}
            >
              {t.lens[lens]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
