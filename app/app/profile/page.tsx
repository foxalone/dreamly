"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

import { auth, firestore } from "@/lib/firebase";
import { ensureUserProfileOnSignIn } from "@/lib/auth/ensureUserProfile";

import { useTranslationLanguage } from "@/lib/useTranslationLanguage";

import HoroscopeClient from "@/app/horoscope/HoroscopeClient";
import ThemeSwitcher from "@/app/components/ThemeSwitcher";
import LanguageSwitcher from "@/lib/i18n/LanguageSwitcher";
import { useLocale, useMessages } from "@/lib/i18n/LocaleProvider";
import { formatMessage } from "@/lib/i18n/messages";
import { localePath } from "@/lib/i18n/path";
import LocaleLink from "@/lib/i18n/LocaleLink";
import ShareBadgeTimeline from "@/app/components/ShareBadgeTimeline";
import TarotProfileCards from "./TarotProfileCards";
import ProfileTranslationLanguagePicker from "./ProfileTranslationLanguagePicker";
import { countMySharedDreams } from "@/lib/mySharedDreamsCount";
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

export default function ProfilePage() {
  const locale = useLocale();
  const t = useMessages();
  const [user, setUser] = useState<User | null>(null);
  const { preference, browserLanguage, ready: languageReady } = useTranslationLanguage(user?.uid ?? null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [billing, setBilling] = useState<UserBillingFields | null>(null);
  const [commentXpTotal, setCommentXpTotal] = useState(0);
  // shared (not deleted) dreams → creature level; null while loading
  const [sharedCount, setSharedCount] = useState<number | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setBilling(null);
        setCommentXpTotal(0);
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
      setCommentXpTotal(Math.max(0, Number(snap.data()?.commentXpTotal ?? 0) || 0));
    });
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      setSharedCount(0);
      return;
    }
    let alive = true;
    setSharedCount(null);
    void countMySharedDreams(user.uid).then((n) => {
      if (alive) setSharedCount(n ?? 0);
    });
    return () => {
      alive = false;
    };
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
          {user && hasPaidAccess(billing) ? t.profile.manageSubscription : t.profile.subscribe}
        </button>

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
            Admin
          </Link>
        ) : null}
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


      <section className={`${card} mt-6 p-5`}>
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-4">
            {user?.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoURL}
                alt="Profile"
                width={56}
                height={56}
                className="shrink-0 rounded-full object-cover ring-1 ring-[var(--border)]"
                referrerPolicy="no-referrer"
              />
            ) : user ? (
              <div
                className="w-14 h-14 shrink-0 rounded-full flex items-center justify-center text-lg font-semibold
                           bg-[rgba(127,127,127,0.18)] text-[var(--text)] ring-1 ring-[var(--border)]"
              >
                {initialsFromUser(user)}
              </div>
            ) : (
              <div className="w-14 h-14 shrink-0 rounded-full bg-[rgba(127,127,127,0.12)] ring-1 ring-[var(--border)]" />
            )}

            <div className="min-w-0">
              <div className={`font-semibold text-lg truncate ${titleText}`}>
                {user ? displayName : t.profile.notSignedIn}
              </div>
              <div className={`text-sm truncate ${mutedText}`}>
                {user?.email ? user.email : t.profile.signInHint}
              </div>
              {user ? <div className="mt-1 text-sm font-semibold text-purple-500">{formatMessage(t.profile.commentXpTotal, { n: commentXpTotal })}</div> : null}
            </div>
            </div>
            {user?.uid ? <div className={`mt-3 inline-flex max-w-full items-center gap-2 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs ${mutedText}`} dir="ltr">
              <span className="shrink-0">UID:</span><span className="min-w-0 overflow-x-auto whitespace-nowrap font-mono">{user.uid}</span>
            </div> : null}
          </div>
          <div className="min-w-0 border-t border-[var(--border)] pt-5 md:w-[250px] md:border-t-0 md:border-s md:ps-6 md:pt-0">
            <h2 className={`font-semibold ${titleText}`}>{t.nav.horoscope}</h2>
            <HoroscopeClient mode="profile" />
          </div>
        </div>
      </section>

      {user ? <TarotProfileCards key={user.uid} user={user} /> : null}

      <section className={`${card} mt-4 p-5`}>
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="min-w-0">
            <h2 className={`font-semibold ${titleText}`}>{t.profile.preferredLanguage}</h2>
            <p className={`mt-1 text-sm ${mutedText}`}>{t.profile.preferredLanguageHint}</p>
          </div>
          <ProfileTranslationLanguagePicker key={user?.uid ?? "guest"} user={user} preference={preference} browserLanguage={browserLanguage} ready={languageReady} />
        </div>
      </section>

      <div className="mt-4">
        <ShareBadgeTimeline count={sharedCount} />
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

      <div className={`mt-10 w-full flex flex-wrap justify-center items-center gap-3 text-sm ${mutedText}`}>
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
    </main>
  );
}
