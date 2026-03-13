"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IconComposerInput } from "./components/IconComposerInput";
import { IconKeyboard } from "./components/IconKeyboard";
import {
  appendToken,
  DREAM_EMOJI_CATEGORIES,
  isValidIconMessage,
  sanitizeIconMessage,
} from "./iconComposer";

type ChatItem = {
  id: string;
  name: string;
  avatarText: string;
  lastMessage: string;
  time: string;
  unreadCount?: number;
  online?: boolean;
};

type Message = {
  id: string;
  chatId: string;
  text: string;
  time: string;
  mine: boolean;
};

const initialChats: ChatItem[] = [
  {
    id: "michael",
    name: "Michael",
    avatarText: "MI",
    lastMessage: "That dream felt too real 😮",
    time: "09:42",
    unreadCount: 2,
    online: true,
  },
  {
    id: "anna",
    name: "Anna",
    avatarText: "AN",
    lastMessage: "Send me your journal note later",
    time: "08:27",
    online: true,
  },
  {
    id: "dream-group",
    name: "Dream Group",
    avatarText: "DG",
    lastMessage: "Tonight theme: flying dreams",
    time: "Yesterday",
    unreadCount: 5,
  },
  {
    id: "mike",
    name: "Mike",
    avatarText: "MK",
    lastMessage: "I saw the same symbol too",
    time: "Yesterday",
  },
  {
    id: "sara",
    name: "Sara",
    avatarText: "SA",
    lastMessage: "Good night 🌙",
    time: "Mon",
    online: true,
  },
  {
    id: "family",
    name: "Family",
    avatarText: "FA",
    lastMessage: "Dinner tomorrow at 7",
    time: "Sun",
    unreadCount: 1,
  },
  {
    id: "work",
    name: "Work",
    avatarText: "WK",
    lastMessage: "Reminder: review notes",
    time: "Sun",
  },
  {
    id: "lucid-dreamers",
    name: "Lucid Dreamers",
    avatarText: "LD",
    lastMessage: "Try reality checks every hour",
    time: "Sat",
    unreadCount: 3,
  },
];

const initialMessages: Message[] = [
  {
    id: "1",
    chatId: "michael",
    text: "Hey! Did you write down your dream?",
    time: "09:33",
    mine: false,
  },
  {
    id: "2",
    chatId: "michael",
    text: "Yep, just now. It had a giant blue moon.",
    time: "09:35",
    mine: true,
  },
  {
    id: "3",
    chatId: "michael",
    text: "That dream felt too real 😮",
    time: "09:42",
    mine: false,
  },
  {
    id: "4",
    chatId: "anna",
    text: "Morning!",
    time: "08:10",
    mine: false,
  },
  {
    id: "5",
    chatId: "anna",
    text: "Morning, Anna 👋",
    time: "08:12",
    mine: true,
  },
  {
    id: "6",
    chatId: "dream-group",
    text: "Tonight theme: flying dreams",
    time: "21:18",
    mine: false,
  },
];

