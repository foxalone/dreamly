"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { applyActionCode } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { authMessages } from "@/lib/i18n/auth";
import { LOCALE_META, isLocale, type Locale } from "@/lib/i18n/config";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { localePath } from "@/lib/i18n/path";

export default function AuthActionClient() {
  const params = useSearchParams();
  const pathLocale = useLocale();
  const requested = params.get("lang");
  const locale: Locale = isLocale(requested) ? requested : pathLocale;
  const m = authMessages[locale];
  const mode = params.get("mode");
  const code = params.get("oobCode");
  const confirmed = params.get("verified") === "1";
  const [state, setState] = useState<"working" | "done" | "failed" | "idle">(
    mode === "verifyEmail" && code ? "working" : confirmed ? "done" : "idle",
  );

  useEffect(() => {
    if (mode !== "verifyEmail" || !code) return;
    let cancelled = false;
    applyActionCode(auth, code)
      .then(() => { if (!cancelled) setState("done"); })
      .catch(() => { if (!cancelled) setState("failed"); });
    return () => { cancelled = true; };
  }, [mode, code]);

  const message = state === "done" ? m.verifyDone
    : state === "failed" ? m.verifyFailed
    : state === "working" ? m.busy
    : m.verifyIdle;

  return (
    <main dir={LOCALE_META[locale].dir} className="flex min-h-[calc(100dvh-var(--app-nav-height,4rem))] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl">
        <h1 className="text-xl font-bold text-[var(--text)]">{m.verifyTitle}</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]" role="status">{message}</p>
        <Link href={localePath("/signin", locale)} className="dream-primary-btn mt-5 block w-full px-4 py-3 text-center">
          {m.signIn}
        </Link>
      </div>
    </main>
  );
}
