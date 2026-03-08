"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { IconComposerInput } from "./components/IconComposerInput";
import { IconKeyboard } from "./components/IconKeyboard";
import { appendToken, isValidIconMessage, sanitizeIconMessage } from "./iconComposer";

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

type Contact = {
  id: string;
  name: string;
  avatarText: string;
  status: string;
};

const initialChats: ChatItem[] = [
  { id: "michael", name: "Michael", avatarText: "MI", lastMessage: "That dream felt too real 😮", time: "09:42", unreadCount: 2, online: true },
  { id: "anna", name: "Anna", avatarText: "AN", lastMessage: "Send me your journal note later", time: "08:27", online: true },
  { id: "dream-group", name: "Dream Group", avatarText: "DG", lastMessage: "Tonight theme: flying dreams", time: "Yesterday", unreadCount: 5 },
  { id: "mike", name: "Mike", avatarText: "MK", lastMessage: "I saw the same symbol too", time: "Yesterday" },
  { id: "sara", name: "Sara", avatarText: "SA", lastMessage: "Good night 🌙", time: "Mon", online: true },
  { id: "family", name: "Family", avatarText: "FA", lastMessage: "Dinner tomorrow at 7", time: "Sun", unreadCount: 1 },
  { id: "work", name: "Work", avatarText: "WK", lastMessage: "Reminder: review notes", time: "Sun" },
  { id: "lucid-dreamers", name: "Lucid Dreamers", avatarText: "LD", lastMessage: "Try reality checks every hour", time: "Sat", unreadCount: 3 },
];

const initialMessages: Message[] = [
  { id: "1", chatId: "michael", text: "Hey! Did you write down your dream?", time: "09:33", mine: false },
  { id: "2", chatId: "michael", text: "Yep, just now. It had a giant blue moon.", time: "09:35", mine: true },
  { id: "3", chatId: "michael", text: "That dream felt too real 😮", time: "09:42", mine: false },
  { id: "4", chatId: "anna", text: "Morning!", time: "08:10", mine: false },
  { id: "5", chatId: "anna", text: "Morning, Anna 👋", time: "08:12", mine: true },
  { id: "6", chatId: "dream-group", text: "Tonight theme: flying dreams", time: "21:18", mine: false },
];

const contacts: Contact[] = [
  { id: "c1", name: "Olivia", avatarText: "OL", status: "dream buddy" },
  { id: "c2", name: "Noah", avatarText: "NO", status: "online" },
  { id: "c3", name: "Emma", avatarText: "EM", status: "sharing lucid notes" },
  { id: "c4", name: "Liam", avatarText: "LI", status: "dream buddy" },
];

