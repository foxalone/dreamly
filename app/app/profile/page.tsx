"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

import { auth, firestore } from "@/lib/firebase";
import { ensureUserProfileOnSignIn } from "@/lib/auth/ensureUserProfile";

import ThemeSwitcher from "@/app/components/ThemeSwitcher";
import LanguageSwitcher from "@/lib/i18n/LanguageSwitcher";
import { useLocale, useMessages } from "@/lib/i18n/LocaleProvider";
import { formatMessage } from "@/lib/i18n/messages";
import { localePath } from "@/lib/i18n/path";
import LocaleLink from "@/lib/i18n/LocaleLink";
import {
  hasPaidAccess,
  remainingDreamsToday,
  type UserBillingFields,
} from "@/lib/subscriptions/status";

function initialsFromUser(u: User) {
  const name = (u.displayName ?? "").trim();
  const email = (u.email ?? "").trim();
  const src = name || email || "U";
  const parts = src.split(/[\s._-]+/).filter(Boolean);
  const a = (parts[0]?.[0] ?? "U").toUpperCase();
  const b = (parts[1]?.[0] ?? parts[0]?.[1] ?? "").toUpperCase();
  return (a + b).slice(0, 2);
}

function shortUid(uid?: string | null) {
  if (!uid) return "";
  if (uid.length <= 10) return uid;
  return `${uid.slice(0, 5)}…${uid.slice(-5)}`;
}

