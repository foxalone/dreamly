"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, type UserCredential } from "firebase/auth";
import { FcGoogle } from "react-icons/fc";
import { auth } from "@/lib/firebase";
import { signInWithGoogle } from "@/lib/auth/signInWithGoogle";
import { authMessages } from "@/lib/i18n/auth";
import type { Locale } from "@/lib/i18n/config";

export default function SignInMethods({ locale, onSuccess, onBusyChange, beforeGoogle, onAuthError }: {
  locale: Locale;
  beforeGoogle?: () => void;
  onAuthError?: (error: unknown) => void;
  onSuccess: (credential: UserCredential) => void | Promise<void>;
  onBusyChange?: (busy: boolean) => void;
}) {
  const m = authMessages[locale];
  const id = useId();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function changeMode(value: typeof mode) {
    setMode(value);
    setPassword("");
    setError("");
    setNotice("");
  }

  async function run(action: () => Promise<UserCredential | null | void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    onBusyChange?.(true);
    setError("");
    setNotice("");
    try {
      const credential = await action();
      if (credential) await onSuccess(credential);
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
      onAuthError?.(error);
      setError(
        code === "auth/invalid-email" || code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found" ? m.invalid
          : code === "auth/weak-password" || code === "auth/password-does-not-meet-requirements" ? m.weak
          : code === "auth/email-already-in-use" ? m.existing
          : code === "auth/too-many-requests" ? m.throttled
          : code === "auth/operation-not-allowed" || code === "auth/user-disabled" ? m.disabled
          : code === "auth/network-request-failed" ? m.network : m.failed,
      );
    } finally {
      setPassword("");
      inFlight.current = false;
      setBusy(false);
      onBusyChange?.(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run(async () => {
      auth.languageCode = locale === "pt" ? "pt-BR" : locale;
      if (mode === "reset") {
        try {
          await sendPasswordResetEmail(auth, email.trim());
        } catch (error) {
          if ((error as { code?: string }).code !== "auth/user-not-found") throw error;
        }
        setNotice(m.resetSent);
        return;
      }
      return mode === "signup"
        ? createUserWithEmailAndPassword(auth, email.trim(), password)
        : signInWithEmailAndPassword(auth, email.trim(), password);
    });
  }

  return (
    <div className="mt-5 text-start">
      <button type="button" disabled={busy} onClick={() => void run(() => { beforeGoogle?.(); return signInWithGoogle(); })}
        className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 font-semibold text-black disabled:opacity-60">
        <FcGoogle aria-hidden="true" className="text-xl" />{m.google}
      </button>
      <form onSubmit={submit} className="mt-5 space-y-3">
        <fieldset disabled={busy} className="space-y-3">
          <legend className="mb-3 text-sm font-semibold">{m.emailOption}</legend>
          <label htmlFor={`${id}-email`} className="block text-sm">{m.email}</label>
          <input id={`${id}-email`} type="email" autoComplete="email" dir="ltr" required value={email} onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-[var(--text)]" />
          {mode !== "reset" ? <>
            <label htmlFor={`${id}-password`} className="block text-sm">{m.password}</label>
            <input id={`${id}-password`} type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={mode === "signup" ? 6 : undefined} value={password} onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-[var(--text)]" />
          </> : null}
          <button type="submit" className="dream-primary-btn w-full px-4 py-3 disabled:opacity-60">
            {busy ? m.busy : mode === "signup" ? m.signUp : mode === "reset" ? m.reset : m.signIn}
          </button>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
            <button type="button" className="underline" onClick={() => changeMode(mode === "signin" ? "signup" : "signin")}>
              {mode === "signin" ? m.signUp : m.back}
            </button>
            {mode === "signin" ? <button type="button" className="underline" onClick={() => changeMode("reset")}>{m.reset}</button> : null}
          </div>
        </fieldset>
      </form>
      {error ? <p role="alert" className="mt-3 text-sm text-red-500">{error}</p> : null}
      {notice ? <p role="status" className="mt-3 text-sm text-[var(--muted)]">{notice}</p> : null}
    </div>
  );
}
