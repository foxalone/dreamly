import { getDatabase, get, onValue, push, ref, runTransaction, set, update } from "firebase/database";
import type { User } from "firebase/auth";
import app from "@/lib/firebase";
import { sanitizeIconMessage } from "@/app/app/chat/iconComposer";
import { buildAvatarText, detectMessageType, extractIcons, formatMessageTime } from "./chatFormat";
import type { ChatMessageRecord, ChatPreview, ChatUser, UIMessage, UserChatRecord } from "./chatTypes";

const db = getDatabase(app);

export function getChatId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join("__");
}

export async function createOrGetDirectChat(currentUser: ChatUser, otherUser: ChatUser): Promise<string | null> {
  if (!currentUser.uid || !otherUser.uid || currentUser.uid === otherUser.uid) {
    return null;
  }

  const chatId = getChatId(currentUser.uid, otherUser.uid);
  const now = Date.now();
  const chatRef = ref(db, `chats/${chatId}`);
  const chatSnap = await get(chatRef);

  if (!chatSnap.exists()) {
    await set(chatRef, {
      createdAt: now,
      updatedAt: now,
      members: {
        [currentUser.uid]: true,
        [otherUser.uid]: true,
      },
    });
  }

  const currentChatRef = ref(db, `user_chats/${currentUser.uid}/${chatId}`);
  const otherChatRef = ref(db, `user_chats/${otherUser.uid}/${chatId}`);
  const currentSnap = await get(currentChatRef);

  if (!currentSnap.exists()) {
    await set(currentChatRef, {
      chatId,
      otherUid: otherUser.uid,
      otherName: otherUser.displayName ?? otherUser.email ?? "Unknown",
      otherPhotoURL: otherUser.photoURL ?? null,
      lastMessage: "",
      lastMessageType: "text",
      lastMessageAt: 0,
      lastSenderUid: "",
      unreadCount: 0,
      updatedAt: now,
    } satisfies UserChatRecord);
  }

  await update(otherChatRef, {
    chatId,
    otherUid: currentUser.uid,
    otherName: currentUser.displayName ?? currentUser.email ?? "Unknown",
    otherPhotoURL: currentUser.photoURL ?? null,
    lastMessage: "",
    lastMessageType: "text",
    lastMessageAt: 0,
    lastSenderUid: "",
    unreadCount: 0,
    updatedAt: now,
  } satisfies UserChatRecord);

  return chatId;
}

export function subscribeUserChats(uid: string, callback: (chats: ChatPreview[]) => void): () => void {
  const userChatsRef = ref(db, `user_chats/${uid}`);

  const unsubscribe = onValue(
    userChatsRef,
    (snapshot) => {
      const value = (snapshot.val() as Record<string, UserChatRecord> | null) ?? {};

      const chats = Object.values(value)
        .map((record) => ({
          id: record.chatId,
          otherUid: record.otherUid,
          name: record.otherName,
          avatarText: buildAvatarText(record.otherName),
          photoURL: record.otherPhotoURL,
          lastMessage: record.lastMessage,
          time: formatMessageTime(record.lastMessageAt),
          unreadCount: record.unreadCount ?? 0,
          updatedAt: record.updatedAt ?? 0,
        }))
        .sort((a, b) => b.updatedAt - a.updatedAt);

      callback(chats);
    },
    (error) => {
      console.error("subscribeUserChats error", error);
      callback([]);
    }
  );

  return () => unsubscribe();
}

export function subscribeChatMessages(chatId: string, currentUid: string, callback: (messages: UIMessage[]) => void): () => void {
  const messagesRef = ref(db, `chat_messages/${chatId}`);

  const unsubscribe = onValue(
    messagesRef,
    (snapshot) => {
      const value = (snapshot.val() as Record<string, ChatMessageRecord> | null) ?? {};
      const messages = Object.values(value)
        .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
        .map((record) => ({
          id: record.id,
          chatId: record.chatId,
text: record.text,
          time: formatMessageTime(record.createdAt),
          mine: record.senderUid === currentUid,
          type: record.type,
          icons: record.icons ?? [],
          senderUid: record.senderUid,
          createdAt: record.createdAt,
        } satisfies UIMessage));

      callback(messages);
    },
    (error) => {
      console.error("subscribeChatMessages error", error);
      callback([]);
    }
  );

  return () => unsubscribe();
}

type SendParams = {
  chatId: string;
  currentUser: User;
  otherUser: ChatUser;
  text: string;
  icons?: string[];
};

