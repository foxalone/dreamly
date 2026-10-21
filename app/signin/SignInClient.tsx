// app/signin/SignInClient.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getAdditionalUserInfo,
  onAuthStateChanged,
  type UserCredential,
} from "firebase/auth";
import { ensureUserProfileOnSignIn } from "@/lib/auth/ensureUserProfile";
import SignInMethods from "@/app/components/auth/SignInMethods";
import { authMessages } from "@/lib/i18n/auth";
import { auth } from "@/lib/firebase";
import { trackAuth } from "@/lib/analytics";
import { useLocale, useMessages } from "@/lib/i18n/LocaleProvider";
import { localePath } from "@/lib/i18n/path";

function safeInternalPath(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export default function SignInClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const locale = useLocale();
  const t = useMessages();
  const m = authMessages[locale];
  const authenticatingRef = useRef(false);

  const next = useMemo(() => {
    return safeInternalPath(sp.get("next")) ?? localePath("/app/dreams", locale);
  }, [sp, locale]);

  const cancelTo = useMemo(() => {
    return (
      safeInternalPath(sp.get("cancel")) ??
      (sp.get("reason") === "guest_limit" ? localePath("/dreams", locale) : next)
    );
  }, [sp, locale, next]);

  const subtitle = useMemo(() => {
    if (sp.get("reason") === "guest_limit") return t.home.askGuestLimit;
    if (next.includes("/gallery")) return t.gallery.signInToHeart;
    return m.subtitle;
  }, [next, sp, t.gallery.signInToHeart, t.home.askGuestLimit, m.subtitle]);

  const [busy, setBusy] = useState(false);

  // Навигация ровно один раз: и слушатель, и кнопка ведут в одно и то же место,
  // а двойной переход поднимает целевую страницу дважды.
  const navigatedRef = useRef(false);
  const goNext = useCallback(() => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    router.replace(next);
  }, [next, router]);

  // если уже залогинен — сразу уходим
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u || authenticatingRef.current) return;
      setBusy(true);
      ensureUserProfileOnSignIn(u)
        .then(() => goNext())
        .finally(() => setBusy(false));
    });
    return () => unsub();
  }, [goNext]);

  async function handleSignIn(cred: UserCredential) {
    await ensureUserProfileOnSignIn(cred.user);
    trackAuth(!!getAdditionalUserInfo(cred)?.isNewUser);
    goNext();
  }

  return (
    <main className="flex min-h-[calc(100dvh-var(--app-nav-height,4rem))] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-[var(--card)] p-6 shadow-2xl border border-[var(--border)]">
        <h1 className="text-xl font-bold text-[var(--text)]">{m.title}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {subtitle}
        </p>

        <SignInMethods locale={locale} onSuccess={handleSignIn} onBusyChange={(value) => {
          authenticatingRef.current = value;
          setBusy(value);
        }} />

        <button
          disabled={busy}
          onClick={() => router.replace(cancelTo)}
          className="w-full mt-3 py-2 text-sm text-[var(--muted)] disabled:opacity-60"
        >
          {sp.get("reason") === "guest_limit" ? t.home.askOrDictionary : m.cancel}
        </button>
      </div>
    </main>
  );
}