export default function ProfilePage() {
  const locale = useLocale();
  const t = useMessages();
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [billing, setBilling] = useState<UserBillingFields | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setBilling(null);
        return;
      }
      ensureUserProfileOnSignIn(u);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(firestore, "users", user.uid), (snap) => {
      setBilling(snap.exists() ? (snap.data() as UserBillingFields) : {});
    });
    return () => unsub();
  }, [user?.uid]);

  async function doSignOut() {
    try {
      setBusy(true);
      await signOut(auth);
    } finally {
      setBusy(false);
    }
  }

  async function copyUid() {
    if (!user?.uid) return;
    try {
      await navigator.clipboard.writeText(user.uid);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = user.uid;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  const displayName = useMemo(() => {
    if (!user) return "";
    return user.displayName || user.email || "User";
  }, [user]);

  const card = "rounded-2xl bg-[var(--card)] border border-[var(--border)]";
  const titleText = "text-[var(--text)]";
  const mutedText = "text-[var(--muted)]";
  const pillBase = "h-11 px-5 rounded-full font-semibold transition border";
  const pillSurface = "bg-[var(--card)] text-[var(--text)] border-[var(--border)] hover:opacity-90";
  const pillDisabled = "disabled:opacity-50 disabled:cursor-not-allowed";

  const ADMIN_UIDS = new Set<string>(["sGbA77TlcsatEMrgEvCv7Shjrj32"]);
  const isAdmin = !!user?.uid && ADMIN_UIDS.has(user.uid);
  const remaining = remainingDreamsToday(billing);

  return (
    <main className="px-6 py-10 max-w-3xl mx-auto">
      <h1 className={`text-3xl font-semibold ${titleText}`}>{t.profile.title}</h1>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <ThemeSwitcher />
        <LanguageSwitcher segmented />

        <button
          onClick={copyUid}
          disabled={!user}
          className={`${pillBase} ${pillSurface} ${pillDisabled}`}
          title={user?.uid ?? ""}
        >
          {user ? (copied ? t.profile.copied : t.profile.copyUuid) : t.profile.copyUuid}
        </button>

        <button
          onClick={() => {
            if (!user) return;
            window.location.href = localePath("/app/upgrade", locale);
          }}
          disabled={!user}
          className={`${pillBase} ${pillSurface} ${pillDisabled}`}
        >
          {t.profile.subscribe}
        </button>

        {user && hasPaidAccess(billing) ? (
          <div
            className="
              h-11 px-4 rounded-full
              bg-[rgba(16,185,129,0.12)]
              border border-[rgba(16,185,129,0.25)]
              text-[var(--text)]
              flex items-center gap-2
              font-semibold
            "
          >
            {formatMessage(t.profile.remainingToday, { n: remaining })}
          </div>
        ) : null}
      </div>

      <div className={`mt-6 w-full flex flex-wrap justify-center items-center gap-3 text-sm ${mutedText}`}>
        <LocaleLink href="/terms" className="hover:underline underline-offset-4 opacity-90 hover:opacity-100">
          {t.legal.termsShort}
        </LocaleLink>
        <span className="opacity-40">•</span>
        <LocaleLink href="/privacy" className="hover:underline underline-offset-4 opacity-90 hover:opacity-100">
          {t.legal.privacyShort}
        </LocaleLink>
        <span className="opacity-40">•</span>
        <LocaleLink href="/refund" className="hover:underline underline-offset-4 opacity-90 hover:opacity-100">
          {t.legal.refundShort}
        </LocaleLink>
      </div>

      <div className="mt-8">
        <div className={`${card} p-5`}>
          <div className="flex items-center gap-4">
            {user?.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoURL}
                alt="Profile"
                width={56}
                height={56}
                className="rounded-full object-cover ring-1 ring-[var(--border)]"
                referrerPolicy="no-referrer"
              />
            ) : user ? (
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-semibold
                           bg-[rgba(127,127,127,0.18)] text-[var(--text)] ring-1 ring-[var(--border)]"
              >
                {initialsFromUser(user)}
              </div>
            ) : (
              <div className="w-14 h-14 rounded-full bg-[rgba(127,127,127,0.12)] ring-1 ring-[var(--border)]" />
            )}

            <div className="min-w-0">
              <div className={`font-semibold text-lg truncate ${titleText}`}>
                {user ? displayName : t.profile.notSignedIn}
              </div>
              <div className={`text-sm truncate ${mutedText}`}>
                {user?.email ? user.email : t.profile.signInHint}
              </div>
              {user?.uid ? (
                <div className={`mt-2 text-xs ${mutedText}`}>
                  UID: <span className="font-mono">{shortUid(user.uid)}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <Link
          href="https://www.fitactive.now/dashboard"
          className={`${card} p-4 flex items-start gap-4 hover:opacity-95 transition no-underline`}
          target="_blank"
          rel="noreferrer"
        >
          <div className="w-16 h-16 rounded-xl flex items-center justify-center bg-[rgba(127,127,127,0.12)] ring-1 ring-[var(--border)] overflow-hidden shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/FIT ICON 512.png" alt="FitActive" className="w-14 h-14 object-contain" />
          </div>
          <div className="min-w-0">
            <div className={`font-semibold ${titleText}`}>Take control of your fitness journey</div>
            <div className={`text-sm ${mutedText} mt-1 leading-relaxed`}>
              Track workouts, monitor progress, analyze stats, set goals, manage records and grow stronger every day.
            </div>
          </div>
        </Link>
      </div>

      <div className="mt-4">
        <Link
          href="https://lottodata.org"
          className={`${card} p-4 flex items-start gap-4 hover:opacity-95 transition no-underline`}
          target="_blank"
          rel="noreferrer"
        >
          <div className="w-16 h-16 rounded-xl flex items-center justify-center bg-[rgba(127,127,127,0.12)] ring-1 ring-[var(--border)] overflow-hidden shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/LOTTODATA ICON 512.png" alt="LottoData" className="w-14 h-14 object-contain" />
          </div>
          <div className="min-w-0">
            <div className={`font-semibold ${titleText}`}>Explore lottery results and statistics</div>
            <div className={`text-sm ${mutedText} mt-1 leading-relaxed`}>
              Check latest draws, view historical results, analyze number frequencies and discover trends across popular
              lotteries.
            </div>
          </div>
        </Link>
      </div>

      <div className="mt-4">
        <Link
          href="https://currencyhub.app/"
          className={`${card} p-4 flex items-start gap-4 hover:opacity-95 transition no-underline`}
          target="_blank"
          rel="noreferrer"
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-[rgba(127,127,127,0.12)] ring-1 ring-[var(--border)] overflow-hidden shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/currency hub icon.png" alt="CurrencyHub" className="w-14 h-14 object-contain" />
          </div>
          <div className="min-w-0">
            <div className={`font-semibold ${titleText}`}>CurrencyHub — organize your coin collection</div>
            <div className={`text-sm ${mutedText} mt-1 leading-relaxed`}>
              Track your coins, manage quantities, add details like year, value and average price, and keep your entire
              collection organized right from your smartphone.
            </div>
          </div>
        </Link>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <button
          onClick={doSignOut}
          disabled={!user || busy}
          className={`${pillBase} bg-red-600 text-white border-transparent hover:bg-red-500 ${pillDisabled}`}
        >
          {busy ? "..." : t.profile.signOut}
        </button>

        {isAdmin ? (
          <Link
            href="/app/profile/admin-dashboard"
            className={`${pillBase} ${pillSurface} inline-flex items-center justify-center no-underline`}
          >
            Admin dashboard
          </Link>
        ) : null}
      </div>
    </main>
  );
}