export async function sendChatMessage({ chatId, currentUser, otherUser, text, icons = [] }: SendParams): Promise<boolean> {
  const rawText = text.replace(/\s+/g, " ").trim();
  const sanitizedText = sanitizeIconMessage(rawText);
  const normalizedText = sanitizedText === rawText ? sanitizedText : rawText;



  const parsedIcons = icons.length ? icons.filter(Boolean) : extractIcons(sanitizedText);
  const type = detectMessageType(normalizedText, parsedIcons);

  if (!chatId || (!normalizedText && parsedIcons.length === 0)) {
    return false;
  }

  const now = Date.now();
  const messageRef = push(ref(db, `chat_messages/${chatId}`));
  const messageId = messageRef.key;
  if (!messageId) return false;

const previewText = normalizedText;



  const messagePayload: ChatMessageRecord = {
    id: messageId,
    chatId,
    senderUid: currentUser.uid,
    text: normalizedText,
    type,
    icons: parsedIcons,
    createdAt: now,
    editedAt: null,
    seenBy: {
      [currentUser.uid]: true,
    },
  };

  await set(messageRef, messagePayload);

  const senderPreview: UserChatRecord = {
    chatId,
    otherUid: otherUser.uid,
    otherName: otherUser.displayName ?? otherUser.email ?? "Unknown",
    otherPhotoURL: otherUser.photoURL ?? null,
    lastMessage: previewText,
    lastMessageType: type,
    lastMessageAt: now,
    lastSenderUid: currentUser.uid,
    unreadCount: 0,
    updatedAt: now,
  };

  await Promise.all([
    update(ref(db, `chats/${chatId}`), { updatedAt: now }),
    update(ref(db, `user_chats/${currentUser.uid}/${chatId}`), senderPreview),
    update(ref(db, `user_chats/${otherUser.uid}/${chatId}`), {
      chatId,
      otherUid: currentUser.uid,
      otherName: currentUser.displayName ?? currentUser.email ?? "Unknown",
      otherPhotoURL: currentUser.photoURL ?? null,
      lastMessage: previewText,
      lastMessageType: type,
      lastMessageAt: now,
      lastSenderUid: currentUser.uid,
      updatedAt: now,
    } satisfies Omit<UserChatRecord, "unreadCount">),
  ]);

  await runTransaction(ref(db, `user_chats/${otherUser.uid}/${chatId}/unreadCount`), (current) => {
    const count = Number(current ?? 0);
    return Number.isFinite(count) ? count + 1 : 1;
  });

  if (parsedIcons.length > 0) {
    await saveRecentIcons(currentUser.uid, parsedIcons);
  }

  return true;
}

export async function markChatAsRead(chatId: string, currentUid: string): Promise<void> {
  const now = Date.now();

  await Promise.all([
    set(ref(db, `chat_meta/${chatId}/lastReadAt/${currentUid}`), now),
    set(ref(db, `user_chats/${currentUid}/${chatId}/unreadCount`), 0),
  ]);
}

export function subscribeTyping(chatId: string, otherUid: string, callback: (typing: boolean) => void): () => void {
  const typingRef = ref(db, `chat_meta/${chatId}/typing/${otherUid}`);

  const unsubscribe = onValue(typingRef, (snapshot) => {
    callback(snapshot.val() === true);
  });

  return () => unsubscribe();
}

export async function setTyping(chatId: string, uid: string, isTyping: boolean): Promise<void> {
  await set(ref(db, `chat_meta/${chatId}/typing/${uid}`), isTyping);
}

export function subscribeRecentIcons(uid: string, callback: (icons: string[]) => void): () => void {
  const recentRef = ref(db, `user_recent_icons/${uid}/items`);

  const unsubscribe = onValue(
    recentRef,
    (snapshot) => {
      const value = snapshot.val();
      callback(Array.isArray(value) ? value.filter((item) => typeof item === "string") : []);
    },
    (error) => {
      console.error("subscribeRecentIcons error", error);
      callback([]);
    }
  );

  return () => unsubscribe();
}

export async function saveRecentIcons(uid: string, icons: string[]): Promise<void> {
  if (!uid) return;

  const recentRef = ref(db, `user_recent_icons/${uid}`);
  const snapshot = await get(recentRef);
  const existingItems = Array.isArray(snapshot.val()?.items) ? (snapshot.val().items as string[]) : [];
  const merged = [...icons, ...existingItems].filter(Boolean);

  const uniqueNewestFirst = Array.from(new Set(merged)).slice(0, 30);

  await set(recentRef, {
    items: uniqueNewestFirst,
    updatedAt: Date.now(),
  });
}
