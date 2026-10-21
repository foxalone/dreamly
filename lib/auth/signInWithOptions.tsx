"use client";

import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import type { UserCredential } from "firebase/auth";
import SignInMethods from "@/app/components/auth/SignInMethods";
import { authMessages } from "@/lib/i18n/auth";
import { isLocale, localeDir, type Locale } from "@/lib/i18n/config";
import { localeFromPathname } from "@/lib/i18n/path";

type SignInOptions = { beforeGoogle?: () => void; onAuthError?: (error: unknown) => void };

function SignInDialog({ locale, finish, beforeGoogle, onAuthError }: SignInOptions & { locale: Locale; finish: (value: UserCredential | null) => void }) {
  const m = authMessages[locale];
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog ref={dialog} dir={localeDir(locale)} aria-labelledby="auth-dialog-title"
      onCancel={(event) => { event.preventDefault(); if (!busy) finish(null); }}
      className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-sm overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-[var(--text)] shadow-2xl backdrop:bg-black/60">
      <h2 id="auth-dialog-title" className="text-xl font-bold">{m.title}</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">{m.subtitle}</p>
      <SignInMethods locale={locale} onSuccess={finish} onBusyChange={setBusy} beforeGoogle={beforeGoogle} onAuthError={onAuthError} />
      <button type="button" disabled={busy} onClick={() => finish(null)} className="mt-4 w-full py-2 text-sm text-[var(--muted)] disabled:opacity-60">{m.cancel}</button>
    </dialog>
  );
}

let active: Promise<UserCredential | null> | null = null;

/** Keep the caller mounted so pending comments, translations and dreams survive authentication. */
export function signInWithOptions(options: SignInOptions = {}): Promise<UserCredential | null> {
  if (active) return active;
  const localeParam = new URLSearchParams(window.location.search).get("locale");
  const locale = isLocale(localeParam) ? localeParam : localeFromPathname(window.location.pathname);
  active = new Promise<UserCredential | null>((resolve, reject) => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    let finished = false;
    function finish(credential: UserCredential | null) {
      if (finished) return;
      finished = true;
      queueMicrotask(() => { root.unmount(); container.remove(); });
      active = null;
      if (credential) resolve(credential);
      else reject(Object.assign(new Error(authMessages[locale].cancel), { code: "auth/popup-closed-by-user" }));
    }
    root.render(<SignInDialog locale={locale} finish={finish} beforeGoogle={options.beforeGoogle} onAuthError={options.onAuthError} />);
  });
  return active;
}
