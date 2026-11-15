"use client";

import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { usePathname, useSearchParams } from "next/navigation";
import { MoonStar } from "lucide-react";
import { auth, firestore } from "@/lib/firebase";
import LocaleLink from "@/lib/i18n/LocaleLink";
import { useLocale, useMessages } from "@/lib/i18n/LocaleProvider";
import { moonAccessMessages } from "@/lib/i18n/moon-access";
import { stripLocalePrefix } from "@/lib/i18n/path";
import { MOON_THRESHOLD, publishedDreamCount } from "@/lib/moon/model";

export default function MoonEligibilityNotice() {
  const { path } = stripLocalePrefix(usePathname() ?? "/");
  const searchParams = useSearchParams();
  const preview = process.env.NODE_ENV === "development" && searchParams.get("previewMoonNotice") === "1";
  const checkEnabled = !preview && (path.startsWith("/app/") || path === "/moon");
  const locale = useLocale();
  const copy = useMessages().moonEligibility;
  const moonCopy = moonAccessMessages[locale];
  const dialog = useRef<HTMLDialogElement>(null);
  const completedAccounts = useRef(new Set<string>());
  const [user, setUser] = useState<User | null>(null);
  const [recipient, setRecipient] = useState<string | null>(null);
  const [previewDismissed, setPreviewDismissed] = useState(false);
  const open = preview ? !previewDismissed : !!user && recipient === user.uid;

  useEffect(() => {
    if (checkEnabled) return onAuthStateChanged(auth, setUser);
  }, [checkEnabled]);

  useEffect(() => {
    if (!checkEnabled || !user || completedAccounts.current.has(user.uid)) return;
    const account = user;

    let disposed = false;
    let pending = false;
    let shouldCheck = true;
    let retry: number | undefined;
    let stopWatching: (() => void) | undefined;

    function scheduleCheck(delay: number) {
      window.clearTimeout(retry);
      retry = window.setTimeout(() => void check(), delay);
    }

    async function check() {
      if (disposed || pending || !shouldCheck || document.hidden || auth.currentUser?.uid !== account.uid) return;
      // Let the analysis or another open modal finish before claiming the notice.
      if (document.querySelector(".dream-analysis-progress-bar, dialog[open], html[data-pwa-launch]")) {
        scheduleCheck(750);
        return;
      }

      pending = true;
      shouldCheck = false;
      try {
        const response = await fetch("/api/moon/eligibility-notice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: await account.getIdToken() }),
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Moon eligibility check failed");
        const { status } = await response.json();
        if (status === "show" || status === "already_shown") {
          completedAccounts.current.add(account.uid);
          shouldCheck = false;
          stopWatching?.();
          if (status === "show" && auth.currentUser?.uid === account.uid) setRecipient(account.uid);
          return;
        }
        if (status !== "ineligible") throw new Error("Unexpected Moon eligibility response");

        if (!disposed && !stopWatching) {
          // Detect the next qualifying publication without polling ineligible accounts.
          const shares = query(collection(firestore, "shared_dreams"), where("ownerUid", "==", account.uid));
          stopWatching = onSnapshot(shares, { includeMetadataChanges: true }, (snapshot) => {
            if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
            const count = publishedDreamCount(snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() })));
            if (count >= MOON_THRESHOLD) {
              shouldCheck = true;
              void check();
            }
          });
        }
        if (shouldCheck && !disposed) scheduleCheck(0);
      } catch {
        shouldCheck = true;
        if (!disposed) scheduleCheck(30_000);
      } finally {
        pending = false;
      }
    }

    const onVisibilityChange = () => void check();
    void check();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      disposed = true;
      window.clearTimeout(retry);
      stopWatching?.();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [checkEnabled, user]);

  useEffect(() => {
    const element = dialog.current;
    if (open && element && !element.open) element.showModal();
  }, [open]);

  if (!open) return null;

  function dismiss() {
    if (preview) setPreviewDismissed(true);
    else setRecipient(null);
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="moon-eligibility-title"
      aria-describedby="moon-eligibility-body"
      dir={locale === "ar" ? "rtl" : "ltr"}
      onClose={dismiss}
      onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}
      className="fixed inset-0 m-auto max-h-[calc(100%-2.5rem)] w-[calc(100%-2.5rem)] max-w-md overflow-auto rounded-3xl border border-purple-400/30 bg-[var(--card)] px-6 py-9 text-center shadow-2xl backdrop:bg-black/65 backdrop:backdrop-blur-sm sm:px-10 sm:py-12"
    >
      <div>
        <MoonStar className="mx-auto mb-5 h-10 w-10 text-purple-500" aria-hidden="true" />
        <h2 id="moon-eligibility-title" className="text-2xl font-semibold text-[var(--text)] sm:text-3xl">{copy.title}</h2>
        <p id="moon-eligibility-body" className="mt-3 text-sm leading-6 text-[var(--muted)] sm:text-base">{copy.body}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <LocaleLink href="/moon" className="dream-primary-btn" onClick={() => dialog.current?.close()}>{moonCopy.enter}</LocaleLink>
          <button type="button" className="dream-btn dream-btn--neutral text-sm" onClick={() => dialog.current?.close()}>{moonCopy.close}</button>
        </div>
      </div>
    </dialog>
  );
}
