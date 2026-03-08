import { ICON_KEYBOARD_ROWS, NUMBER_KEYS } from "../iconComposer";

export type IconKeyboardProps = {
  open: boolean;
  value: string;
  onInsert: (token: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onClose: () => void;
  onSend?: () => void;
};

function KeyButton({ label, onClick, className }: { label: string; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2 text-xl transition hover:bg-white/[0.09] active:scale-[0.98] ${className ?? ""}`}
    >
      {label}
    </button>
  );
}

export function IconKeyboard({
  open,
  value,
  onInsert,
  onBackspace,
  onClear,
  onClose,
  onSend,
}: IconKeyboardProps) {
  if (!open) return null;

  return (
    <div className="mb-3 rounded-2xl border border-white/10 bg-[color:color-mix(in_srgb,var(--card)_92%,black)] p-3 shadow-2xl shadow-black/40 sm:p-4">
      <div className="max-h-[44vh] overflow-auto pr-1">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_64px]">
          <div className="space-y-2">
            {ICON_KEYBOARD_ROWS.map((row, rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                {row.map((icon) => (
                  <KeyButton key={icon} label={icon} onClick={() => onInsert(icon)} />
                ))}
              </div>
            ))}

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button
                type="button"
                onClick={() => onInsert(" ")}
                className="col-span-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium transition hover:bg-white/[0.09] active:scale-[0.99]"
              >
                Space
              </button>
              <button
                type="button"
                onClick={onBackspace}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium transition hover:bg-white/[0.09] active:scale-[0.99]"
              >
                Backspace
              </button>
              <button
                type="button"
                onClick={onClear}
                className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-500/20 active:scale-[0.99]"
              >
                Clear all
              </button>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2 md:grid-cols-1">
            {NUMBER_KEYS.map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => onInsert(num)}
                className="rounded-xl border border-cyan-300/20 bg-cyan-500/10 px-2 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20 active:scale-[0.98]"
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
        <p className="max-w-full truncate text-xs text-[var(--muted)]">Draft: {value || "—"}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/15 bg-white/[0.03] px-3 py-1.5 text-xs font-medium transition hover:bg-white/[0.09]"
          >
            Close keyboard
          </button>
          {onSend ? (
            <button
              type="button"
              onClick={onSend}
              className="rounded-xl border border-cyan-400/35 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/20"
            >
              Send
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
