"use client";

import { useId, type FormEvent } from "react";
import { Loader2, Sparkles } from "lucide-react";
import type { DreamLens } from "@/lib/dream-lenses";
import { useMessages } from "@/lib/i18n/LocaleProvider";
import DreamLensChips from "./DreamLensChips";
import DreamWordCounter from "./DreamWordCounter";

type Props = {
  text: string;
  onTextChange: (text: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  lens: DreamLens;
  onLensChange: (lens: DreamLens) => void;
  placeholder: string;
  label?: string;
  submitLabel: string;
  busyLabel?: string;
  busy?: boolean;
  submitDisabled?: boolean;
  maxChars: number;
  autoFocus?: boolean;
  textareaId?: string;
  showLens?: boolean;
  lensDisabled?: boolean;
  share?: { checked: boolean; onChange: (checked: boolean) => void };
  className?: string;
};

/** One visual composer for the homepage and journal, with each caller's own action. */
export default function DreamComposerForm({
  text, onTextChange, onSubmit, lens, onLensChange, placeholder, label, submitLabel,
  busyLabel, busy = false, submitDisabled = false, maxChars, autoFocus = false,
  textareaId, showLens = true, lensDisabled = false, share, className = "",
}: Props) {
  const t = useMessages();
  const generatedId = useId();
  const id = textareaId ?? generatedId;

  return (
    <form onSubmit={onSubmit} className={`rounded-3xl bg-purple-600 p-2 shadow-[0_12px_40px_rgba(124,58,237,0.28)] ${className}`}>
      <label className="sr-only" htmlFor={id}>{label ?? placeholder}</label>
      <textarea
        id={id}
        autoFocus={autoFocus}
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            if (!busy && !submitDisabled) event.currentTarget.form?.requestSubmit();
          }
        }}
        rows={4}
        maxLength={maxChars}
        placeholder={placeholder}
        disabled={busy}
        className="w-full resize-none rounded-[1.15rem] bg-white px-4 py-3.5 text-base text-zinc-900 outline-none placeholder:text-zinc-400"
      />
      <div className="flex justify-end px-2 pt-1.5 text-[11px] font-medium tabular-nums">
        <span className="text-white/70"><DreamWordCounter text={text} fullClassName="text-amber-200" /></span>
      </div>
      {showLens ? <div className="px-2 pb-1 pt-2">
        <DreamLensChips value={lens} onChange={onLensChange} disabled={busy || lensDisabled} tone="onBrand" />
      </div> : null}
      <div className={`flex flex-col gap-2 px-2 pb-1.5 pt-1 sm:flex-row sm:items-center ${share ? "sm:justify-between" : "sm:justify-end"}`}>
        {share ? <label className="flex min-w-0 cursor-pointer items-start gap-2 text-xs font-medium text-white/90">
          <input type="checkbox" checked={share.checked} disabled={busy} onChange={(event) => share.onChange(event.target.checked)} className="mt-0.5 size-3.5 shrink-0 rounded border-white/40 bg-white/15 accent-white" />
          <span>{t.home.askShareFeed}</span>
        </label> : null}
        <button type="submit" disabled={busy || submitDisabled} className="inline-flex shrink-0 items-center justify-center gap-1.5 self-end rounded-full bg-white px-4 py-2 text-sm font-semibold text-purple-700 transition hover:bg-purple-50 disabled:opacity-70 sm:self-auto">
          {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
          {busy ? busyLabel ?? t.home.askBusy : submitLabel}
        </button>
      </div>
    </form>
  );
}
