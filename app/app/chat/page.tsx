"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { IconComposerInput } from "./components/IconComposerInput";
import { IconKeyboard } from "./components/IconKeyboard";
import { useRouter } from "next/navigation";
import {
  appendToken,
  DREAM_EMOJI_CATEGORIES,
  isValidIconMessage,
  sanitizeIconMessage,
} from "./iconComposer";
import {
  createOrGetDirectChat,
  ensureSupportChatForUser,
  SUPPORT_UID,
  markChatAsRead,
  sendChatMessage,
  setTyping,
  subscribeChatMessages,
  subscribeRecentIcons,
  subscribeTyping,
  subscribeUserChats,
} from "@/lib/chat/chatDb";
import { extractIcons } from "@/lib/chat/chatFormat";
import { setupPresence, subscribePresence } from "@/lib/chat/chatPresence";
import type { ChatPreview, ChatUser, UIMessage } from "@/lib/chat/chatTypes";

const supportContact: ChatUser & { avatarText: string } = {
  uid: SUPPORT_UID,
  displayName: "Dreamly",
  avatarText: "DR",
};

function cls(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [chatQuery, setChatQuery] = useState("");
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [selectedChatId, setSelectedChatId] = useState("");
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [iconKeyboardOpen, setIconKeyboardOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [recentIcons, setRecentIcons] = useState<string[]>([]);
  const [activePresenceOnline, setActivePresenceOnline] = useState(false);
  const [supportOnline, setSupportOnline] = useState(false);
  const requestedChatConsumedRef = useRef(false);
  const ensuredSupportChatUidRef = useRef<string | null>(null);

  const messagesListRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLFormElement | null>(null);
  const listPresenceUnsubsRef = useRef<Map<string, () => void>>(new Map());
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const chatScrollRaf1Ref = useRef<number | null>(null);
  const chatScrollRaf2Ref = useRef<number | null>(null);
  const chatMsgScrollRaf1Ref = useRef<number | null>(null);
  const chatMsgScrollRaf2Ref = useRef<number | null>(null);

const [requestedChatId, setRequestedChatId] = useState("");


useEffect(() => {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("chat") ?? "";
  setRequestedChatId(id);
}, []);



  const filteredChats = useMemo(() => {
    const q = chatQuery.trim().toLowerCase();
    if (!q) return chats;

    return chats.filter(
      (chat) =>
        chat.name.toLowerCase().includes(q) ||
        chat.lastMessage.toLowerCase().includes(q)
    );
  }, [chatQuery, chats]);

  const selectedChat = useMemo(
    () => chats.find((chat) => chat.id === selectedChatId) ?? null,
    [chats, selectedChatId]
  );

  const presenceKeys = useMemo(
    () => chats.slice(0, 12).map((chat) => chat.otherUid).join("|"),
    [chats]
  );

  const keyboardRef = useRef<HTMLDivElement | null>(null);

  const lastMessageId = messages.length ? messages[messages.length - 1].id : "";

  const recentEmojiItems = useMemo(() => {
    const allItems = DREAM_EMOJI_CATEGORIES.flatMap((category) => category.items);

    return recentIcons
      .map((native) => allItems.find((item) => item.native === native))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [recentIcons]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setChats([]);
        setMessages([]);
        setSelectedChatId("");
      }
      setAuthReady(true);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    return setupPresence(user);
  }, [user]);

  useEffect(() => {
    if (!user?.uid || user.uid === SUPPORT_UID) return;
    if (ensuredSupportChatUidRef.current === user.uid) return;

    ensuredSupportChatUidRef.current = user.uid;
    void ensureSupportChatForUser({
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
    }).catch((error) => {
      console.error("ensureSupportChatForUser failed", error);
      ensuredSupportChatUidRef.current = null;
    });
  }, [user?.uid, user?.displayName, user?.email, user?.photoURL]);

  useEffect(() => {
    if (!user?.uid) return;

    return subscribeUserChats(user.uid, (incomingChats) => {
      setChats((prev) => {
        const onlineByUid = new Map(prev.map((item) => [item.otherUid, item.online ?? false]));
        const typingByUid = new Map(prev.map((item) => [item.otherUid, item.typing ?? false]));

        return incomingChats.map((chat) => ({
          ...chat,
          online: onlineByUid.get(chat.otherUid) ?? false,
          typing: typingByUid.get(chat.otherUid) ?? false,
        }));
      });

     setSelectedChatId((current) => {
  if (!incomingChats.length) return "";

  if (
    !requestedChatConsumedRef.current &&
    requestedChatId &&
    incomingChats.some((chat) => chat.id === requestedChatId)
  ) {
    requestedChatConsumedRef.current = true;
    return requestedChatId;
  }

  if (current && incomingChats.some((chat) => chat.id === current)) {
    return current;
  }

  return incomingChats[0].id;
});
    });
}, [user?.uid, requestedChatId]);

useEffect(() => {
  if (!selectedChatId) return;
  if (!requestedChatId) return;
  if (selectedChatId !== requestedChatId) return;

  router.replace("/app/chat");
}, [selectedChatId, requestedChatId, router]);

useEffect(() => {
  if (!requestedChatId) return;
  if (selectedChatId !== requestedChatId) return;
  setMobileView("chat");
}, [requestedChatId, selectedChatId]);

  useEffect(() => {
    const bucket = listPresenceUnsubsRef.current;
    for (const unsub of bucket.values()) unsub();
    bucket.clear();

    const topChats = chats.slice(0, 12);

    topChats.forEach((chat) => {
      const unsub = subscribePresence(chat.otherUid, (presence) => {
        const online = Boolean(presence?.online);

        setChats((prev) => {
          let changed = false;

          const next = prev.map((item) => {
            if (item.otherUid !== chat.otherUid) return item;
            if ((item.online ?? false) === online) return item;

            changed = true;
            return { ...item, online };
          });

          return changed ? next : prev;
        });
      });

      bucket.set(chat.otherUid, unsub);
    });

    return () => {
      for (const unsub of bucket.values()) unsub();
      bucket.clear();
    };
  }, [presenceKeys]);

  useEffect(() => {
    if (!user?.uid || !selectedChatId) return;

    return subscribeChatMessages(selectedChatId, user.uid, (nextMessages) => {
      setMessages(nextMessages);
    });
  }, [selectedChatId, user?.uid]);

  useEffect(() => {
    if (!user?.uid || !selectedChatId) return;
    void markChatAsRead(selectedChatId, user.uid);
  }, [selectedChatId, user?.uid, messages.length]);

  useEffect(() => {
    if (!user?.uid || !selectedChat) return;

    const unsubPresence = subscribePresence(selectedChat.otherUid, (presence) => {
      setActivePresenceOnline(Boolean(presence?.online));
    });

    const unsubTyping = subscribeTyping(selectedChat.id, selectedChat.otherUid, (typing) => {
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === selectedChat.id ? { ...chat, typing } : chat
        )
      );
    });

    return () => {
      unsubPresence();
      unsubTyping();
    };
  }, [selectedChat, user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeRecentIcons(user.uid, setRecentIcons);
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid || user.uid === SUPPORT_UID) return;

    return subscribePresence(SUPPORT_UID, (presence) => {
      setSupportOnline(Boolean(presence?.online));
    });
  }, [user?.uid]);

  useEffect(() => {
    if (!iconKeyboardOpen) return;

    const handleOutsidePointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
if (
  composerRef.current?.contains(target) ||
  keyboardRef.current?.contains(target)
) {
  return;
}
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
    if (!user?.uid || !selectedChatId) return;

    const hasDraft = sanitizeIconMessage(draft).length > 0;
    void setTyping(selectedChatId, user.uid, hasDraft);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      void setTyping(selectedChatId, user.uid, false);
    }, 1200);

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [draft, selectedChatId, user?.uid]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (user?.uid && selectedChatId) {
        void setTyping(selectedChatId, user.uid, false);
      }
    };
  }, [selectedChatId, user?.uid]);

  function onScrollMessages(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldAutoScrollRef.current = distance < 120;
  }

  function onSendMessage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void onSendCurrentDraft();
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

  async function onSendCurrentDraft() {
    if (!user || !selectedChat) return;

    const text = sanitizeIconMessage(draft);
    if (!isValidIconMessage(text) || !selectedChatId) return;

    const ok = await sendChatMessage({
      chatId: selectedChatId,
      currentUser: user,
      otherUser: {
        uid: selectedChat.otherUid,
        displayName: selectedChat.name,
        photoURL: selectedChat.photoURL,
      },
      text,
      icons: extractIcons(text),
    }).catch((error) => {
      console.error("sendChatMessage failed", error);
      return false;
    });

    if (!ok) return;

    setDraft("");
    setIconKeyboardOpen(false);
    await setTyping(selectedChatId, user.uid, false);
    scrollMessagesToBottom("smooth");
  }

  function onSelectChat(chatId: string) {
    shouldAutoScrollRef.current = true;
    setSelectedChatId(chatId);
    setMobileView("chat");
  }

  function scrollMessagesToBottom(behavior: ScrollBehavior = "auto") {
    const el = messagesListRef.current;
    if (!el) return;

    el.scrollTo({
      top: el.scrollHeight,
      behavior,
    });
  }

  useLayoutEffect(() => {
    if (!selectedChatId) return;

    shouldAutoScrollRef.current = true;

    const id1 = requestAnimationFrame(() => {
      const id2 = requestAnimationFrame(() => {
        scrollMessagesToBottom("auto");
      });

      chatScrollRaf2Ref.current = id2;
    });

    chatScrollRaf1Ref.current = id1;

    return () => {
      if (chatScrollRaf1Ref.current !== null) cancelAnimationFrame(chatScrollRaf1Ref.current);
      if (chatScrollRaf2Ref.current !== null) cancelAnimationFrame(chatScrollRaf2Ref.current);
    };
  }, [selectedChatId, mobileView]);

  useLayoutEffect(() => {
    if (!selectedChatId) return;
    if (!lastMessageId) return;
    if (!shouldAutoScrollRef.current) return;

    const id1 = requestAnimationFrame(() => {
      const id2 = requestAnimationFrame(() => {
        scrollMessagesToBottom("smooth");
      });

      chatMsgScrollRaf2Ref.current = id2;
    });

    chatMsgScrollRaf1Ref.current = id1;

    return () => {
      if (chatMsgScrollRaf1Ref.current !== null) cancelAnimationFrame(chatMsgScrollRaf1Ref.current);
      if (chatMsgScrollRaf2Ref.current !== null) cancelAnimationFrame(chatMsgScrollRaf2Ref.current);
    };
  }, [selectedChatId, lastMessageId, mobileView]);

  async function onStartSeedContactChat(contact: ChatUser) {
    if (!user) return;

    const chatId = await createOrGetDirectChat(
      {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
      },
      contact
    );

    if (!chatId) return;
    onSelectChat(chatId);
  }

  const showSupportStarter = Boolean(user?.uid && user.uid !== SUPPORT_UID);

  const chatsListPane = (
    <aside
      className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border p-3 sm:p-4"
      style={{
        borderColor: "var(--border)",
        background: "color-mix(in srgb, var(--text) 4%, var(--card))",
      }}
    >
      {!filteredChats.length && (
        <div className="mb-3 rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            No chats yet
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
            Message Dreamly for feedback, bugs, or questions.
          </p>

          {showSupportStarter ? (
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void onStartSeedContactChat(supportContact)}
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                <span className="relative inline-flex h-2.5 w-2.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      background: supportOnline ? "#10b981" : "var(--muted)",
                    }}
                  />
                </span>
                <span>{supportContact.displayName}</span>
              </button>
            </div>
          ) : null}
        </div>
      )}

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
                        background: chat.online ? "#10b981" : "#ef4444",
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
                      {chat.typing ? "typing…" : chat.lastMessage || "No messages yet"}
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

                <span
                  className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border"
                  style={{
                    borderColor: "var(--card)",
                    background: activePresenceOnline ? "#10b981" : "#ef4444",
                  }}
                />
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

          <div
            ref={messagesListRef}
            className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4"
            onScroll={onScrollMessages}
          >
            <div className="space-y-3">
              {messages.map((message) => {
                const iconOnly = message.type === "icons";

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
            </div>
          </div>

          <form
            ref={composerRef}
            onSubmit={onSendMessage}
            className="relative shrink-0 border-t p-3 pb-4 sm:p-4 sm:pb-5"
            style={{ borderColor: "var(--border)" }}
          >
           <IconKeyboard
  ref={keyboardRef}
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
              onSend={() => void onSendCurrentDraft()}
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

  if (authReady && !user) {
    return (
      <main className="mx-auto h-[calc(100dvh-92px)] w-full max-w-6xl overflow-hidden px-4 sm:px-6 lg:px-8">
        <section className="flex h-full items-center justify-center rounded-3xl border p-6" style={{ borderColor: "var(--border)" }}>
          <p style={{ color: "var(--muted)" }}>Sign in to use chat.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto h-[calc(100dvh-92px)] w-full max-w-6xl overflow-hidden px-4 sm:px-6 lg:px-8">
      <section
        className="flex h-full min-h-0 flex-col gap-4 overflow-hidden rounded-3xl border p-4 sm:gap-5 sm:p-5"
        style={{
          borderColor: "var(--border)",
          background: "color-mix(in srgb, var(--card) 94%, transparent)",
        }}
      >
        <header
          className={cls(
            "shrink-0 flex flex-col gap-3 border-b pb-4",
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
              onClick={() => router.push("/app/chat/add-friend")}
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
