import type { ReactNode } from "react";

type InviteActionButtonProps = {
  title: string;
  subtitle?: string;
  onClick: () => void;
  icon: ReactNode;
  disabled?: boolean;
};

export function InviteActionButton({
  title,
  subtitle,
  onClick,
  icon,
  disabled = false,
}: InviteActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60"
      style={{
        borderColor: "var(--border)",
        background: "color-mix(in srgb, var(--text) 4%, var(--card))",
        color: "var(--text)",
      }}
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        {subtitle ? (
          <span className="mt-0.5 block text-xs" style={{ color: "var(--muted)" }}>
            {subtitle}
          </span>
        ) : null}
      </span>

      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
        style={{
          borderColor: "var(--border)",
          background: "color-mix(in srgb, var(--bg) 86%, var(--card))",
          color: "var(--text)",
        }}
      >
        {icon}
      </span>
    </button>
  );
}
