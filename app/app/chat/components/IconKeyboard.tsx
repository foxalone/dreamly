import { useEffect, useMemo, useRef, useState } from "react";
import {
  DREAM_EMOJI_CATEGORIES,
  type DreamEmojiCategory,
  type DreamEmojiItem,
} from "../iconComposer";

export type IconKeyboardProps = {
  open: boolean;
  onInsert: (token: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onClose: () => void;
  recentItems?: DreamEmojiItem[];
};

type SectionKey = DreamEmojiCategory;

function IconKeyButton({
  label,
  title,
  onClick,
}: {
  label: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className="
        flex h-10 w-full items-center justify-center rounded-xl
        border text-[16px] leading-none transition
        hover:scale-[1.03] active:scale-[0.95]
        sm:h-11 sm:text-[18px]
      "
      style={{
        borderColor: "var(--border)",
        background: "color-mix(in srgb, var(--text) 4%, var(--card))",
        color: "var(--text)",
      }}
    >
      {label}
    </button>
  );
}

function ActionButton({
  title,
  onClick,
  danger = false,
  children,
}: {
  title: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  const style = danger
    ? {
        borderColor: "rgba(239, 68, 68, 0.28)",
        background: "rgba(239, 68, 68, 0.12)",
        color: "rgba(239, 68, 68, 0.92)",
      }
    : {
        borderColor: "var(--border)",
        background: "color-mix(in srgb, var(--text) 4%, var(--card))",
        color: "var(--muted)",
      };

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className="
        flex h-10 min-w-0 flex-1 items-center justify-center rounded-xl border
        transition hover:scale-[1.03] active:scale-[0.95]
      "
      style={style}
    >
      {children}
    </button>
  );
}

function NumberButton({
  value,
  onClick,
}: {
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        flex h-10 items-center justify-center rounded-xl border
        text-sm font-semibold transition
        hover:scale-[1.03] active:scale-[0.95]
      "
      style={{
        borderColor: "color-mix(in srgb, #22d3ee 45%, var(--border))",
        background: "color-mix(in srgb, #22d3ee 14%, var(--card))",
        color: "color-mix(in srgb, #22d3ee 78%, var(--text))",
      }}
    >
      {value}
    </button>
  );
}

function CategoryTabButton({
  label,
  title,
  active,
  onClick,
}: {
  label: React.ReactNode;
  title: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className="
        flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border
        text-sm transition hover:scale-[1.03] active:scale-[0.95]
      "
      style={{
        borderColor: active
          ? "color-mix(in srgb, #22d3ee 45%, var(--border))"
          : "var(--border)",
        background: active
          ? "color-mix(in srgb, #22d3ee 14%, var(--card))"
          : "color-mix(in srgb, var(--text) 4%, var(--card))",
        color: active ? "var(--text)" : "var(--muted)",
      }}
    >
      {label}
    </button>
  );
}

function SpaceIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M4 15v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" />
      <path d="M4 15h16" />
    </svg>
  );
}

function BackspaceIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M21 6H9l-6 6 6 6h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2Z" />
      <path d="m10 10 4 4" />
      <path d="m14 10-4 4" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

const POPUP_NUMBERS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

