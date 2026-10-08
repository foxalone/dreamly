"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Keyboard, Mic } from "lucide-react";
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
import { signInWithGoogle } from "@/lib/auth/signInWithGoogle";
import { auth, firestore } from "@/lib/firebase";
import { openPaywall } from "@/lib/paywall";
import { useMessages } from "@/lib/i18n/LocaleProvider";
import { shareBadgeById, shareBadgeFor } from "@/lib/shareBadges";
import { shareBadgeLabel } from "@/lib/shareBadgeLabel";

import { useTranslationLanguage } from "@/lib/useTranslationLanguage";
import { type TranslationLanguage } from "@/lib/translationLanguage";
import { formatMessage } from "@/lib/i18n/messages";

const SIGNIN_NEXT = "/signin?next=/app/shared";

type ReactionKey = "heart" | "like" | "star";

type DreamEmoji = {
  native: string;
  name?: string;
  id?: string;
};

type TargetLang = TranslationLanguage;

type SharedDream = {
  id: string;
  sourceType?: "dream" | "story";
  source?: "manual" | "voice";

  title?: string;
  text?: string;
  // ISO 639-1 code detected server-side at share time (see /api/dreams/detect-lang)
  lang?: string;

  dateKey?: string;
  timeKey?: string;
  sharedAtMs?: number;

  ownerUid?: string;
  ownerDreamId?: string;
  ownerStoryId?: string;

  // author fields (saved when sharing)
  authorName?: string | null;
  authorEmail?: string | null;
  authorInitials?: string | null;
  // creature level of the author at share time (lib/shareBadges.ts) — shown
  // instead of initials, so a share stays anonymous
  shareBadge?: string;
  fromGuest?: boolean;
  ownerGuestId?: string;

  emojis?: DreamEmoji[] | any;

  wordCount?: number;
  charCount?: number;
  langGuess?: string;

  // languages a paid translation exists for (text itself is private — see
  // app/api/dreams/_lib/translationLedger.ts)
  translatedLangs?: string[];
  translationCount?: number;

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

// ✅ initials stored at share time; legacy docs fall back to email/name; NEVER use ownerUid/uuid
function authorLabel(d: SharedDream) {
  const initials = (d.authorInitials ?? "").trim();
  if (initials) return initials;

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

// The dream's own language: the server-detected `lang` when present, otherwise a
// script-based guess. Used to hide the translate button when it would only
// "translate" a text into the language it is already in (that call still costs
// the user's one free daily translation).
function dreamLang(d: SharedDream): string | null {
  const stored = (d.lang ?? "").trim().toLowerCase();
  if (stored) return stored;
  return detectLangByScript(d.text ?? "");
}

// Fallback for dreams shared before server-side detection existed.
// Returns null when the script is none of the three supported targets (Arabic,
// CJK, ...) — such a dream can always be translated.
function detectLangByScript(text: string): TargetLang | null {
  const s = text ?? "";
  const cyr = (s.match(/[\u0400-\u04FF]/g) ?? []).length;
  const heb = (s.match(/[\u0590-\u05FF]/g) ?? []).length;
  const lat = (s.match(/[A-Za-z]/g) ?? []).length;
  const other = (s.match(/\p{L}/gu) ?? []).length - cyr - heb - lat;
  const max = Math.max(cyr, heb, lat, other);
  if (max === 0) return null;
  if (max === cyr) return "ru";
  if (max === heb) return "he";
  if (max === lat) return "en";
  return null;
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
  const { targetLang, ready: languageReady } = useTranslationLanguage(uid);
  const translationContext = `${uid}:${targetLang}`;
  const translationContextRef = useRef(translationContext);
  translationContextRef.current = translationContext;
  // when set, show translated text for that dream id
  const [showingTranslation, setShowingTranslation] = useState<
    Record<string, string>
  >({});
  const [translateBusyId, setTranslateBusyId] = useState<string | null>(null);
  // dream ids + langs this user already paid for ("<dreamId>:<lang>") — the
  // cached text on shared_dreams is shared, but each user unlocks it once.
  const [unlocked, setUnlocked] = useState<Set<string>>(() => new Set());
  // translations fetched in this session ("<dreamId>:<lang>" → text) so a
  // second click doesn't hit the API again
  const [fetchedTranslations, setFetchedTranslations] = useState<Record<string, string>>({});
  // uid whose guest translation unlocks (cookie) were already handed over to
  // the account this page load — a pending translate waits for it, so the
  // account is never charged for a dream the guest already paid for.
  const [claimedUid, setClaimedUid] = useState<string | null>(null);
  // dream to translate as soon as the guest finished signing in from the modal
  const pendingAfterSignInRef = useRef<SharedDream | null>(null);
  const translateRef = useRef<(d: SharedDream) => Promise<void>>(async () => {});
  const t = useMessages();

  useEffect(() => {
    setShowingTranslation({});
    setFetchedTranslations({});
  }, [translationContext]);

  // ✅ auth state only (no anonymous login). Guests are allowed to view.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUid(u ? u.uid : null);
      if (!u) return;
      ensureUserProfileOnSignIn(u);
    });
    return () => unsub();
  }, []);

  // ✅ guest → account: move translations unlocked with ads (see
  // /api/dreams/claim-guest-translations). Idempotent; cheap when nothing to move.
  useEffect(() => {
    if (!uid) {
      setClaimedUid(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const u = auth.currentUser;
        if (!u || u.uid !== uid) return;
        const idToken = await u.getIdToken();
        await fetch("/api/dreams/claim-guest-translations", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
      } catch (e) {
        console.warn("claim-guest-translations failed:", e);
      } finally {
        if (!cancelled) setClaimedUid(uid);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  // ✅ translate the dream the guest clicked, once signed in, claimed and the
  // account's language preference is known.
  useEffect(() => {
    const d = pendingAfterSignInRef.current;
    if (!d || !uid || claimedUid !== uid || !languageReady) return;
    pendingAfterSignInRef.current = null;
    void translateRef.current(d);
  }, [uid, claimedUid, languageReady]);

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
        // Author-deleted dreams keep a stripped doc (emojis/city only) — never show it.
        const next: SharedDream[] = snap.docs
          .filter((d) => d.data()?.deleted !== true)
          .map((d) => ({
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

  // ✅ my translation unlocks (only when signed in). Read-only optimisation:
  // the server is the authority, so a rules error here just means one extra
  // API round-trip per click.
  useEffect(() => {
    if (!uid) {
      setUnlocked(new Set());
      return;
    }
    const unsub = onSnapshot(
      collection(firestore, "users", uid, "translationUnlocks"),
      (snap) => {
        const next = new Set<string>();
        snap.docs.forEach((d) => {
          const langs = (d.data() as any)?.langs;
          if (!langs || typeof langs !== "object") return;
          Object.keys(langs).forEach((l) => next.add(`${d.id}:${l}`));
        });
        setUnlocked(next);
      },
      (err) => console.warn("translationUnlocks onSnapshot error:", err?.message ?? err)
    );
    return () => unsub();
  }, [uid]);

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

    // Guests may translate too: the API identifies them by the dreamly_guest
    // cookie and charges an ad credit (402 GUEST_AD_REQUIRED → modal with
    // "continue with Google" / "watch an ad"). Their target language is the
    // browser's, since there is no profile preference yet.
    const u = auth.currentUser;

    if (!languageReady) return;
    const lang = targetLang;
    const requestContext = translationContext;

    // Same language as the viewer — never spend a translation on it.
    if (dreamLang(d) === lang) return;

    // The translated text is never in the public dream doc: it always comes
    // from the API, which serves it free to a user who already unlocked this
    // dream+lang, and otherwise spends the daily free slot / requires Pro
    // (reusing the cache instead of calling OpenAI when it exists).
    const key = `${d.id}:${lang}`;
    const already = fetchedTranslations[key];
    if (already) {
      setShowingTranslation((prev) => ({ ...prev, [d.id]: already }));
      return;
    }

    if (translateBusyId) return;

    setError(null);
    setTranslateBusyId(d.id);

    try {
      const idToken = u ? await u.getIdToken() : undefined;
      const res = await fetch("/api/dreams/translate", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sharedDreamId: d.id,
          text: original,
          targetLang: lang,
          ...(idToken ? { idToken } : {}),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.code === "GUEST_AD_REQUIRED" || (!u && res.status === 402)) {
          // Guest: sign in with Google (one free translation a day, and the
          // translations unlocked with ads move to the account) or watch an ad.
          openPaywall({
            kind: "translate",
            source: "feed_translate_guest",
            guest: {
              reason: "translate",
              signIn: () => {
                pendingAfterSignInRef.current = d;
                signInWithGoogle().catch((e) => {
                  pendingAfterSignInRef.current = null;
                  // popup closed by the user is not an error worth showing
                  if (e?.code !== "auth/popup-closed-by-user" && e?.code !== "auth/cancelled-popup-request") {
                    setError(e?.message ?? "Sign-in failed.");
                  }
                });
              },
            },
            retry: () => void translateRef.current(d),
          });
          return;
        }
        if (data?.code === "SUBSCRIPTION_REQUIRED" || data?.code === "INSUFFICIENT_CREDITS" || res.status === 402) {
          // Daily free translation already used and no subscription:
          // the site-wide paywall (plans + "watch an ad" → one more translation).
          openPaywall({ kind: "translate", source: "feed_translate", retry: () => void translateRef.current(d) });
          return;
        }
        throw new Error(data?.error ?? "Translate failed");
      }

      const translation = String(data?.translation ?? "").trim();
      if (!translation) throw new Error("Empty translation");

      if (translationContextRef.current !== requestContext) return;
      setShowingTranslation((prev) => ({ ...prev, [d.id]: translation }));
      setFetchedTranslations((prev) => ({ ...prev, [key]: translation }));
      setUnlocked((prev) => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });
    } catch (e: any) {
      setError(e?.message ?? "Failed to translate.");
    } finally {
      setTranslateBusyId(null);
    }
  }

  translateRef.current = translateDream;

  return (
    <main className="relative min-h-screen px-6 pt-4 pb-10 max-w-3xl mx-auto">
      <div>
        <h1 className="sr-only">Feed</h1>

        {error && (
          <div className="mt-5 text-sm text-red-200 bg-red-600/15 border border-red-500/30 rounded-xl px-4 py-3">
            {error}
          </div>
        )}


        {list.length === 0 ? (
          <div className="mt-2 p-5 rounded-2xl bg-[var(--card)] text-[var(--muted)] border border-white/10">
            No shared items yet.
          </div>
        ) : (
          <div className="mt-2 space-y-3">
            {list.map((d, index) => {
              const myR = my[d.id] ?? { heart: false, like: false, star: false };
              const r = d.reactions ?? {};
              const emojis = normalizeEmojis(d.emojis);
              const sourceLabel = getSharedTypeLabel(d);
              const sourceNum = list.length - index;

              // creature the author had at THIS share (stamped at share time), so
              // one person's older dreams can show a lower level than newer ones;
              // an unstamped guest share is always their first → 🦄
              const badge =
                shareBadgeById(d.shareBadge) ?? (d.fromGuest || d.ownerGuestId ? shareBadgeFor(1) : null);
              const aLabel = badge
                ? `${t.shareBadges.anonymous} · ${shareBadgeLabel(t, badge)}`
                : authorLabel(d); // legacy docs: initials
              const aInit = badge ? badge.emoji : initialsFromEmailOrText(aLabel);

              return (
                <div
                  key={d.id}
                  className="p-5 rounded-2xl bg-[var(--card)] border border-white/10"
                >
                  {/* Phone: the time goes under the icons so the two never overlap; sm+: one row. */}
                  <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <div className="min-w-0 max-w-full flex items-center gap-3">
                      {/* ✅ author initials (email-based; never uuid) */}
                      <div
                        className={[
                          "shrink-0 rounded-full flex items-center justify-center",
                          badge
                            ? // the author's creature: bigger than the dream icons and in its own
                              // circle, so it never reads as one of them (light and dark theme)
                              "size-11 text-[26px] leading-none cursor-help bg-[color-mix(in_srgb,#a855f7_14%,var(--card))] ring-1 ring-purple-400/60"
                            : "w-7 h-7 border border-[var(--border)] text-[10px] text-[var(--muted)]",
                        ].join(" ")}
                        title={aLabel}
                        aria-label={aLabel}
                      >
                        {aInit}
                      </div>
                      {badge && emojis.length > 0 ? (
                        <span aria-hidden className="h-6 w-px shrink-0 bg-[var(--border)]" />
                      ) : null}

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

                    {/* input method + date */}
                    <div className="text-xs text-[var(--muted)] whitespace-nowrap inline-flex items-center gap-2">
                      <span
                        className="opacity-70 inline-flex items-center"
                        title={d.source === "voice" ? "Recorded" : "Typed"}
                        aria-label={d.source === "voice" ? "Recorded" : "Typed"}
                      >
                        {d.source === "voice" ? (
                          <Mic size={14} strokeWidth={1.8} aria-hidden />
                        ) : (
                          <Keyboard size={14} strokeWidth={1.8} aria-hidden />
                        )}
                      </span>
                      <span className="opacity-70">
                        {(d.dateKey ?? "") + (d.timeKey ? ` ${d.timeKey}` : "")}
                      </span>
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
                      const text = (d.text ?? "").trim();
                      // Already in the viewer's language — nothing to translate.
                      if (!text || dreamLang(d) === targetLang) return null;

                      const isShowing = !!showingTranslation[d.id];
                      const isBusy = translateBusyId === d.id;
                      // this viewer already paid for this dream+lang
                      const hasMine = unlocked.has(`${d.id}:${targetLang}`);
                      const label = isBusy
                        ? t.profile.translating
                        : isShowing
                          ? t.profile.showOriginal
                          : formatMessage(t.profile.translateTo, { language: targetLang.toUpperCase() });
                      const title = isBusy || isShowing || hasMine
                        ? label
                        : `${label} (${uid ? t.profile.translationAllowance : t.profile.guestTranslationAllowance})`;

                      return (
                        <button
                          onClick={() => translateDream(d)}
                          disabled={isBusy || !languageReady}
                          aria-label={label}
                          className={[
                            "react-btn react-btn--translate w-8 h-8 rounded-full text-xs font-semibold transition border inline-flex items-center justify-center",
                            isShowing || hasMine ? "react-btn--translate-on" : "",
                            isBusy ? "opacity-70 cursor-wait" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          title={title}
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

    </main>
  );
}
