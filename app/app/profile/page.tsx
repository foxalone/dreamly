"use client";

import { useEffect, useMemo, useState } from "react";
import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { ensureUserProfileOnSignIn } from "@/lib/auth/ensureUserProfile";
import { auth } from "@/lib/firebase";
import Link from "next/link";
import { doc, onSnapshot } from "firebase/firestore";
import { firestore } from "@/lib/firebase";



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
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() =>
    onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) return;
      ensureUserProfileOnSignIn(u);
    }),
  []);

  useEffect(() => {
  if (!user?.uid) {
    setCredits(null);
    return;
  }

  const ref = doc(firestore, "users", user.uid);

  const unsub = onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      setCredits(0);
      return;
    }
    const data = snap.data();
    setCredits(data?.credits ?? 0);
  });

  return () => unsub();
}, [user]);

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "dark" | "light" | null;
    const t = saved ?? "dark";
    setTheme(t);
    if (t === "light") document.documentElement.classList.add("light");
    else document.documentElement.classList.remove("light");
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    if (next === "light") document.documentElement.classList.add("light");
    else document.documentElement.classList.remove("light");
  }

  async function doSignOut() {
    try {
      setBusy(true);
      await signOut(auth);
    } finally {
      setBusy(false);
    }
  }

  const PAYPAL_LINKS = {
  pack_20: process.env.NEXT_PUBLIC_PAYPAL_LINK_PACK_20,
  pack_50: process.env.NEXT_PUBLIC_PAYPAL_LINK_PACK_50,
  pack_120: process.env.NEXT_PUBLIC_PAYPAL_LINK_PACK_120,
  pack_300: process.env.NEXT_PUBLIC_PAYPAL_LINK_PACK_300,
} as const;