function cls(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function ChatPage() {
  const [chatQuery, setChatQuery] = useState("");
  const [selectedChatId, setSelectedChatId] = useState(initialChats[0]?.id ?? "");
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [showContacts, setShowContacts] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [iconKeyboardOpen, setIconKeyboardOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [selectedChatId, selectedMessages.length]);

  useEffect(() => {
    if (!showInvite || !inviteCopied) return;
    const t = setTimeout(() => setInviteCopied(false), 1400);
    return () => clearTimeout(t);
  }, [showInvite, inviteCopied]);

  function onSendMessage(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSendCurrentDraft();
  }

  function onInsertToken(token: string) {
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
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

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

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-32 pt-5 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-white/10 bg-[color:color-mix(in_srgb,var(--card)_94%,transparent)] p-4 sm:p-5">
        <header className="mb-4 flex flex-col gap-3 border-b border-white/10 pb-4 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Chat</h1>
            <p className="text-sm text-[var(--muted)]">Talk with friends about dreams</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowContacts((v) => !v);
                setShowInvite(false);
              }}
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium transition hover:bg-white/10"
            >
              Contacts
            </button>
            <button
              type="button"
              onClick={() => {
                setShowInvite((v) => !v);
                setShowContacts(false);
              }}
              className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-300 transition hover:bg-cyan-500/15"
            >
              Invite friend
            </button>
          </div>
        </header>

        {(showContacts || showInvite) && (
          <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-3 sm:mb-5 sm:p-4">
            {showContacts ? (
              <div>
                <h2 className="mb-3 text-sm font-semibold">Contacts</h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  {contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
                          {contact.avatarText}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{contact.name}</p>
                          <p className="text-xs text-[var(--muted)]">{contact.status}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium transition hover:bg-white/10"
                      >
                        Open chat
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <h2 className="mb-2 text-sm font-semibold">Invite a friend</h2>
                <p className="mb-3 text-xs text-[var(--muted)]">
                  Invite friends to chat about dreams and shared stories.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    readOnly
                    value="https://dreamly.app/invite/dream-chat"
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-[var(--muted)] outline-none"
                  />
                  <button
                    type="button"
                    onClick={onCopyInviteLink}
                    className="rounded-xl border border-cyan-400/35 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-300 transition hover:bg-cyan-500/20"
                  >
                    {inviteCopied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-white/10 bg-black/20 p-3 sm:p-4">
            <input
              type="text"
              placeholder="Search chats"
              value={chatQuery}
              onChange={(e) => setChatQuery(e.target.value)}
              className="mb-3 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none transition placeholder:text-[var(--muted)] focus:border-cyan-400/40"
            />

            <div className="max-h-[58vh] space-y-2 overflow-auto pr-1">
              {filteredChats.map((chat) => {
                const active = chat.id === selectedChatId;
                return (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => setSelectedChatId(chat.id)}
                    className={cls(
                      "w-full rounded-2xl border p-3 text-left transition",
                      active
                        ? "border-cyan-400/45 bg-cyan-500/10"
                        : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
                          {chat.avatarText}
                        </div>
                        {chat.online && (
                          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-[var(--card)] bg-emerald-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium">{chat.name}</p>
                          <span className="text-[10px] text-[var(--muted)]">{chat.time}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <p className="truncate text-xs text-[var(--muted)]">{chat.lastMessage}</p>
                          {chat.unreadCount ? (
                            <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold text-cyan-200">
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

          <section className="flex min-h-[58vh] flex-col rounded-2xl border border-white/10 bg-black/20">
            {selectedChat ? (
              <>
                <div className="flex items-center justify-between border-b border-white/10 p-3 sm:p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
                      {selectedChat.avatarText}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{selectedChat.name}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {selectedChat.online ? "online" : "last seen recently"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--muted)]">
                    <button type="button" className="rounded-full border border-white/10 px-2.5 py-1 text-xs hover:bg-white/10">⋯</button>
                  </div>
                </div>

                <div className="flex-1 space-y-3 overflow-auto p-3 sm:p-4">
                  {selectedMessages.map((message) => {
                    const iconOnly = isValidIconMessage(message.text);
                    return (
                      <div
                        key={message.id}
                        className={cls("flex", message.mine ? "justify-end" : "justify-start")}
                      >
                        <div
                          className={cls(
                            "max-w-[85%] rounded-2xl px-3 py-2 sm:max-w-[70%]",
                            message.mine
                              ? "rounded-br-md bg-cyan-500/20 text-cyan-100"
                              : "rounded-bl-md border border-white/10 bg-white/5"
                          )}
                        >
                          <p
                            className={cls(
                              "leading-relaxed break-words",
                              iconOnly ? "text-xl tracking-wide" : "text-sm"
                            )}
                          >
                            {message.text}
                          </p>
                          <p className="mt-1 text-right text-[10px] text-[var(--muted)]">{message.time}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <form
                  onSubmit={onSendMessage}
                  className="border-t border-white/10 p-3 pb-4 sm:p-4 sm:pb-5"
                >
                  <IconKeyboard
                    open={iconKeyboardOpen}
                    value={draft}
                    onInsert={onInsertToken}
                    onBackspace={onBackspaceToken}
                    onClear={() => setDraft("")}
                    onClose={() => setIconKeyboardOpen(false)}
                    onSend={onSendCurrentDraft}
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
              <div className="flex h-full min-h-[58vh] items-center justify-center p-6 text-center">
                <div>
                  <p className="text-base font-medium">No chat selected</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">Pick a chat from the left to start messaging.</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
