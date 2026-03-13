import { KeyboardEvent } from "react";

type IconComposerInputProps = {
  value: string;
  onToggleKeyboard: () => void;
  onSend: () => void;
  sendDisabled: boolean;
};

export function IconComposerInput({
  value,
  onToggleKeyboard,
  onSend,
  sendDisabled,
}: IconComposerInputProps) {
  function blockTyping(e: KeyboardEvent<HTMLTextAreaElement>) {
    const allowedNavigationKeys = [
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Tab",
    ];
    if (allowedNavigationKeys.includes(e.key)) return;
    e.preventDefault();
  }

  return (
    <div className="flex items-end gap-2">
      <button
        type="button"
        onClick={onToggleKeyboard}
        aria-label="Toggle icon keyboard"
        className="rounded-xl border px-3 py-2 text-sm transition active:scale-[0.98]"
        style={{
          borderColor: "var(--border)",
          background: "color-mix(in srgb, var(--text) 4%, var(--card))",
          color: "var(--muted)",
        }}
      >
        +
      </button>

      <textarea
        value={value}
        readOnly
        onKeyDown={blockTyping}
        rows={1}
        placeholder=""
        className="max-h-32 min-h-[42px] flex-1 resize-y rounded-xl border px-3 py-2 text-base outline-none transition"
        style={{
          borderColor: "var(--border)",
          background: "color-mix(in srgb, var(--text) 4%, var(--card))",
          color: "var(--text)",
        }}
      />

      <button
        type="button"
        onClick={onSend}
        disabled={sendDisabled}
        className="rounded-xl border px-4 py-2 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed"
        style={
          sendDisabled
            ? {
                borderColor: "var(--border)",
                background: "color-mix(in srgb, var(--text) 3%, var(--card))",
                color: "var(--muted)",
                opacity: 0.6,
              }
            : {
                borderColor: "color-mix(in srgb, #22d3ee 40%, var(--border))",
                background: "color-mix(in srgb, #22d3ee 12%, var(--card))",
                color: "var(--text)",
              }
        }
      >
        Send
      </button>
    </div>
  );
}