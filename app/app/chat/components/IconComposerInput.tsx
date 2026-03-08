import { KeyboardEvent } from "react";

type IconComposerInputProps = {
  value: string;
  onToggleKeyboard: () => void;
  onSend: () => void;
  sendDisabled: boolean;
};

export function IconComposerInput({ value, onToggleKeyboard, onSend, sendDisabled }: IconComposerInputProps) {
  function blockTyping(e: KeyboardEvent<HTMLTextAreaElement>) {
    const allowedNavigationKeys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Tab"];
    if (allowedNavigationKeys.includes(e.key)) return;
    e.preventDefault();
  }

  return (
    <div className="flex items-end gap-2">
      <button
        type="button"
        onClick={onToggleKeyboard}
        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--muted)] transition hover:bg-white/10 active:scale-[0.98]"
        aria-label="Toggle icon keyboard"
      >
        +
      </button>
      <textarea
        value={value}
        readOnly
        onKeyDown={blockTyping}
        rows={1}
        placeholder="Compose with icons only"
        className="max-h-32 min-h-[42px] flex-1 resize-y rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-base outline-none transition placeholder:text-[var(--muted)] focus:border-cyan-400/40"
      />
      <button
        type="button"
        onClick={onSend}
        disabled={sendDisabled}
        className="rounded-xl border border-cyan-400/35 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Send
      </button>
    </div>
  );
}