export function IconKeyboard({
  open,
  onInsert,
  onBackspace,
  onClear,
  onClose,
  recentItems = [],
}: IconKeyboardProps) {
  const [showNumberPopup, setShowNumberPopup] = useState(false);
  const [activeTab, setActiveTab] = useState<SectionKey>("recent");

  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const numberButtonWrapRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const sections = useMemo(() => {
    const base = DREAM_EMOJI_CATEGORIES;
    const result: Array<{
      key: SectionKey;
      label: string;
      icon: string;
      items: DreamEmojiItem[];
    }> = [
      {
        key: "recent",
        label: "Recent",
        icon: "🕘",
        items: recentItems,
      },
      ...base,
    ];

    return result.filter((section) => section.items.length > 0 || section.key === "recent");
  }, [recentItems]);

  useEffect(() => {
    if (!open) {
      setShowNumberPopup(false);
      setActiveTab(recentItems.length ? "recent" : "smileys");
    }
  }, [open, recentItems.length]);

  useEffect(() => {
    if (!showNumberPopup) return;

    const onPointerDownOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!numberButtonWrapRef.current?.contains(target)) {
        setShowNumberPopup(false);
      }
    };

    document.addEventListener("mousedown", onPointerDownOutside);
    document.addEventListener("touchstart", onPointerDownOutside, {
      passive: true,
    });

    return () => {
      document.removeEventListener("mousedown", onPointerDownOutside);
      document.removeEventListener("touchstart", onPointerDownOutside);
    };
  }, [showNumberPopup]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;

    const handleScroll = () => {
      const rootTop = root.getBoundingClientRect().top;
      let bestKey: SectionKey = sections[0]?.key ?? "recent";
      let bestDistance = Number.POSITIVE_INFINITY;

      for (const section of sections) {
        const el = sectionRefs.current[section.key];
        if (!el) continue;

        const distance = Math.abs(el.getBoundingClientRect().top - rootTop - 8);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestKey = section.key;
        }
      }

      setActiveTab(bestKey);
    };

    handleScroll();
    root.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      root.removeEventListener("scroll", handleScroll);
    };
  }, [sections]);

  if (!open) return null;

  const startLongPress = () => {
    longPressTriggeredRef.current = false;

    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
    }

    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      setShowNumberPopup(true);
    }, 350);
  };

  const stopLongPress = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePrimaryNumberClick = () => {
    if (longPressTriggeredRef.current) return;
    onInsert("1");
  };

  const handlePickPopupNumber = (value: string) => {
    onInsert(value);
    setShowNumberPopup(false);
  };

  const scrollToSection = (key: SectionKey) => {
    const root = scrollRef.current;
    const target = sectionRefs.current[key];
    if (!root || !target) return;

    target.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    setActiveTab(key);
  };

  return (
    <div
      className="
        absolute bottom-full left-0 z-50 mb-3 w-full
        rounded-[28px] border p-3 shadow-2xl
      "
      style={{
        maxWidth: "min(980px, calc(100vw - 32px))",
        borderColor: "var(--border)",
        background: "color-mix(in srgb, var(--card) 96%, var(--bg))",
        boxShadow: "0 20px 50px rgba(0,0,0,0.22)",
      }}
    >
      <div className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
           
            {sections.map((section) => (
              <CategoryTabButton
                key={section.key}
                label={section.icon}
                title={section.label}
                active={activeTab === section.key}
                onClick={() => scrollToSection(section.key)}
              />
            ))}
          </div>

          <div
            ref={scrollRef}
            className="max-h-[34vh] overflow-y-auto overscroll-contain pr-1"
          >
            <div className="space-y-4">
              {sections.map((section) => (
                <div
                  key={section.key}
                  ref={(node) => {
                    sectionRefs.current[section.key] = node;
                  }}
                  className="space-y-2"
                >
                  <div
                    className="sticky top-0 z-[1] flex items-center gap-2 rounded-xl px-2 py-1.5 text-xs font-semibold"
                    style={{
                      background:
                        "color-mix(in srgb, var(--card) 92%, transparent)",
                      color: "var(--muted)",
                      backdropFilter: "blur(6px)",
                    }}
                  >
                    <span>{section.icon}</span>
                    <span>{section.label}</span>
                  </div>

                  {section.items.length ? (
                    <div className="grid grid-cols-6 gap-2 sm:grid-cols-7 md:grid-cols-8">
                      {section.items.map((item, emojiIndex) => (
                        <IconKeyButton
                          key={`${section.key}-${item.native}-${emojiIndex}`}
                          label={item.native}
                          title={item.name || item.id || "emoji"}
                          onClick={() => onInsert(item.native)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div
                      className="flex h-20 items-center justify-center rounded-2xl border text-sm"
                      style={{
                        borderColor: "var(--border)",
                        background:
                          "color-mix(in srgb, var(--text) 3%, var(--card))",
                        color: "var(--muted)",
                      }}
                    >
                      No recent icons yet
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div ref={numberButtonWrapRef} className="relative shrink-0">
            <button
              type="button"
              title="1"
              aria-label="1"
              onMouseDown={startLongPress}
              onMouseUp={stopLongPress}
              onMouseLeave={stopLongPress}
              onTouchStart={startLongPress}
              onTouchEnd={stopLongPress}
              onTouchCancel={stopLongPress}
              onClick={handlePrimaryNumberClick}
              className="
                flex h-10 min-w-[54px] items-center justify-center rounded-xl border
                px-3 text-sm font-semibold transition
                hover:scale-[1.03] active:scale-[0.95]
              "
              style={{
                borderColor: "color-mix(in srgb, #22d3ee 45%, var(--border))",
                background: "color-mix(in srgb, #22d3ee 14%, var(--card))",
                color: "color-mix(in srgb, #22d3ee 78%, var(--text))",
              }}
            >
              1
            </button>

            {showNumberPopup ? (
              <div
                className="absolute bottom-full left-0 z-20 mb-2 w-[188px] rounded-2xl border p-2 shadow-xl"
                style={{
                  borderColor: "var(--border)",
                  background: "color-mix(in srgb, var(--card) 98%, var(--bg))",
                  boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
                }}
              >
                <div className="grid grid-cols-3 gap-2">
                  {POPUP_NUMBERS.map((num) => (
                    <NumberButton
                      key={num}
                      value={num}
                      onClick={() => handlePickPopupNumber(num)}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <ActionButton title="Space" onClick={() => onInsert(" ")}>
            <SpaceIcon />
          </ActionButton>

          <ActionButton title="Backspace" onClick={onBackspace}>
            <BackspaceIcon />
          </ActionButton>

          <ActionButton title="Clear all" onClick={onClear} danger>
            <TrashIcon />
          </ActionButton>

          <ActionButton title="Close" onClick={onClose}>
            <CloseIcon />
          </ActionButton>
        </div>
      </div>
    </div>
  );
}