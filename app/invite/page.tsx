"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, firestore } from "@/lib/firebase";
import { ensureUserProfileOnSignIn } from "@/lib/auth/ensureUserProfile";
import { createOrGetDirectChat } from "@/lib/chat/chatDb";

type InviterInfo = {
  uid: string;
  displayName: string;
  photoURL?: string | null;
  email?: string | null;
};

export default function InvitePage() {
  const router = useRouter();

  const [inviterUid, setInviterUid] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [inviter, setInviter] = useState<InviterInfo | null>(null);

  const [loadingInviter, setLoadingInviter] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  const joinStartedRef = useRef(false);

  const inviterName = useMemo(() => {
    return inviter?.displayName?.trim() || "A Dreamly user";
  }, [inviter]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setInviterUid(params.get("from") ?? "");
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

    async function loadInviter() {
      if (!inviterUid) {
        setError("Invite link is invalid.");
        setLoadingInviter(false);
        return;
      }

      try {
        const snap = await getDoc(doc(firestore, "users", inviterUid));

        if (!snap.exists()) {
          if (!cancelled) {
            setError("Inviter not found.");
            setLoadingInviter(false);
          }
          return;
        }

        const data = snap.data();

        if (!cancelled) {
          setInviter({
            uid: inviterUid,
            displayName:
              typeof data.displayName === "string" && data.displayName.trim()
                ? data.displayName
                : "Dreamly user",
            photoURL:
              typeof data.photoURL === "string" ? data.photoURL : null,
            email: typeof data.email === "string" ? data.email : null,
          });
          setLoadingInviter(false);
        }
      } catch (e) {
        console.error("Failed to load inviter", e);
        if (!cancelled) {
          setError("Failed to open invite.");
          setLoadingInviter(false);
        }
      }
    }

    if (!inviterUid) {
      if (window.location.search.includes("from=")) {
        void loadInviter();
      } else {
        setError("Invite link is invalid.");
        setLoadingInviter(false);
      }
      return;
    }

    void loadInviter();

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
      router.replace("/app/chat");
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
          email: inviterInfo.email ?? null,
          photoURL: inviterInfo.photoURL ?? null,
        }
      );

      if (!chatId) {
        setError("Failed to create chat.");
        setJoining(false);
        joinStartedRef.current = false;
        return;
      }

      router.replace(`/app/chat?chat=${encodeURIComponent(chatId)}`);
    } catch (e) {
      console.error("Failed to join chat", e);
      setError("Failed to join chat.");
      setJoining(false);
      joinStartedRef.current = false;
    }
  }

  async function onSignIn() {
    try {
      setError("");
      setJoining(false);

      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      await ensureUserProfileOnSignIn(cred.user);
    } catch (e) {
      console.error("Sign in failed", e);
      setError("Sign in failed.");
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
          You were invited to Dreamly Chat
        </h2>

        <p className="mt-6 text-neutral-400 text-base sm:text-lg">
          {loadingInviter
            ? "Opening invitation..."
            : `${inviterName} invited you to chat about dreams and stories.`}
        </p>

        {!!error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        {!loadingInviter && !currentUser && !error && (
          <button
            type="button"
            onClick={() => void onSignIn()}
            disabled={joining}
            className="mt-10 inline-block bg-purple-600 hover:bg-purple-500 text-white text-lg font-semibold px-10 py-4 rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-60 disabled:hover:scale-100"
          >
            Sign in for free
          </button>
        )}

        {!loadingInviter && currentUser && !error && (
          <div className="mt-10 inline-block bg-purple-600 text-white text-lg font-semibold px-10 py-4 rounded-2xl opacity-90">
            {joining ? "Opening chat..." : "Preparing chat..."}
          </div>
        )}
      </div>
    </main>
  );
}