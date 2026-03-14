export type MessageType = "text" | "icons" | "mixed";

export type ChatPreview = {
  id: string;
  otherUid: string;
  name: string;
  avatarText: string;
  photoURL?: string | null;
  lastMessage: string;
  time: string;
  unreadCount?: number;
  online?: boolean;
  typing?: boolean;
  updatedAt: number;
  isSystem?: boolean;
  isPinned?: boolean;
  canDelete?: boolean;
};

export type UIMessage = {
  id: string;
  chatId: string;
  text: string;
  time: string;
  mine: boolean;
  type: MessageType;
  icons?: string[];
  senderUid: string;
  createdAt: number;
};

export type ChatUser = {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
};

export type ChatMessageRecord = {
  id: string;
  chatId: string;
  senderUid: string;
  text: string;
  type: MessageType;
  icons: string[];
  createdAt: number;
  editedAt: number | null;
  seenBy: Record<string, true>;
};

export type UserChatRecord = {
  chatId: string;
  otherUid: string;
  otherName: string;
  otherPhotoURL: string | null;
  lastMessage: string;
  lastMessageType: MessageType;
  lastMessageAt: number;
  lastSenderUid: string;
  unreadCount: number;
  updatedAt: number;
  isSystem?: boolean;
  isPinned?: boolean;
  canDelete?: boolean;
};

export type PresenceRecord = {
  online: boolean;
  lastSeenAt: number;
  name: string | null;
  photoURL: string | null;
};
