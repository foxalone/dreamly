"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

import { auth, firestore } from "@/lib/firebase";
import { ensureUserProfileOnSignIn } from "@/lib/auth/ensureUserProfile";

import { loadScript } from "@paypal/paypal-js";

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

type PackId = "pack_20" | "pack_50" | "pack_120" | "pack_300";

const PACK_LABELS: Record<PackId, { title: string; price: string; currency: string }> = {
  pack_20: { title: "20 credits", price: "3.99", currency: "USD" },
  pack_50: { title: "50 credits", price: "7.99", currency: "USD" },
  pack_120: { title: "120 credits", price: "14.99", currency: "USD" },
  pack_300: { title: "300 credits", price: "29.99", currency: "USD" },
};

export default function ProfilePage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);

  const [showCredits, setShowCredits] = useState(false);

  // PayPal UI state
  const [selectedPack, setSelectedPack] = useState<PackId>("pack_20");
  const [payMsg, setPayMsg] = useState<string>("");
  const [payBusy, setPayBusy] = useState(false);

  const paypalHostRef = useRef<HTMLDivElement | null>(null);
  const paypalRenderedForRef = useRef<string>(""); // packId|currency

  // --- auth ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setCredits(null);
        return;
      }
      ensureUserProfileOnSignIn(u);
    });
    return () => unsub();
  }, []);

  // --- credits live ---
  useEffect(() => {
    if (!user?.uid) return;

    const ref = doc(firestore, "users", user.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setCredits(0);
          return;
        }
        const data = snap.data() as any;
        setCredits(typeof data?.credits === "number" ? data.credits : 0);
      },
      (err) => {
        console.error("credits snapshot error:", err);
        setCredits(null);
      }
    );

    return () => unsub();
  }, [user?.uid]);

  // --- theme ---
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

  // --- styles ---
  const card = "rounded-2xl bg-[var(--card)] border border-[var(--border)]";
  const titleText = "text-[var(--text)]";
  const mutedText = "text-[var(--muted)]";

  const pillBase = "h-11 px-5 rounded-full font-semibold transition border";
  const pillSurface =
    "bg-[var(--card)] text-[var(--text)] border-[var(--border)] hover:opacity-90";
  const pillDisabled = "disabled:opacity-50 disabled:cursor-not-allowed";

  const ADMIN_UIDS = new Set<string>(["sGbA77TlcsatEMrgEvCv7Shjrj32"]);
  const isAdmin = !!user?.uid && ADMIN_UIDS.has(user.uid);

  // ---------- PayPal Buttons render ----------
  useEffect(() => {
    const enabled = !!user && showCredits;
    if (!enabled) return;

    const host = paypalHostRef.current;
    if (!host) return;

    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    if (!clientId) {
      setPayMsg("❌ Missing NEXT_PUBLIC_PAYPAL_CLIENT_ID");
      return;
    }

    const { currency } = PACK_LABELS[selectedPack];
    const renderKey = `${selectedPack}|${currency}`;

    // не перерисовываем по кругу без надобности
    if (paypalRenderedForRef.current === renderKey && host.childElementCount > 0) return;

    // чистим контейнер и перерисовываем
    host.innerHTML = "";
    paypalRenderedForRef.current = renderKey;

    let cancelled = false;

    (async () => {
      setPayMsg("");
      setPayBusy(false);

      const paypal = await loadScript({
        clientId,
        currency,
        intent: "capture",
      });

      if (!paypal || cancelled) return;

      // @ts-ignore
      await paypal
        .Buttons({
          style: { layout: "vertical" },

          createOrder: async () => {
            try {
              setPayBusy(true);
setPayMsg("Creating order…");

              const r = await fetch("/api/paypal/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ packId: selectedPack }),
              });

              const j = await r.json();
              if (!r.ok) throw new Error(j?.error || "create-order failed");

setPayMsg("Open PayPal and approve the payment…");
              return j.orderID;
            } finally {
              setPayBusy(false);
            }
          },

          onApprove: async (data: any) => {
            try {
              setPayBusy(true);
setPayMsg("Capturing payment…");

              const u = auth.currentUser;
              if (!u) throw new Error("Not signed in");

              const idToken = await u.getIdToken();

              const r = await fetch("/api/paypal/capture-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderID: data?.orderID, idToken }),
              });

              const j = await r.json();
              if (!r.ok) throw new Error(j?.error || "capture-order failed");

setPayMsg(`✅ Done! ${j.creditsAdded} credits added.`);
            } catch (e: any) {
              setPayMsg(`❌ Error: ${e?.message || "Unknown error"}`);
            } finally {
              setPayBusy(false);
            }
          },

          onCancel: () => {
            setPayMsg("Платёж отменён.");
          },

          onError: (err: any) => {
            setPayMsg(`❌ Error PayPal: ${String(err?.message || err)}`);
            setPayBusy(false);
          },
        })
        .render(host);
    })().catch((e) => setPayMsg(`❌ ${e?.message || "PayPal init failed"}`));

    return () => {
      cancelled = true;
    };
  }, [user, showCredits, selectedPack]);

  return (
    <main className="px-6 py-10 max-w-3xl mx-auto">
      <h1 className={`text-3xl font-semibold ${titleText}`}>Profile</h1>

     {/* TOP BUTTONS */}
<div className="mt-6 flex flex-wrap md:flex-nowrap items-center gap-3">
  <button onClick={toggleTheme} className={`${pillBase} ${pillSurface}`}>
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
    onClick={() => {
      if (!user) return;
      window.location.href = "/app/upgrade";
    }}
    disabled={!user}
    className={`${pillBase} ${pillSurface} ${pillDisabled}`}
  >
    💳 Buy credits
  </button>

  {user ? (
    <div
      className="
        h-11 px-4 rounded-full
        bg-[rgba(16,185,129,0.12)]
        border border-[rgba(16,185,129,0.25)]
        text-[var(--text)]
        flex items-center gap-2
        font-semibold
      "
      title="Your current balance"
    >
      <span className="opacity-80">💳</span>
      <span>{credits === null ? "…" : credits}</span>
    </div>
  ) : null}
</div>

      {/* TOP LINKS */}
      <div
        className={`mt-6 w-full flex flex-wrap justify-center items-center gap-3 text-sm ${mutedText}`}
      >
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
        <span className="opacity-40">•</span>
        <Link
          href="https://docs.google.com/document/d/e/2PACX-1vT8-k5pcd0iH9cAZHgeIbbqVpOAJeIoJ6ZIAZfbxuaKgJcRQXw3S5vk2Fz_lrnppLvg9iOe4JuGMqQ1/pub"
          className="hover:underline underline-offset-4 opacity-90 hover:opacity-100"
        >
          Refund
        </Link>
      </div>

      {/* BUY CREDITS CARD (PayPal JS SDK Buttons) */}
      {user && showCredits ? (
        <div className="mt-6">
          <div className={`${card} p-5`}>
            <div className={`text-lg font-semibold ${titleText}`}>Buy credits</div>
            <div className={`text-sm ${mutedText} mt-1`}>
              Credits are added automatically after successful payment.
            </div>

            {/* packs */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Object.keys(PACK_LABELS) as PackId[]).map((packId) => {
                const active = packId === selectedPack;
                const p = PACK_LABELS[packId];
                return (
                  <button
                    key={packId}
                    onClick={() => setSelectedPack(packId)}
                    className={[
                      "text-left rounded-2xl border bg-[var(--card)] p-4 transition hover:opacity-95",
                      active ? "border-emerald-500/50" : "border-[var(--border)]",
                    ].join(" ")}
                  >
                    <div className={`font-semibold ${titleText}`}>{p.title}</div>
                    <div className={`text-sm ${mutedText}`}>
                      ${p.price} {p.currency}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* PayPal Buttons mount */}
            <div className="mt-5">
              <div className={`text-sm ${mutedText} mb-2`}>
                Pay with PayPal (no more ncp links).
              </div>

              <div
                ref={paypalHostRef}
                className={payBusy ? "opacity-80 pointer-events-none" : ""}
              />

              {payMsg ? (
                <div className={`mt-3 text-sm ${mutedText}`}>{payMsg}</div>
              ) : null}
            </div>

            <div className={`text-xs ${mutedText} mt-4`}>
  Credits are added immediately after payment (server-side capture).
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

      {/* WIDGETS */}
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
              Track workouts, monitor progress, analyze stats, set goals, manage records and grow
              stronger every day.
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
            <img
              src="/LOTTODATA ICON 512.png"
              alt="LottoData"
              className="w-14 h-14 object-contain"
            />
          </div>
          <div className="min-w-0">
            <div className={`font-semibold ${titleText}`}>Explore lottery results and statistics</div>
            <div className={`text-sm ${mutedText} mt-1 leading-relaxed`}>
              Check latest draws, view historical results, analyze number frequencies and discover
              trends across popular lotteries.
            </div>
          </div>
        </Link>
      </div>

      <div className="mt-4">
        <Link
          href="https://play.google.com/store/apps/details?id=com.app.mycoins&hl=en"
          className={`${card} p-4 flex items-start gap-4 hover:opacity-95 transition no-underline`}
          target="_blank"
          rel="noreferrer"
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-[rgba(127,127,127,0.12)] ring-1 ring-[var(--border)] overflow-hidden shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/currency hub icon.png"
              alt="CurrencyHub"
              className="w-14 h-14 object-contain"
            />
          </div>
          <div className="min-w-0">
            <div className={`font-semibold ${titleText}`}>CurrencyHub — organize your coin collection</div>
            <div className={`text-sm ${mutedText} mt-1 leading-relaxed`}>
              Track your coins, manage quantities, add details like year, value and average price,
              and keep your entire collection organized right from your smartphone.
            </div>
          </div>
        </Link>
      </div>

      {/* BOTTOM ACTIONS */}
<div className="mt-6 flex flex-col sm:flex-row gap-3">
  <button
    onClick={doSignOut}
    disabled={!user || busy}
    className={`${pillBase} bg-red-600 text-white border-transparent hover:bg-red-500 ${pillDisabled}`}
  >
    {busy ? "..." : "Sign out"}
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