"use client";

import { localePath } from "@/lib/i18n/path";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getAdditionalUserInfo,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { ensureUserProfileOnSignIn } from "@/lib/auth/ensureUserProfile";
import { signInWithOptions } from "@/lib/auth/signInWithOptions";
import { createOrGetDirectChat } from "@/lib/chat/chatDb";
import { trackAuth } from "@/lib/analytics";

type InviterInfo = {
  uid: string;
  displayName: string;
  photoURL?: string | null;
};

export default function InvitePage() {
  const locale = useLocale();
  const japanese = locale === "ja";
  const router = useRouter();
  const [inviterUid, setInviterUid] = useState<string | null>(null);

  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [inviter, setInviter] = useState<InviterInfo | null>(null);

  const [loadingInviter, setLoadingInviter] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  const joinStartedRef = useRef(false);

  const inviterName = useMemo(() => {
    return inviter?.displayName?.trim() || (japanese ? "Dreamlyの利用者" : "A Dreamly user");
  }, [inviter, japanese]);

 useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  setInviterUid(params.get("from"));
}, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);
    });

    return () => unsub();
  }, []);

 useEffect(() => {
  let cancelled = false;

  async function loadInviter(uid: string) {
    try {
      setError("");
      setLoadingInviter(true);

      const response = await fetch(`/api/dreams/public-inviter?from=${encodeURIComponent(uid)}`);

      if (response.status === 404) {
        if (!cancelled) {
          setError((japanese ? "招待した利用者が見つかりません。" : "Inviter not found."));
          setLoadingInviter(false);
        }
        return;
      }

      if (!response.ok) throw new Error("Could not load inviter");
      const data = await response.json();

      if (!cancelled) {
        setInviter({
          uid,
          displayName:
            typeof data.displayName === "string" && data.displayName.trim()
              ? data.displayName
              : (japanese ? "Dreamlyの利用者" : "Dreamly user"),
          photoURL: typeof data.photoURL === "string" ? data.photoURL : null,
        });
        setError("");
        setLoadingInviter(false);
      }
    } catch (e) {
      console.error("Failed to load inviter", e);
      if (!cancelled) {
        setError((japanese ? "招待を開けませんでした。" : "Failed to open invite."));
        setLoadingInviter(false);
      }
    }
  }

  if (inviterUid === null) return; // ещё не прочитали URL

  if (!inviterUid) {
    setError((japanese ? "この招待リンクは無効です。" : "Invite link is invalid."));
    setLoadingInviter(false);
    return;
  }

  void loadInviter(inviterUid);

  return () => {
    cancelled = true;
  };
}, [inviterUid]);

  useEffect(() => {
    if (!authReady || !currentUser || !inviter) return;
    if (joinStartedRef.current) return;

    joinStartedRef.current = true;
    void joinChat(currentUser, inviter);
  }, [authReady, currentUser, inviter]);

  async function joinChat(user: User, inviterInfo: InviterInfo) {
    if (!inviterInfo.uid) return;

    if (user.uid === inviterInfo.uid) {
      router.replace(localePath("/app/chat", locale));
      return;
    }

    try {
      setJoining(true);
      setError("");

      const chatId = await createOrGetDirectChat(
        {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
        },
        {
          uid: inviterInfo.uid,
          displayName: inviterInfo.displayName,
          email: null,
          photoURL: inviterInfo.photoURL ?? null,
        }
      );

      if (!chatId) {
        setError((japanese ? "チャットを作成できませんでした。" : "Failed to create chat."));
        setJoining(false);
        joinStartedRef.current = false;
        return;
      }

      router.replace(localePath(`/app/chat?chat=${encodeURIComponent(chatId)}`, locale));
    } catch (e) {
      console.error("Failed to join chat", e);
      setError((japanese ? "チャットに参加できませんでした。" : "Failed to join chat."));
      setJoining(false);
      joinStartedRef.current = false;
    }
  }

  async function onSignIn() {
    try {
      setError("");
      setJoining(false);

      const cred = await signInWithOptions();
      if (!cred) return;
      await ensureUserProfileOnSignIn(cred.user);
      trackAuth(!!getAdditionalUserInfo(cred)?.isNewUser);
    } catch (e) {
      if ((e as { code?: string }).code === "auth/popup-closed-by-user") return;
      console.error("Sign in failed", e);
      setError((japanese ? "ログインできませんでした。" : "Sign in failed."));
      setJoining(false);
      joinStartedRef.current = false;
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="text-center max-w-2xl">
        <h1
          className="text-4xl sm:text-6xl font-semibold tracking-wide mb-8 bg-clip-text text-transparent"
          style={{
            backgroundImage:
              "linear-gradient(90deg, #ff4d6d 0%, #ff9e00 18%, #ffd60a 36%, #38d39f 54%, #4dabf7 72%, #9775fa 100%)",
          }}
        >
          Dreamly
        </h1>

        <h2 className="text-xl sm:text-2xl font-medium">
          {(japanese ? "Dreamlyチャットへの招待が届きました" : "You were invited to Dreamly Chat")}</h2>

        <p className="mt-6 text-neutral-400 text-base sm:text-lg">
          {loadingInviter
            ? (japanese ? "招待を開いています…" : "Opening invitation...")
            : japanese ? `${inviterName}さんから、見た夢や日々の出来事について話すチャットに招待されました。` : `${inviterName} invited you to chat about dreams and stories.`}
        </p>

        {!!error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        {!loadingInviter && !currentUser && !error && (
          <button
            type="button"
            onClick={() => void onSignIn()}
            disabled={joining}
            className="mt-10 inline-block bg-purple-600 hover:bg-purple-500 text-white text-lg font-semibold px-10 py-4 rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-60 disabled:hover:scale-100"
          >
            {(japanese ? "無料でログイン" : "Sign in for free")}</button>
        )}

        {!loadingInviter && currentUser && !error && (
          <div className="mt-10 inline-block bg-purple-600 text-white text-lg font-semibold px-10 py-4 rounded-2xl opacity-90">
            {joining ? (japanese ? "チャットを開いています…" : "Opening chat...") : (japanese ? "チャットを準備しています…" : "Preparing chat...")}
          </div>
        )}
      </div>
    </main>
  );
}
