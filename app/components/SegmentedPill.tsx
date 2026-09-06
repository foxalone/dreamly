import type { ReactNode } from "react";

export function SegmentedPill({
  children,
  ariaLabel,
}: {
  children: ReactNode;
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-0.5 rounded-full bg-[var(--surface)] p-1 shadow-[0_2px_12px_rgba(15,23,42,0.10)] ring-1 ring-[var(--border)]"
    >
      {children}
    </div>
  );
}

export function segmentedThumbClass(active: boolean) {
  return [
    "grid h-9 min-w-9 place-items-center rounded-[10px] px-2.5 text-[12px] font-semibold leading-none tracking-wide transition",
    active
      ? "bg-[#2563eb] text-white shadow-[0_2px_8px_rgba(37,99,235,0.42)]"
      : "text-[var(--text)]/70 hover:text-[var(--text)]",
  ].join(" ");
}