function cls(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function ChatPage() {
  const [chatQuery, setChatQuery] = useState("");
  const [selectedChatId, setSelectedChatId] = useState(
    initialChats[0]?.id ?? ""
  );
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [iconKeyboardOpen, setIconKeyboardOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [recentIcons, setRecentIcons] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLFormElement | null>(null);

  const filteredChats = useMemo(() => {
    const q = chatQuery.trim().toLowerCase();
    if (!q) return initialChats;

    return initialChats.filter(
      (chat) =>
        chat.name.toLowerCase().includes(q) ||
        chat.lastMessage.toLowerCase().includes(q)
    );
  }, [chatQuery]);

  const selectedChat = useMemo(
    () => initialChats.find((chat) => chat.id === selectedChatId) ?? null,
    [selectedChatId]
  );

  const selectedMessages = useMemo(
    () => messages.filter((message) => message.chatId === selectedChatId),
    [messages, selectedChatId]
  );

  const recentEmojiItems = useMemo(() => {
    const allItems = DREAM_EMOJI_CATEGORIES.flatMap((category) => category.items);

    return recentIcons
      .map((native) => allItems.find((item) => item.native === native))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [recentIcons]);

  useEffect(() => {
    if (!iconKeyboardOpen) return;

    const handleOutsidePointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (composerRef.current?.contains(target)) return;
      setIconKeyboardOpen(false);
    };

    document.addEventListener("mousedown", handleOutsidePointer);
    document.addEventListener("touchstart", handleOutsidePointer, {
      passive: true,
    });

    return () => {
      document.removeEventListener("mousedown", handleOutsidePointer);
      document.removeEventListener("touchstart", handleOutsidePointer);
    };
  }, [iconKeyboardOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [selectedChatId, selectedMessages.length]);

  useEffect(() => {
    if (!showInvite || !inviteCopied) return;
    const t = setTimeout(() => setInviteCopied(false), 1400);
    return () => clearTimeout(t);
  }, [showInvite, inviteCopied]);

  function onSendMessage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSendCurrentDraft();
  }

  function onInsertToken(token: string) {
    if (token !== " ") {
      setRecentIcons((prev) => {
        const next = [token, ...prev.filter((x) => x !== token)];
        return next.slice(0, 24);
      });
    }

    if (token === " ") {
      setDraft((prev) => `${prev.trimEnd()} `);
      return;
    }

    setDraft((prev) => appendToken(prev, token));
  }

  function onBackspaceToken() {
    setDraft((prev) => {
      const trimmed = prev.trimEnd();
      if (!trimmed) return "";
      const parts = trimmed.split(" ");
      parts.pop();
      return parts.join(" ");
    });
  }

  function onSendCurrentDraft() {
    const text = sanitizeIconMessage(draft);
    if (!isValidIconMessage(text) || !selectedChatId) return;

    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;

    setMessages((prev) => [
      ...prev,
      {
        id: String(now.getTime()),
        chatId: selectedChatId,
        text,
        time,
        mine: true,
      },
    ]);

    setDraft("");
    setIconKeyboardOpen(false);
  }

  async function onCopyInviteLink() {
    const inviteUrl = "https://dreamly.app/invite/dream-chat";
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setInviteCopied(true);
    } catch {
      setInviteCopied(false);
    }
  }

  function onSelectChat(chatId: string) {
    setSelectedChatId(chatId);
    setMobileView("chat");
  }

  const chatsListPane = (
    <aside
      className="flex h-full min-h-0 min-w-0 flex-col rounded-2xl border p-3 sm:p-4"
      style={{
        borderColor: "var(--border)",
        background: "color-mix(in srgb, var(--text) 4%, var(--card))",
      }}
    >
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {filteredChats.map((chat) => {
          const active = chat.id === selectedChatId;

          return (
            <button
              key={chat.id}
              type="button"
              onClick={() => onSelectChat(chat.id)}
              className="w-full rounded-2xl border p-3 text-left transition"
              style={
                active
                  ? {
                      borderColor:
                        "color-mix(in srgb, #22d3ee 50%, var(--border))",
                      background:
                        "color-mix(in srgb, #22d3ee 12%, var(--card))",
                    }
                  : {
                      borderColor: "var(--border)",
                      background:
                        "color-mix(in srgb, var(--text) 3%, var(--card))",
                    }
              }
            >
              <div className="flex items-start gap-3">
                <div className="relative">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold"
                    style={{
                      background:
                        "color-mix(in srgb, var(--text) 6%, var(--card))",
                      color: "var(--text)",
                    }}
                  >
                    {chat.avatarText}
                  </div>
                  {chat.online && (
                    <span
                      className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border"
                      style={{
                        borderColor: "var(--card)",
                        background: "#10b981",
                      }}
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className="truncate text-sm font-medium"
                      style={{ color: "var(--text)" }}
                    >
                      {chat.name}
                    </p>
                    <span
                      className="text-[10px]"
                      style={{ color: "var(--muted)" }}
                    >
                      {chat.time}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p
                      className="truncate text-xs"
                      style={{ color: "var(--muted)" }}
                    >
                      {chat.lastMessage}
                    </p>
                    {chat.unreadCount ? (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{
                          background:
                            "color-mix(in srgb, #22d3ee 18%, transparent)",
                          color:
                            "color-mix(in srgb, #22d3ee 78%, var(--text))",
                        }}
                      >
                        {chat.unreadCount}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );

  const conversationPane = (isMobile: boolean) => (
    <section
      className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border"
      style={{
        borderColor: "var(--border)",
        background: "color-mix(in srgb, var(--text) 4%, var(--card))",
      }}
    >
      {selectedChat ? (
        <>
          <div
            className="shrink-0 flex items-center justify-between border-b p-3 sm:p-4"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              {isMobile && (
                <button
                  type="button"
                  onClick={() => setMobileView("list")}
                  className="shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition"
                  style={{
                    borderColor: "var(--border)",
                    background:
                      "color-mix(in srgb, var(--text) 4%, transparent)",
                    color: "var(--text)",
                  }}
                >
                  ← Back
                </button>
              )}

              <div
                className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                style={{
                  background:
                    "color-mix(in srgb, var(--text) 6%, var(--card))",
                  color: "var(--text)",
                }}
              >
                {selectedChat.avatarText}
                {selectedChat.online && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border"
                    style={{
                      borderColor: "var(--card)",
                      background: "#10b981",
                    }}
                  />
                )}
              </div>
            </div>

            <div
              className="ml-2 flex shrink-0 items-center gap-2"
              style={{ color: "var(--muted)" }}
            >
              <button
                type="button"
                className="rounded-full border px-2.5 py-1 text-xs transition"
                style={{
                  borderColor: "var(--border)",
                  background: "transparent",
                  color: "var(--muted)",
                }}
              >
                ⋯
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
            <div className="space-y-3">
              {selectedMessages.map((message) => {
                const iconOnly = isValidIconMessage(message.text);

                return (
                  <div
                    key={message.id}
                    className={cls(
                      "flex",
                      message.mine ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cls(
                        "max-w-[85%] rounded-2xl px-3 py-2 sm:max-w-[70%]",
                        message.mine ? "chat-bubble-out" : "chat-bubble-in"
                      )}
                      style={{
                        borderRadius: message.mine
                          ? "1rem 1rem 0.375rem 1rem"
                          : "1rem 1rem 1rem 0.375rem",
                      }}
                    >
                      <p
                        className={cls(
                          "break-words leading-relaxed",
                          iconOnly ? "text-xl tracking-wide" : "text-sm"
                        )}
                      >
                        {message.text}
                      </p>
                      <p className="chat-bubble-time mt-1 text-right text-[10px]">
                        {message.time}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <form
            ref={composerRef}
            onSubmit={onSendMessage}
            className="relative shrink-0 border-t p-3 pb-4 sm:p-4 sm:pb-5"
            style={{ borderColor: "var(--border)" }}
          >
            <IconKeyboard
              open={iconKeyboardOpen}
              onInsert={onInsertToken}
              onBackspace={onBackspaceToken}
              onClear={() => setDraft("")}
              onClose={() => setIconKeyboardOpen(false)}
              recentItems={recentEmojiItems}
            />

            <IconComposerInput
              value={draft}
              onToggleKeyboard={() => setIconKeyboardOpen((v) => !v)}
              onSend={onSendCurrentDraft}
              sendDisabled={!isValidIconMessage(sanitizeIconMessage(draft))}
            />
          </form>
        </>
      ) : (
        <div className="flex h-full items-center justify-center p-6 text-center">
          <div>
            <p
              className="text-base font-medium"
              style={{ color: "var(--text)" }}
            >
              No chat selected
            </p>
            <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
              Pick a chat from the left to start messaging.
            </p>
          </div>
        </div>
      )}
    </section>
  );

  return (
    <main className="mx-auto h-[calc(100dvh-96px)] w-full max-w-6xl overflow-hidden px-4 pt-5 sm:px-6 lg:px-8">
      <section
        className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border p-4 sm:p-5"
        style={{
          borderColor: "var(--border)",
          background: "color-mix(in srgb, var(--card) 94%, transparent)",
        }}
      >
        <header
          className={cls(
            "mb-4 shrink-0 flex flex-col gap-3 border-b pb-4 sm:mb-5",
            mobileView === "chat" && "hidden lg:flex"
          )}
          style={{ borderColor: "var(--border)" }}
        >
          <div>
            <h1
              className="text-2xl font-semibold tracking-tight"
              style={{ color: "var(--text)" }}
            >
              Chat
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search chats"
              value={chatQuery}
              onChange={(e) => setChatQuery(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm outline-none transition"
              style={{
                borderColor: "var(--border)",
                background: "color-mix(in srgb, var(--text) 4%, var(--card))",
                color: "var(--text)",
              }}
            />

            <button
              type="button"
              onClick={() => setShowInvite((v) => !v)}
              aria-label="Add friend"
              title="Add friend"
              className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border transition"
              style={{
                borderColor: "color-mix(in srgb, #22d3ee 40%, var(--border))",
                background: "color-mix(in srgb, #22d3ee 12%, var(--card))",
                color: "color-mix(in srgb, #22d3ee 78%, var(--text))",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
                <circle cx="9.5" cy="7" r="4" />
                <path d="M19 8v6" />
                <path d="M16 11h6" />
              </svg>
            </button>
          </div>
        </header>

        {showInvite && mobileView === "list" && (
          <div
            className="mb-4 shrink-0 rounded-2xl border p-3 sm:mb-5 sm:p-4"
            style={{
              borderColor: "var(--border)",
              background: "color-mix(in srgb, var(--text) 4%, var(--card))",
            }}
          >
            <div>
              <h2
                className="mb-2 text-sm font-semibold"
                style={{ color: "var(--text)" }}
              >
                Invite a friend
              </h2>
              <p className="mb-3 text-xs" style={{ color: "var(--muted)" }}>
                Invite friends to chat about dreams and shared stories.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  readOnly
                  value="https://dreamly.app/invite/dream-chat"
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                  style={{
                    borderColor: "var(--border)",
                    background:
                      "color-mix(in srgb, var(--bg) 82%, var(--card))",
                    color: "var(--muted)",
                  }}
                />
                <button
                  type="button"
                  onClick={onCopyInviteLink}
                  className="rounded-xl border px-4 py-2 text-sm font-medium transition"
                  style={{
                    borderColor:
                      "color-mix(in srgb, #22d3ee 40%, var(--border))",
                    background:
                      "color-mix(in srgb, #22d3ee 12%, var(--card))",
                    color: "color-mix(in srgb, #22d3ee 78%, var(--text))",
                  }}
                >
                  {inviteCopied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div
          className={cls(
            "mb-4 min-h-0 flex-1 overflow-hidden lg:hidden",
            mobileView === "chat" && "hidden"
          )}
        >
          {mobileView === "list" && chatsListPane}
        </div>

        <div
          className={cls(
            "min-h-0 flex-1 overflow-hidden lg:hidden",
            mobileView !== "chat" && "hidden"
          )}
        >
          {mobileView === "chat" && conversationPane(true)}
        </div>

        <div className="hidden min-h-0 flex-1 gap-4 overflow-hidden lg:grid lg:grid-cols-[340px_minmax(0,1fr)]">
          {chatsListPane}
          {conversationPane(false)}
        </div>
      </section>
    </main>
  );
}