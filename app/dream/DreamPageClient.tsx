"use client";

/**
 * Interactive part of the public dream page (/dream/<id>): live reactions,
 * the translate button and the comments ("interpretations") section.
 *
 * The dream text arrives server-rendered (SEO); this component re-renders it
 * only when the viewer switches to a translation. Guests see everything and
 * can type a comment — the Google sign-in opens only when they hit Publish,
 * and the pending text is published right after (nothing is lost).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, Mic, Trash2 } from "lucide-react";
import {
  collection,
  doc,
  getCountFromServer,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

import { ensureUserProfileOnSignIn } from "@/lib/auth/ensureUserProfile";
import { signInWithGoogle } from "@/lib/auth/signInWithGoogle";
import { auth, firestore } from "@/lib/firebase";
import { setAdUnlockPending, takeAdUnlockPending } from "@/lib/adUnlock";
import { openPaywall } from "@/lib/paywall";
import { useLocale, useMessages } from "@/lib/i18n/LocaleProvider";
import { formatMessage } from "@/lib/i18n/messages";
import LocaleLink from "@/lib/i18n/LocaleLink";
import { shareBadgeById, shareBadgeFor } from "@/lib/shareBadges";
import { shareBadgeLabel } from "@/lib/shareBadgeLabel";
import { useTranslationLanguage } from "@/lib/useTranslationLanguage";
import { type TranslationLanguage } from "@/lib/translationLanguage";

export type PublicSharedDream = {
  id: string;
  text: string;
  lang: string | null;
  sourceType: "dream" | "story";
  source: "manual" | "voice";
  dateKey: string;
  timeKey: string;
  sharedAtMs: number | null;
  shareBadge: string | null;
  fromGuest: boolean;
  /** legacy docs only (pre-badge shares): initials/email/name label */
  authorInitials: string;
  emojis: string[];
  reactions: { heart: number; like: number; star: number };
  commentCount: number;
};

export type MoreDream = {
  id: string;
  excerpt: string;
  emojis: string[];
};

type ReactionKey = "heart" | "like" | "star";
type MyReactions = Record<ReactionKey, boolean>;

type DreamComment = {
  id: string;
  text: string;
  authorUid: string;
  badge: string | null;
  createdAtMs: number;
};

const REACTIONS: { key: ReactionKey; label: string; emoji: string }[] = [
  { key: "heart", label: "Heart", emoji: "❤️" },
  { key: "like", label: "Like", emoji: "👍" },
  { key: "star", label: "Star", emoji: "⭐" },
];

const COMMENT_MAX = 1000;

function safeNum(n: any) {
  return Number.isFinite(Number(n)) ? Number(n) : 0;
}

// Same fallback as the feed (app/app/shared/page.tsx): dreams shared before
// server-side language detection get a script-based guess.
function detectLangByScript(text: string): TranslationLanguage | null {
  const s = text ?? "";
  const cyr = (s.match(/[Ѐ-ӿ]/g) ?? []).length;
  const heb = (s.match(/[֐-׿]/g) ?? []).length;
  const lat = (s.match(/[A-Za-z]/g) ?? []).length;
  const other = (s.match(/\p{L}/gu) ?? []).length - cyr - heb - lat;
  const max = Math.max(cyr, heb, lat, other);
  if (max === 0) return null;
  if (max === cyr) return "ru";
  if (max === heb) return "he";
  if (max === lat) return "en";
  return null;
}

function initialsFromEmailOrText(s: string) {
  const src = (s ?? "").trim();
  if (!src) return "U";
  const left = src.includes("@") ? src.split("@")[0] : src;
  const parts = left.split(/[\s._-]+/).filter(Boolean);
  const a = (parts[0]?.[0] ?? "U").toUpperCase();
  const b = (parts[1]?.[0] ?? parts[0]?.[1] ?? "").toUpperCase();
  return (a + b).slice(0, 2);
}

