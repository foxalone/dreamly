import { getDatabase, onValue, ref } from "firebase/database";

import app from "@/lib/firebase";

type UserChatsMap = Record<string, { unreadCount?: number } | null>;

const db = getDatabase(app);

export function subscribeUnreadCount(uid: string, callback: (totalUnread: number) => void): () => void {
  const userChatsRef = ref(db, `user_chats/${uid}`);

  const unsubscribe = onValue(
    userChatsRef,
    (snapshot) => {
      const chats = (snapshot.val() as UserChatsMap | null) ?? {};

      const totalUnread = Object.values(chats).reduce((sum, chat) => {
        const unread = Number(chat?.unreadCount ?? 0);

        if (!Number.isFinite(unread) || unread <= 0) {
          return sum;
        }

        return sum + unread;
      }, 0);

      callback(totalUnread);
    },
    (error) => {
      console.error("subscribeUnreadCount error", error);
      callback(0);
    }
  );

  return () => unsubscribe();
}
