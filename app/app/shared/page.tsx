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

export default function SharedPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [items, setItems] = useState<SharedDream[]>([]);
  const [my, setMy] = useState<Record<string, MyReactions>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
                    {d.text}
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
