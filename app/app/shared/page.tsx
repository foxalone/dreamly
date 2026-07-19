"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { onAuthStateChanged } from "firebase/auth";

import { ensureUserProfileOnSignIn } from "@/lib/auth/ensureUserProfile";
import { auth, firestore } from "@/lib/firebase";
import BottomNav from "../BottomNav";

const SIGNIN_NEXT = "/signin?next=/app/shared";

type ReactionKey = "heart" | "like" | "star";

type DreamEmoji = {
  native: string;
  name?: string;
  id?: string;
};

type TargetLang = "en" | "ru" | "he";

type SharedDream = {
  id: string;
  sourceType?: "dream" | "story";

  title?: string;
  text?: string;

  dateKey?: string;
  timeKey?: string;
  sharedAtMs?: number;

  ownerUid?: string;
  ownerDreamId?: string;
  ownerStoryId?: string;

  // author fields (saved when sharing)
  authorName?: string | null;
  authorEmail?: string | null;

  emojis?: DreamEmoji[] | any;

  wordCount?: number;
  charCount?: number;
  langGuess?: string;

  // cached translations by target lang (en/ru/he)
  translations?: Record<
    string,
    string | { text?: string; model?: string; atMs?: number }
  >;

  reactions?: {
    heart?: number;
    like?: number;
    star?: number;
  };
};

type MyReactions = Record<ReactionKey, boolean>;

const REACTIONS: { key: ReactionKey; label: string; emoji: string }[] = [
  { key: "heart", label: "Heart", emoji: "❤️" },
  { key: "like", label: "Like", emoji: "👍" },
  { key: "star", label: "Star", emoji: "⭐" },
];

function safeNum(n: any) {
  return Number.isFinite(Number(n)) ? Number(n) : 0;
}

function normalizeEmojis(v: any): DreamEmoji[] {
  if (!v) return [];

  if (Array.isArray(v)) {
    const out: DreamEmoji[] = [];
    for (const item of v) {
      if (!item) continue;

      if (typeof item === "string") {
        out.push({ native: item });
        continue;
      }

      if (typeof item === "object") {
        const native = String(
          item.native ?? item.emoji ?? item.icon ?? item.value ?? ""
        ).trim();
        if (!native) continue;

        out.push({
          native,
          name: item.name ? String(item.name) : undefined,
          id: item.id ? String(item.id) : undefined,
        });
      }
    }
    return out.slice(0, 8);
  }

  if (typeof v === "string") {
    return v
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 8)
      .map((x) => ({ native: x }));
  }

  return [];
}

// ✅ initials from email (preferred), fallback to name; NEVER use ownerUid/uuid
function authorLabel(d: SharedDream) {
  const email = (d.authorEmail ?? "").trim();
  if (email) return email;

  const name = (d.authorName ?? "").trim();
  if (name) return name;

  return "U";
}

function initialsFromEmailOrText(s: string) {
  const src = (s ?? "").trim();
  if (!src) return "U";

  const left = src.includes("@") ? src.split("@")[0] : src; // email -> part before @
  const parts = left.split(/[\s._-]+/).filter(Boolean);

  const a = (parts[0]?.[0] ?? "U").toUpperCase();
  const b = (parts[1]?.[0] ?? parts[0]?.[1] ?? "").toUpperCase();
  return (a + b).slice(0, 2);
}

function getSharedTypeLabel(d: SharedDream) {
  return d.sourceType === "story" ? "Story" : "Dream";
}

function getUserTargetLang(): TargetLang {
  if (typeof window === "undefined") return "en";

  const saved = localStorage.getItem("recLang") ?? "";
  const nav = (navigator.language || "").toLowerCase();
  const raw = (saved || nav).toLowerCase();

  if (raw.startsWith("ru")) return "ru";
  if (raw.startsWith("he") || raw.startsWith("iw")) return "he";
  return "en";
}

function getCachedTranslation(
  d: SharedDream,
  lang: TargetLang
): string {
  const v = d.translations?.[lang];
  if (!v) return "";
  if (typeof v === "string") return v.trim();
  return String(v.text ?? "").trim();
}