/** Google Translate–style icon (A + 文) — same as the feed. */
function TranslateIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <path
        d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function DreamPageClient({ dream, more }: { dream: PublicSharedDream; more: MoreDream[] }) {
  const locale = useLocale();
  const t = useMessages();

  const [uid, setUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // live counters (reactions + commentCount); starts from the server snapshot
  const [live, setLive] = useState({ reactions: dream.reactions, commentCount: dream.commentCount });
  const [my, setMy] = useState<MyReactions>({ heart: false, like: false, star: false });
  const [busyKey, setBusyKey] = useState<string | null>(null);

  // translation
  const { targetLang, ready: languageReady } = useTranslationLanguage(uid);
  const [translation, setTranslation] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [translateBusy, setTranslateBusy] = useState(false);
  const translateRef = useRef<(lang?: TranslationLanguage) => Promise<void>>(async () => {});
  const pendingAfterSignInRef = useRef(false);

  // comments
  const [comments, setComments] = useState<DreamComment[]>([]);
  const [draft, setDraft] = useState("");
  const [publishBusy, setPublishBusy] = useState(false);
  const [needSignIn, setNeedSignIn] = useState(false);
  const pendingCommentRef = useRef<string | null>(null);

  const dreamLang = useMemo(
    () => dream.lang ?? detectLangByScript(dream.text),
    [dream.lang, dream.text]
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUid(u ? u.uid : null);
      if (u) ensureUserProfileOnSignIn(u);
    });
    return () => unsub();
  }, []);

  // live dream doc (fresh counters even when the ISR page is a few minutes old)
  useEffect(() => {
    const unsub = onSnapshot(
      doc(firestore, "shared_dreams", dream.id),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as any;
        setLive({
          reactions: {
            heart: safeNum(data?.reactions?.heart),
            like: safeNum(data?.reactions?.like),
            star: safeNum(data?.reactions?.star),
          },
          commentCount: safeNum(data?.commentCount),
        });
      },
      (err) => console.warn("dream onSnapshot error:", err?.message ?? err)
    );
    return () => unsub();
  }, [dream.id]);

  // my reactions
  useEffect(() => {
    if (!uid) {
      setMy({ heart: false, like: false, star: false });
      return;
    }
    const unsub = onSnapshot(
      doc(firestore, "shared_dreams", dream.id, "reactions", uid),
      (snap) => {
        const data = snap.exists() ? (snap.data() as any) : {};
        setMy({ heart: !!data.heart, like: !!data.like, star: !!data.star });
      },
      (err) => console.warn("my reactions onSnapshot error:", err?.message ?? err)
    );
    return () => unsub();
  }, [uid, dream.id]);

  // comments, oldest first (a conversation under the dream)
  useEffect(() => {
    const q = query(
      collection(firestore, "shared_dreams", dream.id, "comments"),
      orderBy("createdAtMs", "asc"),
      limit(200)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setComments(
          snap.docs.map((d) => {
            const data = d.data() as any;
            return {
              id: d.id,
              text: String(data?.text ?? ""),
              authorUid: String(data?.authorUid ?? ""),
              badge: data?.badge ? String(data.badge) : null,
              createdAtMs: safeNum(data?.createdAtMs),
            };
          })
        );
      },
      (err) => console.warn("comments onSnapshot error:", err?.message ?? err)
    );
    return () => unsub();
  }, [dream.id]);

  async function toggleReaction(key: ReactionKey) {
    if (!uid) {
      // same popup flow as comments: stay on the page
      try {
        await signInWithGoogle();
      } catch (e: any) {
        if (e?.code !== "auth/popup-closed-by-user" && e?.code !== "auth/cancelled-popup-request") {
          setError(e?.message ?? "Sign-in failed.");
        }
      }
      return;
    }
    if (busyKey) return;
    setError(null);
    setBusyKey(key);
    setMy((prev) => ({ ...prev, [key]: !prev[key] }));
    try {
      const dreamRef = doc(firestore, "shared_dreams", dream.id);
      const reactRef = doc(firestore, "shared_dreams", dream.id, "reactions", uid);
      await runTransaction(firestore, async (tx) => {
        const [dreamSnap, reactSnap] = await Promise.all([tx.get(dreamRef), tx.get(reactRef)]);
        if (!dreamSnap.exists()) return;
        const reactions = (dreamSnap.data() as any).reactions ?? {};
        const prevOn = reactSnap.exists() ? !!(reactSnap.data() as any)[key] : false;
        const nextOn = !prevOn;
        tx.update(dreamRef, {
          [`reactions.${key}`]: Math.max(0, safeNum(reactions[key]) + (nextOn ? 1 : -1)),
          updatedAt: serverTimestamp(),
        });
        tx.set(reactRef, { [key]: nextOn, updatedAt: serverTimestamp() }, { merge: true });
      });
    } catch (e: any) {
      setMy((prev) => ({ ...prev, [key]: !prev[key] }));
      setError(e?.message ?? "Failed to react.");
    } finally {
      setBusyKey(null);
    }
  }

  async function translateDream(selectedLang?: TranslationLanguage) {
    const original = dream.text.trim();
    if (!original || !languageReady) return;

    if (showTranslation) {
      setShowTranslation(false);
      return;
    }
    const lang = selectedLang ?? targetLang;
    if (dreamLang === lang) return;
    if (translation) {
      setShowTranslation(true);
      return;
    }
    if (translateBusy) return;

    setError(null);
    setTranslateBusy(true);
    try {
      const u = auth.currentUser;
      const idToken = u ? await u.getIdToken() : undefined;
      const res = await fetch("/api/dreams/translate", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sharedDreamId: dream.id,
          text: original,
          targetLang: lang,
          ...(idToken ? { idToken } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.code === "GUEST_AD_REQUIRED" || (!u && res.status === 402)) {
          setAdUnlockPending({ kind: "translate", dreamId: dream.id, targetLang: lang });
          openPaywall({
            kind: "translate",
            translation: { sharedDreamId: dream.id, targetLang: lang },
            source: "dream_page_translate_guest",
            guest: {
              reason: "translate",
              signIn: () => {
                pendingAfterSignInRef.current = true;
                signInWithGoogle().catch((e) => {
                  pendingAfterSignInRef.current = false;
                  if (e?.code !== "auth/popup-closed-by-user" && e?.code !== "auth/cancelled-popup-request") {
                    setError(e?.message ?? "Sign-in failed.");
                  }
                });
              },
            },
            retry: () => void translateRef.current(lang),
          });
          return;
        }
        if (data?.code === "SUBSCRIPTION_REQUIRED" || data?.code === "INSUFFICIENT_CREDITS" || res.status === 402) {
          setAdUnlockPending({ kind: "translate", dreamId: dream.id, targetLang: lang });
          openPaywall({
            kind: "translate",
            translation: { sharedDreamId: dream.id, targetLang: lang },
            source: "dream_page_translate",
            retry: () => void translateRef.current(lang),
          });
          return;
        }
        throw new Error(data?.error ?? "Translate failed");
      }
      const next = String(data?.translation ?? "").trim();
      if (!next) throw new Error("Empty translation");
      setTranslation(next);
      setShowTranslation(true);
    } catch (e: any) {
      setError(e?.message ?? "Failed to translate.");
    } finally {
      setTranslateBusy(false);
    }
  }
  translateRef.current = translateDream;

  // a guest signed in from the paywall's "continue with Google" — run the translation
  useEffect(() => {
    if (!uid || !languageReady || !pendingAfterSignInRef.current) return;
    pendingAfterSignInRef.current = false;
    void translateRef.current();
  }, [uid, languageReady]);

  // back from the Offerwall (/ad/unlock): resume the paid-for translation
  const resumedRef = useRef(false);
  useEffect(() => {
    if (resumedRef.current || !languageReady) return;
    resumedRef.current = true;
    const pending = takeAdUnlockPending("translate");
    if (pending?.dreamId === dream.id) {
      void translateRef.current(pending?.targetLang as TranslationLanguage | undefined);
    }
  }, [languageReady, dream.id]);

  async function publishComment(text: string, forUid: string) {
    // the commenter's creature level — same anonymity as shared dreams:
    // never a name, only "Anonymous dreamer · <creature>"
    let badgeId = "dreamer";
    try {
      const agg = await getCountFromServer(
        query(collection(firestore, "shared_dreams"), where("ownerUid", "==", forUid))
      );
      badgeId = shareBadgeFor(agg.data().count).id;
    } catch {
      /* count is cosmetic — 🌙 Dreamer is a fine fallback */
    }

    const dreamRef = doc(firestore, "shared_dreams", dream.id);
    const commentRef = doc(collection(dreamRef, "comments"));
    await runTransaction(firestore, async (tx) => {
      const snap = await tx.get(dreamRef);
      if (!snap.exists()) throw new Error("Dream not found");
      tx.set(commentRef, {
        text,
        authorUid: forUid,
        badge: badgeId,
        createdAtMs: Date.now(),
        createdAt: serverTimestamp(),
      });
      tx.update(dreamRef, {
        commentCount: safeNum((snap.data() as any)?.commentCount) + 1,
        updatedAt: serverTimestamp(),
      });
    });
  }

  async function onPublishClick() {
    const text = draft.trim().slice(0, COMMENT_MAX);
    if (!text || publishBusy) return;
    setError(null);

    const u = auth.currentUser;
    if (!u) {
      // ✅ guests may type freely; the sign-in window opens at Publish and the
      // pending text is published right after sign-in
      pendingCommentRef.current = text;
      setNeedSignIn(true);
      try {
        await signInWithGoogle();
      } catch (e: any) {
        pendingCommentRef.current = null;
        if (e?.code !== "auth/popup-closed-by-user" && e?.code !== "auth/cancelled-popup-request") {
          setError(e?.message ?? "Sign-in failed.");
        }
      }
      return;
    }

    setPublishBusy(true);
    try {
      await publishComment(text, u.uid);
      setDraft("");
      setNeedSignIn(false);
    } catch (e: any) {
      setError(e?.message ?? t.dreamPage.commentFailed);
    } finally {
      setPublishBusy(false);
    }
  }

  // publish the guest's pending comment once they're signed in
  useEffect(() => {
    const text = pendingCommentRef.current;
    if (!uid || !text) return;
    pendingCommentRef.current = null;
    setPublishBusy(true);
    void publishComment(text, uid)
      .then(() => {
        setDraft("");
        setNeedSignIn(false);
      })
      .catch((e: any) => {
        pendingCommentRef.current = text;
        setError(e?.message ?? t.dreamPage.commentFailed);
      })
      .finally(() => setPublishBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  async function deleteComment(c: DreamComment) {
    if (!uid || c.authorUid !== uid) return;
    setError(null);
    try {
      const dreamRef = doc(firestore, "shared_dreams", dream.id);
      const commentRef = doc(dreamRef, "comments", c.id);
      await runTransaction(firestore, async (tx) => {
        const [dreamSnap, commentSnap] = await Promise.all([tx.get(dreamRef), tx.get(commentRef)]);
        if (!commentSnap.exists()) return;
        tx.delete(commentRef);
        if (dreamSnap.exists()) {
          tx.update(dreamRef, {
            commentCount: Math.max(0, safeNum((dreamSnap.data() as any)?.commentCount) - 1),
            updatedAt: serverTimestamp(),
          });
        }
      });
    } catch (e: any) {
      setError(e?.message ?? "Failed to delete.");
    }
  }

  const badge = shareBadgeById(dream.shareBadge) ?? (dream.fromGuest ? shareBadgeFor(1) : null);
  const aLabel = badge
    ? `${t.shareBadges.anonymous} · ${shareBadgeLabel(t, badge)}`
    : dream.authorInitials || "U";
  const aInit = badge ? badge.emoji : initialsFromEmailOrText(aLabel);

  const dateFmt = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    } catch {
      return null;
    }
  }, [locale]);

  const showTranslateButton = dream.text.trim() && dreamLang !== targetLang;
  const translateLabel = translateBusy
    ? t.profile.translating
    : showTranslation
      ? t.profile.showOriginal
      : formatMessage(t.profile.translateTo, { language: targetLang.toUpperCase() });

  return (
    <main className="relative min-h-screen px-6 pt-4 pb-10 max-w-3xl mx-auto">
      <div className="mb-3">
        <LocaleLink href="/app/shared" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition">
          ← {t.dreamPage.backToFeed}
        </LocaleLink>
      </div>

      {error && (
        <div className="mb-3 text-sm text-red-200 bg-red-600/15 border border-red-500/30 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <article className="p-5 rounded-2xl bg-[var(--card)] border border-white/10">
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="min-w-0 max-w-full flex items-center gap-3">
            <div
              className={[
                "shrink-0 rounded-full flex items-center justify-center",
                badge
                  ? "size-11 text-[26px] leading-none cursor-help bg-[color-mix(in_srgb,#a855f7_14%,var(--card))] ring-1 ring-purple-400/60"
                  : "w-7 h-7 border border-[var(--border)] text-[10px] text-[var(--muted)]",
              ].join(" ")}
              title={aLabel}
              aria-label={aLabel}
            >
              {aInit}
            </div>
            {badge && dream.emojis.length > 0 ? (
              <span aria-hidden className="h-6 w-px shrink-0 bg-[var(--border)]" />
            ) : null}
            {dream.emojis.length > 0 ? (
              <span className="inline-flex items-baseline gap-2 text-[18px] leading-none select-none">
                {dream.emojis.slice(0, 5).map((em, i) => (
                  <span key={`${em}:${i}`}>{em}</span>
                ))}
              </span>
            ) : null}
          </div>

          <div className="text-xs text-[var(--muted)] whitespace-nowrap inline-flex items-center gap-2">
            <span className="opacity-70 inline-flex items-center" aria-hidden>
              {dream.source === "voice" ? <Mic size={14} strokeWidth={1.8} /> : <Keyboard size={14} strokeWidth={1.8} />}
            </span>
            <span className="opacity-70">{`${dream.dateKey}${dream.timeKey ? ` ${dream.timeKey}` : ""}`}</span>
          </div>
        </div>

        <h1 className="mt-3 text-[var(--text)] whitespace-pre-wrap break-words text-base font-normal">
          {showTranslation && translation ? translation : dream.text}
        </h1>

        <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-2 items-center">
            {REACTIONS.map((x) => {
              const active = !!my[x.key];
              const isBusy = busyKey === x.key;
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
                  onClick={() => toggleReaction(x.key)}
                  disabled={isBusy}
                  className={cls}
                  title={uid ? x.label : `Sign in to ${x.label.toLowerCase()}`}
                >
                  <span>{x.emoji}</span>
                  <span className="tabular-nums">{safeNum(live.reactions[x.key])}</span>
                </button>
              );
            })}
            {/* 💬 comment count — next to the heart and the star, as on the feed */}
            <a
              href="#comments"
              className="react-btn px-3 py-1.5 rounded-full text-xs font-semibold transition border inline-flex items-center gap-2"
              title={t.dreamPage.commentsLabel}
              aria-label={t.dreamPage.commentsLabel}
            >
              <span>💬</span>
              <span className="tabular-nums">{safeNum(live.commentCount)}</span>
            </a>
          </div>

          {showTranslateButton ? (
            <button
              onClick={() => void translateDream()}
              disabled={translateBusy || !languageReady}
              aria-label={translateLabel}
              className={[
                "react-btn react-btn--translate w-8 h-8 rounded-full text-xs font-semibold transition border inline-flex items-center justify-center",
                showTranslation ? "react-btn--translate-on" : "",
                translateBusy ? "opacity-70 cursor-wait" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              title={translateLabel}
            >
              <TranslateIcon className={translateBusy ? "animate-pulse" : undefined} />
            </button>
          ) : null}
        </div>
      </article>

      <section id="comments" className="mt-8 scroll-mt-24">
        <h2 className="text-lg font-semibold text-[var(--text)]">
          {t.dreamPage.commentsTitle}{" "}
          <span className="text-[var(--muted)] font-normal tabular-nums">({safeNum(live.commentCount)})</span>
        </h2>

        <div className="mt-3 space-y-3">
          {comments.length === 0 ? (
            <div className="p-4 rounded-2xl bg-[var(--card)] text-[var(--muted)] border border-white/10 text-sm">
              {t.dreamPage.commentsEmpty}
            </div>
          ) : (
            comments.map((c) => {
              const cBadge = shareBadgeById(c.badge) ?? shareBadgeFor(0);
              const cLabel = `${t.shareBadges.anonymous} · ${shareBadgeLabel(t, cBadge)}`;
              return (
                <div key={c.id} className="p-4 rounded-2xl bg-[var(--card)] border border-white/10">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex items-center gap-2 text-xs text-[var(--muted)]">
                      <span
                        className="shrink-0 size-7 rounded-full flex items-center justify-center text-[16px] leading-none bg-[color-mix(in_srgb,#a855f7_14%,var(--card))] ring-1 ring-purple-400/40"
                        title={cLabel}
                        aria-label={cLabel}
                      >
                        {cBadge.emoji}
                      </span>
                      {/* the creature is already in the avatar — no "🧙 Wizard" words next to it */}
                      <span className="truncate">{t.shareBadges.anonymous}</span>
                      {c.createdAtMs && dateFmt ? (
                        <span className="opacity-70 whitespace-nowrap">· {dateFmt.format(new Date(c.createdAtMs))}</span>
                      ) : null}
                    </div>
                    {uid && c.authorUid === uid ? (
                      <button
                        onClick={() => void deleteComment(c)}
                        className="shrink-0 text-[var(--muted)] hover:text-red-300 transition"
                        title={t.dreamPage.deleteComment}
                        aria-label={t.dreamPage.deleteComment}
                      >
                        <Trash2 size={14} strokeWidth={1.8} />
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-2 text-sm text-[var(--text)] whitespace-pre-wrap break-words">{c.text}</div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-4 p-4 rounded-2xl bg-[var(--card)] border border-white/10">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={COMMENT_MAX}
            rows={3}
            placeholder={t.dreamPage.commentPlaceholder}
            className="w-full resize-y rounded-xl bg-transparent border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-purple-400/50"
          />
          <div className="mt-2 flex items-center justify-between gap-3 flex-wrap">
            <span className="text-xs text-[var(--muted)]">
              {needSignIn && !uid ? t.dreamPage.signInToPublish : ""}
            </span>
            <button
              onClick={() => void onPublishClick()}
              disabled={publishBusy || !draft.trim()}
              className="px-4 py-2 rounded-full text-sm font-semibold bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {publishBusy ? t.dreamPage.publishing : t.dreamPage.publish}
            </button>
          </div>
        </div>
      </section>

      {/* server-rendered links to other dreams — people browse on, crawlers
          walk the whole /dream/* graph from any one page */}
      {more.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-[var(--text)]">{t.dreamPage.moreDreams}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {more.map((m) => (
              <LocaleLink
                key={m.id}
                href={`/dream/${m.id}`}
                className="block p-4 rounded-2xl bg-[var(--card)] border border-white/10 hover:border-purple-400/40 transition-colors"
              >
                {m.emojis.length > 0 ? (
                  <span className="block text-[16px] leading-none select-none mb-2" aria-hidden>
                    {m.emojis.join(" ")}
                  </span>
                ) : null}
                <span className="block text-sm text-[var(--text)] break-words">{m.excerpt}</span>
              </LocaleLink>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
