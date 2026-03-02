"use client";

import BottomNav from "../BottomNav";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { auth, firestore } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

import { CREDIT_PACKS, type PackId } from "@/lib/credits/packs";

import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

type UIStatus = "idle" | "creating" | "paying" | "success" | "error";

function fmtMoney(price: string, currency: string) {
  const v = Number(price);
  if (!Number.isFinite(v)) return `${price} ${currency}`;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: String(currency || "USD").toUpperCase(),
    maximumFractionDigits: 2,
  }).format(v);
}

function packLabel(p: { credits: number }) {
  if (p.credits >= 300) return "Best value";
  if (p.credits >= 120) return "Popular";
  if (p.credits >= 50) return "Flexible";
  return "Try";
}

export default function UpgradePage() {
  const router = useRouter();
  const sp = useSearchParams();

  const initialFromUrl = sp.get("pkg");
  const initialPack = ((): PackId => {
    // поддержка старого вида pkg=20/50/120 -> маппим на packId
    if (initialFromUrl === "20") return "pack_20";
    if (initialFromUrl === "50") return "pack_50";
    if (initialFromUrl === "120") return "pack_120";
    if (initialFromUrl === "300") return "pack_300";
    // если кто-то передаст packId напрямую
    if (initialFromUrl && initialFromUrl in CREDIT_PACKS) return initialFromUrl as PackId;
    return "pack_120";
  })();

  const [uid, setUid] = useState<string | null>(null);
  const [credits, setCredits] = useState(0);
  const [creditsLoading, setCreditsLoading] = useState(true);

  const [selected, setSelected] = useState<PackId>(initialPack);
  const [status, setStatus] = useState<UIStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastAdded, setLastAdded] = useState<number | null>(null);

  // auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUid(u?.uid ?? null);
    });
    return () => unsub();
  }, []);

  // credits
  useEffect(() => {
    if (!uid) {
      setCredits(0);
      setCreditsLoading(false);
      return;
    }

    setCreditsLoading(true);
    const userRef = doc(firestore, "users", uid);
    const unsub = onSnapshot(
      userRef,
      (snap) => {
        const data = snap.exists() ? (snap.data() as any) : {};
        const next = Number.isFinite(Number(data?.credits))
          ? Math.max(0, Math.floor(Number(data.credits)))
          : 0;

        setCredits(next);
        setCreditsLoading(false);
      },
      () => {
        setCredits(0);
        setCreditsLoading(false);
      }
    );

    return () => unsub();
  }, [uid]);

  const pack = CREDIT_PACKS[selected];

  const paypalClientId =
    (process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "").trim();

  const paypalEnabled = !!paypalClientId;

  const scriptOptions = useMemo(() => {
    return {
      clientId: paypalClientId || "test", // PayPal SDK требует значение; если нет — кнопки всё равно не покажем
      currency: String(pack.currency).toUpperCase(),
      intent: "capture",
    } as const;
  }, [paypalClientId, pack.currency]);

  async function getIdTokenOrThrow() {
    const u = auth.currentUser;
    if (!u) throw new Error("Please sign in first.");
    const t = await u.getIdToken(/* forceRefresh */ true).catch(() => "");
    if (!t) throw new Error("Failed to get auth token. Please re-login.");
    return t;
  }

  async function createOrderOnServer(packId: PackId): Promise<string> {
    setStatus("creating");
    setError(null);

    const r = await fetch("/api/paypal/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packId }),
    });

    const j = await r.json().catch(() => ({} as any));
    if (!r.ok || !j?.orderID) {
      throw new Error(j?.error ?? "Failed to create PayPal order.");
    }

    setStatus("idle");
    return String(j.orderID);
  }

  async function captureOrderOnServer(orderID: string) {
    setStatus("paying");
    setError(null);

    const idToken = await getIdTokenOrThrow();

    const r = await fetch("/api/paypal/capture-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderID, idToken }),
    });

    const j = await r.json().catch(() => ({} as any));
    if (!r.ok || !j?.ok) {
      throw new Error(j?.error ?? "Capture failed.");
    }

    setLastAdded(Number(j.creditsAdded ?? 0) || null);
    setStatus("success");
  }

  const cards: { id: PackId; title: string; subtitle: string }[] = [
    { id: "pack_20", title: "20 credits", subtitle: "For trying it out" },
    { id: "pack_50", title: "50 credits", subtitle: "For regular use" },
    { id: "pack_120", title: "120 credits", subtitle: "Most popular" },
    { id: "pack_300", title: "300 credits", subtitle: "Best value" },
  ];

  return (
    <main className="relative min-h-screen px-5 sm:px-6 py-8 sm:py-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-2xl sm:text-3xl font-semibold text-[var(--text)]">Upgrade</div>
          <div className="mt-1 text-sm text-[var(--muted)]">
            Credits: {creditsLoading ? "…" : credits}
            {lastAdded ? <span className="ml-2 text-green-400">+{lastAdded}</span> : null}
          </div>
        </div>

        <button
          onClick={() => router.push("/app/dreams")}
          className="dream-btn dream-btn--neutral"
          type="button"
        >
          Back
        </button>
      </div>

      {/* Guard: not signed in */}
      {!uid && (
        <div className="mt-6 rounded-2xl bg-[var(--card)] border border-[var(--border)] p-5">
          <div className="text-[var(--text)] font-semibold">You are not signed in.</div>
          <div className="mt-2 text-[var(--muted)] text-sm">
            Please sign in first, then come back to buy credits.
          </div>
          <button
            onClick={() => router.push("/signin?next=/app/upgrade")}
            className="mt-4 dream-primary-btn"
            type="button"
          >
            Go to Sign in
          </button>
        </div>
      )}

      {/* PayPal client id missing */}
      {uid && !paypalEnabled && (
        <div className="mt-6 text-sm text-red-200 bg-red-600/15 border border-red-500/30 rounded-2xl px-4 py-4">
          Missing <code className="opacity-90">NEXT_PUBLIC_PAYPAL_CLIENT_ID</code>. PayPal buttons are disabled.
        </div>
      )}

      {/* Error / Success */}
      {uid && error && (
        <div className="mt-6 text-sm text-red-200 bg-red-600/15 border border-red-500/30 rounded-2xl px-4 py-4">
          {error}
        </div>
      )}

      {uid && status === "success" && (
        <div className="mt-6 text-sm text-green-200 bg-green-600/15 border border-green-500/30 rounded-2xl px-4 py-4">
          Payment completed. Credits added to your account.
        </div>
      )}

      {/* Cards */}
      {uid && (
        <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => {
            const p = CREDIT_PACKS[c.id];
            const active = selected === c.id;

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setSelected(c.id);
                  setStatus("idle");
                  setError(null);
                  setLastAdded(null);
                }}
                className={[
                  "text-left rounded-3xl border shadow-sm transition",
                  "bg-[var(--card)] border-[var(--border)]",
                  active ? "ring-2 ring-[color-mix(in_srgb,var(--text)_35%,transparent)]" : "hover:opacity-95",
                ].join(" ")}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-lg font-semibold text-[var(--text)]">{c.title}</div>
                      <div className="mt-1 text-sm text-[var(--muted)]">{c.subtitle}</div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold border border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_70%,transparent)] text-[var(--muted)]">
                      {packLabel(p)}
                    </span>
                  </div>

                  <div className="mt-4 text-2xl font-semibold text-[var(--text)]">
                    {fmtMoney(p.price, p.currency)}
                  </div>

                  <div className="mt-3 text-sm text-[var(--muted)] space-y-1">
                    <div>• Instant credits</div>
                    <div>• Use for save / analyze</div>
                    <div>• One-time purchase</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Checkout */}
      {uid && (
        <div className="mt-7 rounded-3xl bg-[var(--card)] border border-[var(--border)] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="text-lg font-semibold text-[var(--text)]">
                Selected: {pack.credits} credits
              </div>
              <div className="mt-1 text-sm text-[var(--muted)]">
                Total: {fmtMoney(pack.price, pack.currency)}
              </div>
            </div>

            <button
              onClick={() => router.push("/app/dreams")}
              className="dream-btn dream-btn--neutral"
              type="button"
            >
              Continue without buying
            </button>
          </div>

          <div className="mt-5">
            {!paypalEnabled ? (
              <div className="text-sm text-[var(--muted)]">
                PayPal is not configured.
              </div>
            ) : (
              <PayPalScriptProvider options={scriptOptions as any}>
                <div className={status === "paying" ? "opacity-70 pointer-events-none" : ""}>
                  <PayPalButtons
                    style={{ layout: "horizontal", label: "pay" }}
                    forceReRender={[selected, pack.currency, pack.price]}
                    createOrder={async () => {
                      try {
                        setError(null);
                        setLastAdded(null);
                        const orderID = await createOrderOnServer(selected);
                        return orderID;
                      } catch (e: any) {
                        setStatus("error");
                        setError(e?.message ?? "Failed to create order.");
                        throw e;
                      }
                    }}
                    onApprove={async (data) => {
                      try {
                        const orderID = String((data as any)?.orderID || "");
                        if (!orderID) throw new Error("Missing orderID from PayPal.");
                        await captureOrderOnServer(orderID);
                      } catch (e: any) {
                        setStatus("error");
                        setError(e?.message ?? "Payment capture failed.");
                      }
                    }}
                    onCancel={() => {
                      setStatus("idle");
                    }}
                    onError={(err) => {
                      console.error("PayPal error:", err);
                      setStatus("error");
                      setError("PayPal error. Please try again.");
                    }}
                  />
                </div>
              </PayPalScriptProvider>
            )}

            {status === "creating" && (
              <div className="mt-3 text-sm text-[var(--muted)]">Creating PayPal order…</div>
            )}
            {status === "paying" && (
              <div className="mt-3 text-sm text-[var(--muted)]">Finalizing payment…</div>
            )}
          </div>

          <div className="mt-4 text-xs text-[var(--muted)]">
            By purchasing, you agree this is a one-time digital credit top-up.
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}