/** Google Translate–style icon (A + 文) */
function TranslateIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function SharedPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [items, setItems] = useState<SharedDream[]>([]);
  const [my, setMy] = useState<Record<string, MyReactions>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetLang, setTargetLang] = useState<TargetLang>("en");
  // when set, show translated text for that dream id
  const [showingTranslation, setShowingTranslation] = useState<
    Record<string, string>
  >({});
  const [translateBusyId, setTranslateBusyId] = useState<string | null>(null);

  useEffect(() => {
    setTargetLang(getUserTargetLang());
  }, []);

  // ✅ auth state only (no anonymous login). Guests are allowed to view.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUid(u ? u.uid : null);
      if (!u) return;
      ensureUserProfileOnSignIn(u);
    });
    return () => unsub();
  }, []);

  // ✅ realtime shared_dreams feed
  useEffect(() => {
    const q = query(
      collection(firestore, "shared_dreams"),
      orderBy("sharedAtMs", "desc"),
      limit(50)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const next: SharedDream[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
        setItems(next);
      },
      (err) => {
        console.error("shared_dreams onSnapshot error:", err);
        setError(err?.message ?? "Failed to load shared dreams.");
      }
    );

    return () => unsub();
  }, []);

  // ✅ my reactions (only when signed in)
  useEffect(() => {
    if (!uid) {
      setMy({});
      return;
    }
    if (items.length === 0) return;

    let cancelled = false;

    (async () => {
      try {
        const pairs = await Promise.all(
          items.map(async (it) => {
            const rRef = doc(
              firestore,
              "shared_dreams",
              it.id,
              "reactions",
              uid
            );
            const rSnap = await getDoc(rRef);
            const data = rSnap.exists() ? (rSnap.data() as any) : {};
            const mr: MyReactions = {
              heart: !!data.heart,
              like: !!data.like,
              star: !!data.star,
            };
            return [it.id, mr] as const;
          })
        );

        if (cancelled) return;

        const map: Record<string, MyReactions> = {};
        for (const [id, mr] of pairs) map[id] = mr;
        setMy(map);
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? "Failed to load reactions.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uid, items]);

  const list = useMemo(() => items, [items]);

  async function toggleReaction(dreamId: string, key: ReactionKey) {
    if (!uid) {
      router.push(SIGNIN_NEXT);
      return;
    }

    const lock = `${dreamId}:${key}`;
    if (busyKey) return;

    setError(null);
    setBusyKey(lock);

    // optimistic
    setMy((prev) => {
      const cur = prev[dreamId] ?? { heart: false, like: false, star: false };
      return { ...prev, [dreamId]: { ...cur, [key]: !cur[key] } };
    });

    try {
      const dreamRef = doc(firestore, "shared_dreams", dreamId);
      const reactRef = doc(
        firestore,
        "shared_dreams",
        dreamId,
        "reactions",
        uid
      );

      await runTransaction(firestore, async (tx) => {
        const [dreamSnap, reactSnap] = await Promise.all([
          tx.get(dreamRef),
          tx.get(reactRef),
        ]);
        if (!dreamSnap.exists()) return;

        const dreamData = dreamSnap.data() as any;
        const reactions = dreamData.reactions ?? {};
        const oldCount = safeNum(reactions[key]);

        const prevOn = reactSnap.exists()
          ? !!(reactSnap.data() as any)[key]
          : false;

        const nextOn = !prevOn;
        const nextCount = Math.max(0, oldCount + (nextOn ? 1 : -1));

        tx.update(dreamRef, {
          [`reactions.${key}`]: nextCount,
          updatedAt: serverTimestamp(),
        });

        tx.set(
          reactRef,
          { [key]: nextOn, updatedAt: serverTimestamp() },
          { merge: true }
        );
      });
    } catch (e: any) {
      // rollback
      setMy((prev) => {
        const cur = prev[dreamId] ?? { heart: false, like: false, star: false };
        return { ...prev, [dreamId]: { ...cur, [key]: !cur[key] } };
      });
      setError(e?.message ?? "Failed to react.");
    } finally {
      setBusyKey(null);
    }
  }

  async function translateDream(d: SharedDream) {
    const original = (d.text ?? "").trim();
    if (!original) return;

    // toggle back to original if already showing translation
    if (showingTranslation[d.id]) {
      setShowingTranslation((prev) => {
        const next = { ...prev };
        delete next[d.id];
        return next;
      });
      return;
    }

    const lang = getUserTargetLang();
    setTargetLang(lang);

    const cached = getCachedTranslation(d, lang);
    if (cached) {
      setShowingTranslation((prev) => ({ ...prev, [d.id]: cached }));
      return;
    }

    if (translateBusyId) return;

    setError(null);
    setTranslateBusyId(d.id);

    try {
      const res = await fetch("/api/dreams/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sharedDreamId: d.id,
          text: original,
          targetLang: lang,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Translate failed");

      const translation = String(data?.translation ?? "").trim();
      if (!translation) throw new Error("Empty translation");

      setShowingTranslation((prev) => ({ ...prev, [d.id]: translation }));

      const entry = {
        text: translation,
        model: data?.model ?? undefined,
        atMs: Date.now(),
      };

      // optimistic local cache so re-clicks don't re-fetch before snapshot updates
      setItems((prev) =>
        prev.map((x) =>
          x.id === d.id
            ? {
                ...x,
                translations: {
                  ...(x.translations ?? {}),
                  [lang]: entry,
                },
              }
            : x
        )
      );

      // client fallback write if API couldn't persist (permissions / admin env)
      if (!data?.cached && uid) {
        try {
          await updateDoc(doc(firestore, "shared_dreams", d.id), {
            [`translations.${lang}`]: entry,
            updatedAt: serverTimestamp(),
          });
        } catch (e) {
          console.warn("client translate cache write failed:", e);
        }
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to translate.");
    } finally {
      setTranslateBusyId(null);
    }
  }

  return (
    <main className="relative min-h-screen px-6 py-10 max-w-3xl mx-auto">
      <div>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-semibold text-[var(--text)]">Feed</h1>
        </div>

        {error && (
          <div className="mt-5 text-sm text-red-200 bg-red-600/15 border border-red-500/30 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {list.length === 0 ? (
          <div className="mt-8 p-5 rounded-2xl bg-[var(--card)] text-[var(--muted)] border border-white/10">
            No shared items yet.
          </div>
        ) : (
          <div className="mt-8 space-y-3">
            {list.map((d, index) => {
              const myR = my[d.id] ?? { heart: false, like: false, star: false };
              const r = d.reactions ?? {};
              const emojis = normalizeEmojis(d.emojis);
              const sourceLabel = getSharedTypeLabel(d);
              const sourceNum = list.length - index;

              const aLabel = authorLabel(d); // ✅ email first
              const aInit = initialsFromEmailOrText(aLabel);

              return (
                <div
                  key={d.id}
                  className="p-5 rounded-2xl bg-[var(--card)] border border-white/10"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex items-center gap-3">
                      {/* ✅ author initials (email-based; never uuid) */}
                      <div
                        className="w-7 h-7 rounded-full border border-white/10 flex items-center justify-center text-[10px] text-[var(--muted)]"
                        title={aLabel}
                      >
                        {aInit}
                      </div>

                      {/* icons */}
                      {emojis.length > 0 ? (
                        <span className="inline-flex items-baseline gap-2 text-[18px] leading-none select-none">
                          {emojis.slice(0, 5).map((em, i) => (
                            <span
                              key={`${d.id}:${em.native}:${i}`}
                              title={em.name || em.id || "emoji"}
                              className="cursor-help"
                            >
                              {em.native}
                            </span>
                          ))}
                        </span>
                      ) : null}
                    </div>

                    {/* date */}
                    <div className="text-xs text-[var(--muted)] whitespace-nowrap">
                      {(d.dateKey ?? "") + (d.timeKey ? ` ${d.timeKey}` : "")}
                    </div>
                  </div>

                  <div className="mt-3 text-[var(--text)] whitespace-pre-wrap break-words">
                    {showingTranslation[d.id] ?? d.text}
                  </div>

                  <div className="mt-2 text-xs text-[var(--muted)]">{sourceLabel} #{sourceNum}</div>

                  <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex gap-2">
                      {REACTIONS.map((x) => {
                        const active = !!myR[x.key];
                        const isBusy = busyKey === `${d.id}:${x.key}`;
                        const count = safeNum((r as any)[x.key]);

                        const cls = [
                          "react-btn px-3 py-1.5 rounded-full text-xs font-semibold transition border inline-flex items-center gap-2",
                          active ? `react-btn--${x.key}` : "",
                          isBusy ? "opacity-70 cursor-wait" : "",
                        ]
                          .filter(Boolean)
                          .join(" ");

                        return (
                          <button
                            key={x.key}
                            onClick={() => toggleReaction(d.id, x.key)}
                            disabled={isBusy}
                            className={cls}
                            title={uid ? x.label : `Sign in to ${x.label.toLowerCase()}`}
                          >
                            <span>{x.emoji}</span>
                            <span className="tabular-nums">{count}</span>
                          </button>
                        );
                      })}
                    </div>

                    {(() => {
                      const isShowing = !!showingTranslation[d.id];
                      const isBusy = translateBusyId === d.id;
                      const hasCache = !!getCachedTranslation(d, targetLang);
                      const label = isBusy
                        ? "Translating…"
                        : isShowing
                          ? "Show original"
                          : `Translate to ${targetLang.toUpperCase()}`;

                      return (
                        <button
                          onClick={() => translateDream(d)}
                          disabled={isBusy || !(d.text ?? "").trim()}
                          aria-label={label}
                          className={[
                            "react-btn react-btn--translate w-8 h-8 rounded-full text-xs font-semibold transition border inline-flex items-center justify-center",
                            isShowing || hasCache ? "react-btn--translate-on" : "",
                            isBusy ? "opacity-70 cursor-wait" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          title={label}
                        >
                          <TranslateIcon
                            className={isBusy ? "animate-pulse" : undefined}
                          />
                        </button>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