function goBuy(packId: keyof typeof PAYPAL_LINKS) {
  const url = PAYPAL_LINKS[packId];
  if (!url) {
    alert(`Missing PayPal link for ${packId}. Check env NEXT_PUBLIC_PAYPAL_LINK_${packId.toUpperCase()}`);
    return;
  }
  window.location.href = url;
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

  // ✅ theme-aware styles via CSS variables (works in light + dark)
  const card =
    "rounded-2xl bg-[var(--card)] border border-[var(--border)]";
  const titleText = "text-[var(--text)]";
  const mutedText = "text-[var(--muted)]";

  const pillBase =
    "h-11 px-5 rounded-full font-semibold transition border";
  const pillSurface =
    "bg-[var(--card)] text-[var(--text)] border-[var(--border)] hover:opacity-90";
  const pillDisabled = "disabled:opacity-50 disabled:cursor-not-allowed";

  const ADMIN_UIDS = new Set<string>([
  // ✅ добавь сюда свои UID админов
   "sGbA77TlcsatEMrgEvCv7Shjrj32",
]);

const [showCredits, setShowCredits] = useState(false);

const isAdmin = !!user?.uid && ADMIN_UIDS.has(user.uid);

  return (
    <main className="px-6 py-10 max-w-3xl mx-auto">
      <h1 className={`text-3xl font-semibold ${titleText}`}>Profile</h1>

      {/* TOP BUTTONS */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          onClick={toggleTheme}
          className={`${pillBase} ${pillSurface}`}
        >
          <span className="mr-2">{theme === "dark" ? "☀️" : "🌙"}</span>
          {theme === "dark" ? "Light" : "Dark"}
        </button>

        <button
          onClick={copyUid}
          disabled={!user}
          className={`${pillBase} ${pillSurface} ${pillDisabled}`}
          title={user?.uid ?? ""}
        >
          {user ? (copied ? "Copied!" : "Copy UUID") : "Copy UUID"}
        </button>

        <button
          onClick={doSignOut}
          disabled={!user || busy}
          className={`${pillBase} bg-red-600 text-white border-transparent hover:bg-red-500 ${pillDisabled}`}
        >
          {busy ? "..." : "Sign out"}
        </button>

        <button
  onClick={() => setShowCredits((v) => !v)}
  disabled={!user}
  className={`${pillBase} ${pillSurface} ${pillDisabled}`}
>
  💳 Buy credits
</button>


{user ? (
  <div
    className={`
      h-11 px-4 rounded-full
      bg-[rgba(16,185,129,0.12)]
      border border-[rgba(16,185,129,0.25)]
      text-[var(--text)]
      flex items-center gap-2
      font-semibold
    `}
    title="Your current balance"
  >
    <span className="opacity-80">💳</span>
    <span>{credits === null ? "…" : credits}</span>
  </div>
) : null}
       {isAdmin ? (
  <Link
    href="/app/profile/admin-dashboard"
    className={`${pillBase} ${pillSurface} inline-flex items-center justify-center no-underline`}
  >
    Admin dashboard
  </Link>
) : null}
      </div>

            {/* TOP LINKS (Terms / Privacy / Refund) */}
     <div className={`mt-6 w-full flex flex-wrap justify-center items-center gap-3 text-sm ${mutedText}`}>

        <Link
          href="https://docs.google.com/document/d/e/2PACX-1vSy6Krm2eiq85_FpOrw7IgDo3TBpkr3Trj2xWkomPm4P-VRiPtCvl80Zt2UEjGYyKKRP58eaFvUBr9U/pub"
          className="hover:underline underline-offset-4 opacity-90 hover:opacity-100"
        >
          Terms
        </Link>

        <span className="opacity-40">•</span>

        <Link
          href="https://docs.google.com/document/d/e/2PACX-1vTdSe8OazC2WXKnx_VRj2H6Z-NVYOsbB4KU_7uev3Qq1QMx-C1N9BJqkhSykVD9V50h-6zRulhKYxqh/pub"
          className="hover:underline underline-offset-4 opacity-90 hover:opacity-100"
        >
          Privacy
        </Link>

        {/* если нужно — третья ссылка как на примере */}
        <span className="opacity-40">•</span>

        <Link
          href="https://docs.google.com/document/d/e/2PACX-1vT8-k5pcd0iH9cAZHgeIbbqVpOAJeIoJ6ZIAZfbxuaKgJcRQXw3S5vk2Fz_lrnppLvg9iOe4JuGMqQ1/pub"
          className="hover:underline underline-offset-4 opacity-90 hover:opacity-100"
        >
          Refund
        </Link>
      </div>

      {user && showCredits ? (
  <div className="mt-6">
    <div className={`${card} p-5`}>
      <div className={`text-lg font-semibold ${titleText}`}>Buy credits</div>
      <div className={`text-sm ${mutedText} mt-1`}>
        Credits are added automatically after successful payment.
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => goBuy("pack_20")}
          className="text-left rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 hover:opacity-95 transition"
        >
          <div className={`font-semibold ${titleText}`}>20 credits</div>
          <div className={`text-sm ${mutedText}`}>$3.99</div>
        </button>

        <button
          onClick={() => goBuy("pack_50")}
          className="text-left rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 hover:opacity-95 transition"
        >
          <div className={`font-semibold ${titleText}`}>50 credits</div>
          <div className={`text-sm ${mutedText}`}>$7.99</div>
        </button>

        <button
          onClick={() => goBuy("pack_120")}
          className="text-left rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 hover:opacity-95 transition"
        >
          <div className={`font-semibold ${titleText}`}>120 credits</div>
          <div className={`text-sm ${mutedText}`}>$14.99</div>
        </button>

        <button
          onClick={() => goBuy("pack_300")}
          className="text-left rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 hover:opacity-95 transition"
        >
          <div className={`font-semibold ${titleText}`}>300 credits</div>
          <div className={`text-sm ${mutedText}`}>$29.99</div>
        </button>
      </div>

      <div className={`text-xs ${mutedText} mt-4`}>
        Tip: after payment you’ll be redirected back to Dreamly automatically.
      </div>
    </div>
  </div>
) : null}

      {/* PROFILE CARD */}
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
                {user ? displayName : "Not signed in"}
              </div>
              <div className={`text-sm truncate ${mutedText}`}>
                {user?.email ? user.email : "Sign in from the bottom bar"}
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

            {/* FITACTIVE WIDGET */}
<div className="mt-4">
  <Link
    href="https://www.fitactive.now/dashboard"
    className={`${card} p-4 flex items-start gap-4 hover:opacity-95 transition no-underline`}
    target="_blank"
    rel="noreferrer"
  >
    {/* LEFT ICON */}
    <div className="w-16 h-16 rounded-xl flex items-center justify-center bg-[rgba(127,127,127,0.12)] ring-1 ring-[var(--border)] overflow-hidden shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/FIT ICON 512.png"
        alt="FitActive"
        className="w-14 h-14 object-contain"
      />
    </div>

    {/* RIGHT TEXT */}
    <div className="min-w-0">
      <div className={`font-semibold ${titleText}`}>
        Take control of your fitness journey
      </div>

      <div className={`text-sm ${mutedText} mt-1 leading-relaxed`}>
        Track workouts, monitor progress, analyze stats, set goals,
        manage records and grow stronger every day.
      </div>
    </div>
  </Link>
</div>

{/* LOTTODATA WIDGET */}
<div className="mt-4">
  <Link
    href="https://lottodata.org"
    className={`${card} p-4 flex items-start gap-4 hover:opacity-95 transition no-underline`}
    target="_blank"
    rel="noreferrer"
  >
    {/* LEFT ICON */}
    <div className="w-16 h-16 rounded-xl flex items-center justify-center bg-[rgba(127,127,127,0.12)] ring-1 ring-[var(--border)] overflow-hidden shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/LOTTODATA ICON 512.png" 
        alt="LottoData"
        className="w-14 h-14 object-contain"
      />
    </div>

    {/* RIGHT TEXT */}
    <div className="min-w-0">
      <div className={`font-semibold ${titleText}`}>
        Explore lottery results and statistics
      </div>

      <div className={`text-sm ${mutedText} mt-1 leading-relaxed`}>
        Check latest draws, view historical results, analyze number
        frequencies and discover trends across popular lotteries.
      </div>
    </div>
  </Link>
</div>


{/* CURRENCYHUB WIDGET */}
<div className="mt-4">
  <Link
    href="https://play.google.com/store/apps/details?id=com.app.mycoins&hl=en"
    className={`${card} p-4 flex items-start gap-4 hover:opacity-95 transition no-underline`}
    target="_blank"
    rel="noreferrer"
  >
    {/* LEFT ICON */}
    <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-[rgba(127,127,127,0.12)] ring-1 ring-[var(--border)] overflow-hidden shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/currency hub icon.png"
        alt="CurrencyHub"
        className="w-14 h-14 object-contain"
      />
    </div>

    {/* RIGHT TEXT */}
    <div className="min-w-0">
      <div className={`font-semibold ${titleText}`}>
        CurrencyHub — organize your coin collection
      </div>

      <div className={`text-sm ${mutedText} mt-1 leading-relaxed`}>
        Track your coins, manage quantities, add details like year,
        value and average price, and keep your entire collection
        organized right from your smartphone.
      </div>
    </div>
  </Link>
</div>
    </main>
  );
}