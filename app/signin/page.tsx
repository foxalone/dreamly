// app/signin/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithGoogleAndUpsert } from "@/lib/auth/ensureUser";
import { FcGoogle } from "react-icons/fc";

export default function SignInPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const next = useMemo(() => {
    const n = sp.get("next");
    return n && n.startsWith("/") ? n : "/dreams";
  }, [sp]);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
          onClick={async () => {
            setErr(null);
            setBusy(true);
            try {
              await signInWithGoogleAndUpsert();
              router.replace(next);
            } catch (e: any) {
              setErr(e?.message ?? "Failed to sign in");
            } finally {
              setBusy(false);
            }
          }}
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