// app/signin/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup } from "firebase/auth";
import { ensureUser } from "@/lib/auth/ensureUser";
import { auth } from "@/lib/firebase";
import { FcGoogle } from "react-icons/fc";

export default function SignInPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const next = useMemo(() => {
    const n = sp.get("next");
    return n && n.startsWith("/") ? n : "/app/dreams";
  }, [sp]);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // если уже залогинен — сразу уходим
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) return;
      setBusy(true);
      setErr(null);
      ensureUser(u)
        .then(() => router.replace(next))
        .catch((e: any) => setErr(e?.message ?? "Failed to prepare account"))
        .finally(() => setBusy(false));
    });
    return () => unsub();
  }, [next, router]);

  async function handleGoogleSignIn() {
    setErr(null);
    setBusy(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      const cred = await signInWithPopup(auth, provider);
      await ensureUser(cred.user);

      router.replace(next);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to sign in");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-[var(--card)] p-6 shadow-2xl border border-[var(--border)]">
        <h1 className="text-xl font-bold text-[var(--text)]">Sign in</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Войдите через Google, чтобы сохранять сны.
        </p>

        {err && (
          <div className="mt-4 text-sm text-red-200 bg-red-600/15 border border-red-500/30 rounded-xl px-4 py-3">
            {err}
          </div>
        )}

        <button
          disabled={busy}
          onClick={handleGoogleSignIn}
          className="mt-6 w-full py-3 rounded-xl bg-white text-black font-semibold flex items-center justify-center gap-3 disabled:opacity-60"
        >
          <FcGoogle className="text-xl" />
          <span>{busy ? "Signing in…" : "Continue with Google"}</span>
        </button>

        <button
          disabled={busy}
          onClick={() => router.replace(next)}
          className="w-full mt-3 py-2 text-sm text-[var(--muted)] disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </main>
  );
}