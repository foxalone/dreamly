import { ICON_KEYBOARD_ROWS, NUMBER_KEYS } from "../iconComposer";

export type IconKeyboardProps = {
  open: boolean;
  onInsert: (token: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onClose: () => void;
  onSend?: () => void;
};

function IconKeyButton({ label, title, onClick }: { label: string; title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className="h-14 min-w-[56px] shrink-0 rounded-2xl border border-white/10 bg-white/[0.04] px-2 text-[22px] leading-none transition hover:bg-white/[0.09] active:scale-[0.98]"
    >
      {label}
    </button>
  );
}

export function IconKeyboard({ open, onInsert, onBackspace, onClear, onClose, onSend }: IconKeyboardProps) {
  if (!open) return null;

  return (
    <div className="absolute bottom-full left-0 z-50 mb-3 w-full max-w-[min(980px,calc(100vw-32px))] rounded-3xl border border-white/10 bg-[color:color-mix(in_srgb,var(--card)_88%,black)] p-3 shadow-2xl shadow-black/45 sm:p-4">
      <div className="space-y-2.5">
        {ICON_KEYBOARD_ROWS.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-2 overflow-x-auto whitespace-nowrap pb-1">
            {row.map((item) => (
              <IconKeyButton key={item.key} label={item.emoji} title={item.label} onClick={() => onInsert(item.emoji)} />
            ))}
          </div>
        ))}

        <div className="flex gap-2 overflow-x-auto whitespace-nowrap pb-1">
          {NUMBER_KEYS.map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => onInsert(num)}
              className="h-11 min-w-[48px] shrink-0 rounded-xl border border-cyan-300/20 bg-cyan-500/10 px-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20 active:scale-[0.98]"
            >
              {num}
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto whitespace-nowrap pt-0.5">
          <button
            type="button"
            onClick={() => onInsert(" ")}
            className="h-11 shrink-0 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm font-medium transition hover:bg-white/[0.09] active:scale-[0.99]"
          >
            Space
          </button>
          <button
            type="button"
            onClick={onBackspace}
            className="h-11 shrink-0 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm font-medium transition hover:bg-white/[0.09] active:scale-[0.99]"
          >
            Backspace
          </button>
          <button
            type="button"
            onClick={onClear}
            className="h-11 shrink-0 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 text-sm font-medium text-rose-200 transition hover:bg-rose-500/20 active:scale-[0.99]"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-11 shrink-0 rounded-xl border border-white/15 bg-white/[0.03] px-3 text-sm font-medium transition hover:bg-white/[0.09]"
          >
            Close
          </button>
          {onSend ? (
            <button
              type="button"
              onClick={onSend}
              className="h-11 shrink-0 rounded-xl border border-cyan-400/35 bg-cyan-500/10 px-3 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/20"
            >
              Send
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
