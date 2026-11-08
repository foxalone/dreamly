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
import { signInWithOptions } from "@/lib/auth/signInWithOptions";
import { auth, firestore } from "@/lib/firebase";
import AnalysisExcerpt from "@/app/components/AnalysisExcerpt";
import { analysisPreview } from "@/lib/analysisPreview";
import { cleanAnalysis } from "@/lib/publicDreamAnalysis";
import { setAdUnlockPending, takeAdUnlockPending } from "@/lib/adUnlock";
import { openPaywall } from "@/lib/paywall";
import { useLocale, useMessages } from "@/lib/i18n/LocaleProvider";
import { formatMessage } from "@/lib/i18n/messages";
import LocaleLink from "@/lib/i18n/LocaleLink";
import { shareBadgeById, shareBadgeFor } from "@/lib/shareBadges";
import { shareBadgeLabel } from "@/lib/shareBadgeLabel";
import { trackTranslationClick } from "@/lib/trackTranslationClick";
import { useTranslationLanguage } from "@/lib/useTranslationLanguage";
import { type TranslationLanguage } from "@/lib/translationLanguage";
import { analysisTranslationTargetId } from "@/lib/analysisTranslation";
import { commentTranslationTargetId } from "@/lib/commentTranslation";
import { reactionLabel } from "@/lib/i18n/reaction-copy";
import { type ReactionState } from "@/lib/guestReactions";

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
  /** Public preview. The rest is loaded after the author opens it or a reader watches an ad. */
  analysisText: string;
  analysisHasMore: boolean;
};

export type MoreDream = {
  id: string;
  excerpt: string;
  emojis: string[];
  shareBadge: string | null;
  fromGuest: boolean;
};

type ReactionKey = "heart" | "like" | "star";
type MyReactions = Record<ReactionKey, boolean>;

type DreamComment = {
  id: string;
  text: string;
  authorUid: string;
  badge: string | null;
  createdAtMs: number;
  xpAwarded: number;
};

const REACTIONS: { key: ReactionKey; emoji: string }[] = [
  { key: "heart", emoji: "❤️" },
  { key: "like", emoji: "👍" },
  { key: "star", emoji: "⭐" },
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

// The feed uses the same per-viewer choice when switching a translation back
// to its original text. Keep that choice when opening the public dream page.
function originalChoiceKey(uid: string | null, lang: TranslationLanguage) {
  return `dreamly.showOriginal:${uid}:${lang}`;
}

function prefersOriginal(uid: string | null, lang: TranslationLanguage, dreamId: string) {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(originalChoiceKey(uid, lang)) ?? "[]");
    return Array.isArray(stored) && stored.includes(dreamId);
  } catch {
    return false;
  }
}

function rememberOriginal(uid: string | null, lang: TranslationLanguage, dreamId: string, original: boolean) {
  try {
    const key = originalChoiceKey(uid, lang);
    const stored: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    const ids = new Set<string>(Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string") : []);
    if (original) ids.add(dreamId);
    else ids.delete(dreamId);
    localStorage.setItem(key, JSON.stringify([...ids]));
  } catch {
    // Storage can be unavailable; the current page still responds to the click.
  }
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
  const [authReady, setAuthReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // live counters (reactions + commentCount); starts from the server snapshot
  const [live, setLive] = useState({ reactions: dream.reactions, commentCount: dream.commentCount });
  const [my, setMy] = useState<MyReactions>({ heart: false, like: false, star: false });
  const [busyKey, setBusyKey] = useState<string | null>(null);

  // translation
  const { targetLang, ready: languageReady } = useTranslationLanguage(uid);
  const [translation, setTranslation] = useState<{ dreamId: string; lang: TranslationLanguage; text: string } | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [translateBusy, setTranslateBusy] = useState(false);
  const currentTranslation = translation?.dreamId === dream.id && translation.lang === targetLang ? translation.text : null;
  const translated = showTranslation && !!currentTranslation;
  const translateRef = useRef<(lang?: TranslationLanguage) => Promise<void>>(async () => {});
  const pendingAfterSignInRef = useRef<"translate" | "analysis-translate" | "comment-translate" | "reading" | null>(null);
  const pendingCommentTranslationRef = useRef<{ commentId: string; lang: TranslationLanguage } | null>(null);

  // the reading prepared for this dream, then ordinary comments under it
  const [preview, setPreview] = useState(dream.analysisText);
  const [hasMore, setHasMore] = useState(dream.analysisHasMore);
  const [fullAnalysis, setFullAnalysis] = useState<string | null>(null);
  const [readingBusy, setReadingBusy] = useState(false);
  const [analysisTranslation, setAnalysisTranslation] = useState<{ dreamId: string; lang: TranslationLanguage; scope: "preview" | "full"; text: string } | null>(null);
  const [showAnalysisTranslation, setShowAnalysisTranslation] = useState(false);
  const [analysisTranslateBusy, setAnalysisTranslateBusy] = useState(false);
  const analysisManualChoice = useRef(false);
  const translateAnalysisRef = useRef<(lang?: TranslationLanguage, full?: boolean) => Promise<void>>(async () => {});
  useEffect(() => {
    setPreview(dream.analysisText);
    setHasMore(dream.analysisHasMore);
    setFullAnalysis(null);
    setAnalysisTranslation(null);
    setShowAnalysisTranslation(false);
    analysisManualChoice.current = false;
  }, [dream.id, dream.analysisText, dream.analysisHasMore]);
  const [comments, setComments] = useState<DreamComment[]>([]);
  const [commentTranslations, setCommentTranslations] = useState<Record<string, { lang: TranslationLanguage; text: string; visible: boolean }>>({});
  const [commentTranslateBusyId, setCommentTranslateBusyId] = useState<string | null>(null);
  const translateCommentRef = useRef<(commentId: string, lang?: TranslationLanguage) => Promise<void>>(async () => {});
  const [draft, setDraft] = useState("");
  const [publishBusy, setPublishBusy] = useState(false);
  const [needSignIn, setNeedSignIn] = useState(false);
  const [earnedXp, setEarnedXp] = useState<number | null>(null);
  const pendingCommentRef = useRef<string | null>(null);

  const dreamLang = useMemo(
    () => dream.lang ?? detectLangByScript(dream.text),
    [dream.lang, dream.text]
  );

  // The feed and this page share the same private unlock ledger. Read only a
  // translation the viewer already owns; opening a dream must not spend a new
  // daily translation or ad credit.
  useEffect(() => {
    if (!authReady || !languageReady || !dream.text.trim() || dreamLang === targetLang) return;
    let cancelled = false;
    void (async () => {
      try {
        const user = auth.currentUser;
        if (uid && (!user || user.uid !== uid)) return;
        const idToken = user ? await user.getIdToken() : undefined;
        const res = await fetch("/api/dreams/unlocked-translation", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sharedDreamId: dream.id, targetLang, ...(idToken ? { idToken } : {}) }),
        });
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        const text = typeof data.translation === "string" ? data.translation.trim() : "";
        if (cancelled || !text) return;
        setTranslation({ dreamId: dream.id, lang: targetLang, text });
        setShowTranslation(!prefersOriginal(uid, targetLang, dream.id));
      } catch {
        // A failed read leaves the original and the manual translate button.
      }
    })();
    return () => { cancelled = true; };
  }, [dream.id, dream.text, dreamLang, targetLang, uid, authReady, languageReady]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUid(u ? u.uid : null);
      setAuthReady(true);
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
        const nextAnalysis = typeof data?.analysisText === "string" ? data.analysisText.trim() : "";
        if (nextAnalysis) setPreview(nextAnalysis);
        if (typeof data?.analysisHasMore === "boolean") setHasMore(data.analysisHasMore);
      },
      (err) => console.warn("dream onSnapshot error:", err?.message ?? err)
    );
    return () => unsub();
  }, [dream.id]);

  // my reactions
  useEffect(() => {
    if (!uid) {
      setMy({ heart: false, like: false, star: false });
      if (!authReady) return;
      let cancelled = false;
      const params = new URLSearchParams({ id: dream.id });
      void fetch(`/api/dreams/reactions?${params}`, { credentials: "same-origin" })
        .then(async (res) => {
          if (!res.ok) throw new Error("Failed to load reactions.");
          return res.json();
        })
        .then((data: { reactions?: Record<string, ReactionState> }) => {
          if (!cancelled) setMy(data.reactions?.[dream.id] ?? { heart: false, like: false, star: false });
        })
        .catch((error) => console.warn("Guest reactions load failed", error));
      return () => { cancelled = true; };
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
  }, [uid, authReady, dream.id]);

  // comments, oldest first (a conversation under the dream)
  useEffect(() => {
    setCommentTranslations({});
    const q = query(
      collection(firestore, "shared_dreams", dream.id, "comments"),
      orderBy("createdAtMs", "asc"),
      limit(200)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setComments(
          snap.docs.filter((d) => d.data().deleted !== true).map((d) => {
            const data = d.data() as any;
            return {
              id: d.id,
              text: String(data?.text ?? ""),
              authorUid: String(data?.authorUid ?? ""),
              badge: data?.badge ? String(data.badge) : null,
              createdAtMs: safeNum(data?.createdAtMs),
              xpAwarded: safeNum(data?.xpAwarded),
            };
          })
        );
      },
      (err) => console.warn("comments onSnapshot error:", err?.message ?? err)
    );
    return () => unsub();
  }, [dream.id]);

  async function toggleReaction(key: ReactionKey) {
    if (!authReady) return;
    if (busyKey) return;
    setError(null);
    setBusyKey(key);
    setMy((prev) => ({ ...prev, [key]: !prev[key] }));
    try {
      if (!uid) {
        const res = await fetch("/api/dreams/reactions", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dreamId: dream.id, key }),
        });
        if (!res.ok) throw new Error("Failed to react.");
        const data = await res.json() as { active: boolean };
        setMy((prev) => ({ ...prev, [key]: data.active }));
        return;
      }
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

    if (translated) {
      rememberOriginal(uid, targetLang, dream.id, true);
      setShowTranslation(false);
      return;
    }
    const lang = selectedLang ?? targetLang;
    if (dreamLang === lang) return;
    if (translation?.dreamId === dream.id && translation.lang === lang) {
      rememberOriginal(uid, lang, dream.id, false);
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
                pendingAfterSignInRef.current = "translate";
                signInWithOptions().catch((e) => {
                  pendingAfterSignInRef.current = null;
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
      setTranslation({ dreamId: dream.id, lang, text: next });
      rememberOriginal(uid, lang, dream.id, false);
      setShowTranslation(true);
    } catch (e: any) {
      setError(e?.message ?? "Failed to translate.");
    } finally {
      setTranslateBusy(false);
    }
  }
  translateRef.current = translateDream;

  async function translateAnalysis(selectedLang?: TranslationLanguage, requestFull = !!fullAnalysis) {
    if (analysisTranslateBusy || !languageReady) return;
    const lang = selectedLang ?? targetLang;
    const scope = requestFull ? "full" : "preview";
    if (showAnalysisTranslation && analysisTranslation?.dreamId === dream.id && analysisTranslation.lang === lang && analysisTranslation.scope === scope) {
      analysisManualChoice.current = true;
      setShowAnalysisTranslation(false);
      return;
    }
    if (analysisTranslation?.dreamId === dream.id && analysisTranslation.lang === lang && analysisTranslation.scope === scope) {
      analysisManualChoice.current = true;
      setShowAnalysisTranslation(true);
      return;
    }

    setError(null);
    setAnalysisTranslateBusy(true);
    try {
      const user = auth.currentUser;
      const idToken = user ? await user.getIdToken() : undefined;
      const res = await fetch("/api/dreams/translate-analysis", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sharedDreamId: dream.id, targetLang: lang, full: requestFull, ...(idToken ? { idToken } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const targetId = analysisTranslationTargetId(dream.id);
        if (data?.code === "GUEST_AD_REQUIRED" || (!user && res.status === 402)) {
          setAdUnlockPending({ kind: "translate", dreamId: targetId, targetLang: lang, analysisFull: requestFull });
          openPaywall({
            kind: "translate",
            translation: { sharedDreamId: targetId, targetLang: lang },
            source: "dream_analysis_translate_guest",
            guest: {
              reason: "translate",
              signIn: () => {
                pendingAfterSignInRef.current = "analysis-translate";
                signInWithOptions().catch((error) => {
                  pendingAfterSignInRef.current = null;
                  if (error?.code !== "auth/popup-closed-by-user" && error?.code !== "auth/cancelled-popup-request") {
                    setError(error?.message ?? "Sign-in failed.");
                  }
                });
              },
            },
            retry: () => void translateAnalysisRef.current(lang, requestFull),
          });
          return;
        }
        if (data?.code === "SUBSCRIPTION_REQUIRED" || data?.code === "INSUFFICIENT_CREDITS" || res.status === 402) {
          setAdUnlockPending({ kind: "translate", dreamId: targetId, targetLang: lang, analysisFull: requestFull });
          openPaywall({
            kind: "translate",
            translation: { sharedDreamId: targetId, targetLang: lang },
            source: "dream_analysis_translate",
            retry: () => void translateAnalysisRef.current(lang, requestFull),
          });
          return;
        }
        throw new Error(t.dreamPage.analysisTranslationFailed);
      }
      const next = typeof data.translation === "string" ? data.translation.trim() : "";
      if (!next) throw new Error(t.dreamPage.analysisTranslationFailed);
      setAnalysisTranslation({ dreamId: dream.id, lang, scope, text: next });
      analysisManualChoice.current = true;
      setShowAnalysisTranslation(true);
    } catch (error: unknown) {
      setError(t.dreamPage.analysisTranslationFailed);
    } finally {
      setAnalysisTranslateBusy(false);
    }
  }
  translateAnalysisRef.current = translateAnalysis;

  async function translateComment(commentId: string, selectedLang?: TranslationLanguage) {
    if (commentTranslateBusyId || !languageReady) return;
    const lang = selectedLang ?? targetLang;
    const previous = commentTranslations[commentId];
    if (previous?.lang === lang) {
      setCommentTranslations((current) => ({ ...current, [commentId]: { ...previous, visible: !previous.visible } }));
      return;
    }
    setError(null);
    setCommentTranslateBusyId(commentId);
    try {
      const user = auth.currentUser;
      const idToken = user ? await user.getIdToken() : undefined;
      const res = await fetch("/api/dreams/translate-comment", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dreamId: dream.id, commentId, targetLang: lang, ...(idToken ? { idToken } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 402) {
          const targetId = commentTranslationTargetId(dream.id, commentId);
          setAdUnlockPending({ kind: "translate", dreamId: targetId, commentId, targetLang: lang });
          openPaywall({
            kind: "translate",
            translation: { sharedDreamId: targetId, targetLang: lang },
            source: user ? "dream_comment_translate" : "dream_comment_translate_guest",
            ...(!user ? { guest: {
              reason: "translate" as const,
              signIn: () => {
                pendingCommentTranslationRef.current = { commentId, lang };
                pendingAfterSignInRef.current = "comment-translate";
                signInWithOptions().catch((error) => {
                  pendingAfterSignInRef.current = null;
                  pendingCommentTranslationRef.current = null;
                  if (error?.code !== "auth/popup-closed-by-user" && error?.code !== "auth/cancelled-popup-request") {
                    setError(error?.message ?? t.dreamPage.commentTranslationFailed);
                  }
                });
              },
            } } : {}),
            retry: () => void translateCommentRef.current(commentId, lang),
          });
          return;
        }
        throw new Error(t.dreamPage.commentTranslationFailed);
      }
      const next = typeof data.translation === "string" ? data.translation.trim() : "";
      if (!next) throw new Error(t.dreamPage.commentTranslationFailed);
      setCommentTranslations((current) => ({ ...current, [commentId]: { lang, text: next, visible: true } }));
    } catch {
      setError(t.dreamPage.commentTranslationFailed);
    } finally {
      setCommentTranslateBusyId(null);
    }
  }
  translateCommentRef.current = translateComment;

  // a guest signed in from the paywall's sign-in option — run the translation
  useEffect(() => {
    const pending = pendingAfterSignInRef.current;
    if (!uid || !languageReady || !pending) return;
    pendingAfterSignInRef.current = null;
    if (pending === "reading") void openAnalysisRef.current();
    else if (pending === "analysis-translate") void translateAnalysisRef.current();
    else if (pending === "comment-translate" && pendingCommentTranslationRef.current) {
      const { commentId, lang } = pendingCommentTranslationRef.current;
      pendingCommentTranslationRef.current = null;
      void translateCommentRef.current(commentId, lang);
    }
    else void translateRef.current();
  }, [uid, languageReady]);

  const openAnalysisRef = useRef<() => Promise<void>>(async () => {});
  async function openAnalysis() {
    if (readingBusy || fullAnalysis) return;
    setReadingBusy(true);
    setError(null);
    try {
      const u = auth.currentUser;
      const idToken = u ? await u.getIdToken() : undefined;
      const res = await fetch("/api/dreams/read-analysis", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sharedDreamId: dream.id, ...(idToken ? { idToken } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data?.analysis === "string" && data.analysis.trim()) {
        setFullAnalysis(data.analysis.trim());
        if (showAnalysisTranslation && analysisTranslation?.scope === "preview") {
          void translateAnalysisRef.current(undefined, true);
        }
        return;
      }
      const guest = data?.code === "GUEST_AD_REQUIRED" || (!u && res.status === 402);
      if (guest || data?.code === "AD_REQUIRED" || res.status === 402) {
        setAdUnlockPending({ kind: "reading", dreamId: dream.id });
        openPaywall({
          kind: "reading",
          reading: { sharedDreamId: dream.id },
          source: guest ? "dream_page_reading_guest" : "dream_page_reading",
          ...(guest
            ? {
                guest: {
                  reason: "reading" as const,
                  signIn: () => {
                    pendingAfterSignInRef.current = "reading";
                    signInWithOptions().catch((e) => {
                      pendingAfterSignInRef.current = null;
                      if (e?.code !== "auth/popup-closed-by-user" && e?.code !== "auth/cancelled-popup-request") {
                        setError(e?.message ?? "Sign-in failed.");
                      }
                    });
                  },
                },
              }
            : {}),
          retry: () => void openAnalysisRef.current(),
        });
        return;
      }
      throw new Error(data?.error ?? "Couldn't open the analysis.");
    } catch (e: any) {
      setError(e?.message ?? "Couldn't open the analysis.");
    } finally {
      setReadingBusy(false);
    }
  }
  openAnalysisRef.current = openAnalysis;

  // back from the Offerwall (/ad/unlock): resume the paid-for translation or reading
  const resumedRef = useRef(false);
  useEffect(() => {
    if (resumedRef.current || !authReady || !languageReady) return;
    resumedRef.current = true;
    const pending = takeAdUnlockPending("translate");
    if (pending?.commentId && pending.dreamId === commentTranslationTargetId(dream.id, pending.commentId)) {
      void translateCommentRef.current(pending.commentId, pending.targetLang as TranslationLanguage | undefined);
      return;
    }
    if (pending?.dreamId === analysisTranslationTargetId(dream.id)) {
      void (async () => {
        if (pending.analysisFull) await openAnalysisRef.current();
        await translateAnalysisRef.current(pending.targetLang as TranslationLanguage | undefined, pending.analysisFull === true);
        window.requestAnimationFrame(() => document.getElementById("analysis")?.scrollIntoView({ behavior: "auto", block: "start" }));
      })();
      return;
    }
    if (pending?.dreamId === dream.id) {
      void translateRef.current(pending?.targetLang as TranslationLanguage | undefined);
      return;
    }
    const reading = takeAdUnlockPending("reading");
    if (reading?.dreamId === dream.id) void openAnalysisRef.current();
  }, [authReady, languageReady, dream.id]);

  async function publishComment(text: string, forUid: string): Promise<{ xp: number; alreadyPublished: boolean }> {
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

    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) throw new Error("Sign in required.");
    const response = await fetch("/api/dreams/comment", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dreamId: dream.id, text, badge: badgeId, idToken }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.code === "COMMENT_ALREADY_PUBLISHED" ? t.dreamPage.commentAlready : t.dreamPage.commentFailed);
    return { xp: safeNum(result.xp), alreadyPublished: result.alreadyPublished === true };
  }

  async function onPublishClick() {
    const text = draft.trim().slice(0, COMMENT_MAX);
    if (!text || publishBusy) return;
    setError(null);
    setEarnedXp(null);

    const u = auth.currentUser;
    if (!u) {
      // ✅ guests may type freely; the sign-in window opens at Publish and the
      // pending text is published right after sign-in
      pendingCommentRef.current = text;
      setNeedSignIn(true);
      try {
        await signInWithOptions();
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
      const award = await publishComment(text, u.uid);
      setDraft("");
      setNeedSignIn(false);
      if (!award.alreadyPublished && award.xp > 0) setEarnedXp(award.xp);
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
      .then((award) => {
        setDraft("");
        setNeedSignIn(false);
        if (!award.alreadyPublished && award.xp > 0) setEarnedXp(award.xp);
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

  const excerpt = analysisPreview(preview);
  const shownAnalysis = cleanAnalysis(fullAnalysis ?? excerpt.preview);
  const collapsed = !fullAnalysis && (hasMore || excerpt.hasMore);
  const analysisScope = fullAnalysis ? "full" : "preview";
  const currentAnalysisTranslation = analysisTranslation?.dreamId === dream.id && analysisTranslation.lang === targetLang && analysisTranslation.scope === analysisScope
    ? analysisTranslation.text : null;
  const translatedAnalysis = showAnalysisTranslation && !!currentAnalysisTranslation;
  const analysisTranslateLabel = analysisTranslateBusy
    ? t.profile.translating
    : translatedAnalysis ? t.profile.showOriginal : formatMessage(t.profile.translateTo, { language: targetLang.toUpperCase() });

  useEffect(() => {
    if (!authReady || !languageReady || !shownAnalysis || dreamLang === targetLang) return;
    let cancelled = false;
    void (async () => {
      try {
        const user = auth.currentUser;
        if (uid && (!user || user.uid !== uid)) return;
        const idToken = user ? await user.getIdToken() : undefined;
        const res = await fetch("/api/dreams/translate-analysis", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sharedDreamId: dream.id, targetLang, full: !!fullAnalysis, existingOnly: true, ...(idToken ? { idToken } : {}) }),
        });
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        const text = typeof data.translation === "string" ? data.translation.trim() : "";
        if (cancelled || !text) return;
        setAnalysisTranslation({ dreamId: dream.id, lang: targetLang, scope: analysisScope, text });
        if (!analysisManualChoice.current) setShowAnalysisTranslation(true);
      } catch {
        // The original analysis and manual translate button remain available.
      }
    })();
    return () => { cancelled = true; };
  }, [authReady, languageReady, shownAnalysis, dreamLang, targetLang, uid, dream.id, fullAnalysis, analysisScope]);

  const showTranslateButton = dream.text.trim() && dreamLang !== targetLang;
  const translateLabel = translateBusy
    ? t.profile.translating
    : translated
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

        <h1 dir="auto" className="mt-3 text-[var(--text)] whitespace-pre-wrap break-words text-base font-normal">
          {translated ? currentTranslation : dream.text}
        </h1>

        <div className="mt-4 w-full min-w-0 overflow-x-auto overscroll-x-contain">
          <div className="flex w-max min-w-full flex-nowrap items-center gap-2">
            {REACTIONS.map((x) => {
              const active = !!my[x.key];
              const isBusy = busyKey === x.key;
              const cls = [
                "react-btn shrink-0 whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition border inline-flex items-center gap-2",
                active ? `react-btn--${x.key}` : "",
                isBusy ? "opacity-70 cursor-wait" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <button
                  key={x.key}
                  onClick={() => toggleReaction(x.key)}
                  disabled={!authReady || isBusy}
                  className={cls}
                  title={reactionLabel(locale, x.key)}
                  aria-label={reactionLabel(locale, x.key)}
                  aria-pressed={active}
                >
                  <span>{x.emoji}</span>
                  <span className="tabular-nums">{safeNum(live.reactions[x.key])}</span>
                </button>
              );
            })}
            {/* 💬 comment count — next to the heart and the star, as on the feed */}
            <a
              href="#comments"
              className="react-btn shrink-0 whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition border inline-flex items-center gap-2"
              title={t.dreamPage.commentsLabel}
              aria-label={t.dreamPage.commentsLabel}
            >
              <span>💬</span>
              <span className="tabular-nums">{safeNum(live.commentCount) + (shownAnalysis ? 1 : 0)}</span>
            </a>
            {showTranslateButton ? (
              <button
                onClick={() => { void trackTranslationClick("dream"); void translateDream(); }}
                disabled={translateBusy || !languageReady}
                aria-label={translateLabel}
                className={[
                  "react-btn react-btn--translate ms-auto w-8 h-8 shrink-0 rounded-full text-xs font-semibold transition border inline-flex items-center justify-center",
                  translated ? "react-btn--translate-on" : "",
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
        </div>
      </article>

      <section id="comments" className="mt-8 scroll-mt-24">
        <h2 className="text-lg font-semibold text-[var(--text)]">
          {t.dreamPage.commentsTitle}{" "}
          <span className="text-[var(--muted)] font-normal tabular-nums">({safeNum(live.commentCount) + (shownAnalysis ? 1 : 0)})</span>
        </h2>

        <div className="mt-3 space-y-3">
          {shownAnalysis ? (
            <article id="analysis" className="scroll-mt-24 p-4 rounded-2xl bg-[var(--card)] border border-purple-400/40">
              {collapsed ? (
                <div className="flex items-start gap-3">
                  <AnalysisExcerpt
                    className="mt-0 min-w-0 flex-1"
                    text={translatedAnalysis ? currentAnalysisTranslation! : shownAnalysis}
                    label={t.app.analysis}
                    more={t.dreamPage.more}
                    moreTitle={t.dreamPage.analysisMore}
                    onMore={() => void openAnalysis()}
                    busy={readingBusy}
                  />
                  {dreamLang !== targetLang ? (
                    <button type="button" onClick={() => { void trackTranslationClick("dream"); void translateAnalysis(); }} disabled={analysisTranslateBusy || !languageReady}
                      aria-label={analysisTranslateLabel} title={analysisTranslateLabel}
                      className={`react-btn react-btn--translate w-8 h-8 shrink-0 rounded-full border inline-flex items-center justify-center ${translatedAnalysis ? "react-btn--translate-on" : ""}`}>
                      <TranslateIcon className={analysisTranslateBusy ? "animate-pulse" : undefined} />
                    </button>
                  ) : null}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center rounded-full border border-purple-400/50 bg-purple-500/15 px-2.5 py-0.5 text-xs font-semibold text-purple-500">
                      {t.app.analysis}
                    </span>
                    {dreamLang !== targetLang ? (
                      <button type="button" onClick={() => { void trackTranslationClick("dream"); void translateAnalysis(); }} disabled={analysisTranslateBusy || !languageReady}
                        aria-label={analysisTranslateLabel} title={analysisTranslateLabel}
                        className={`react-btn react-btn--translate w-8 h-8 shrink-0 rounded-full border inline-flex items-center justify-center ${translatedAnalysis ? "react-btn--translate-on" : ""}`}>
                        <TranslateIcon className={analysisTranslateBusy ? "animate-pulse" : undefined} />
                      </button>
                    ) : null}
                  </div>
                  <div dir="auto" className="mt-2 text-sm leading-7 text-[var(--text)] whitespace-pre-wrap break-words">{translatedAnalysis ? currentAnalysisTranslation : shownAnalysis}</div>
                </>
              )}
            </article>
          ) : null}
          {comments.length === 0 && !shownAnalysis ? (
            <div className="p-4 rounded-2xl bg-[var(--card)] text-[var(--muted)] border border-white/10 text-sm">
              {t.dreamPage.commentsEmpty}
            </div>
          ) : (
            comments.map((c) => {
              const cBadge = shareBadgeById(c.badge) ?? shareBadgeFor(0);
              const cLabel = `${t.shareBadges.anonymous} · ${shareBadgeLabel(t, cBadge)}`;
              const cTranslation = commentTranslations[c.id];
              const cTranslated = cTranslation?.lang === targetLang && cTranslation.visible;
              const cBusy = commentTranslateBusyId === c.id;
              const cTranslateLabel = cTranslated
                ? t.profile.showOriginal
                : formatMessage(t.profile.translateTo, { language: targetLang.toUpperCase() });
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
                    <div className="flex items-center gap-2 shrink-0">
                      <button type="button" onClick={() => { void trackTranslationClick("dream"); void translateComment(c.id); }} disabled={cBusy || !languageReady}
                        aria-label={cTranslateLabel} title={cTranslateLabel}
                        className={`react-btn react-btn--translate w-8 h-8 rounded-full border inline-flex items-center justify-center ${cTranslated ? "react-btn--translate-on" : ""}`}>
                        <TranslateIcon className={cBusy ? "animate-pulse" : undefined} />
                      </button>
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
                  </div>
                  <div dir="auto" className="mt-2 text-sm text-[var(--text)] whitespace-pre-wrap break-words">{cTranslated ? cTranslation.text : c.text}</div>
                  {uid === c.authorUid && c.xpAwarded > 0 ? <div className="mt-2 text-xs font-semibold text-purple-500">+{c.xpAwarded} XP</div> : null}
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
          {earnedXp !== null ? <p role="status" className="mt-2 text-sm font-semibold text-purple-500">{formatMessage(t.dreamPage.commentXpEarned, { n: earnedXp })}</p> : null}
        </div>
      </section>

      {/* server-rendered links to other dreams — people browse on, crawlers
          walk the whole /dream/* graph from any one page */}
      {more.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-[var(--text)]">{t.dreamPage.moreDreams}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {more.map((m) => {
              const authorBadge = shareBadgeById(m.shareBadge) ?? shareBadgeFor(m.fromGuest ? 1 : 0);
              return (
                <LocaleLink
                  key={m.id}
                  href={`/dream/${m.id}`}
                  className="block p-4 rounded-2xl bg-[var(--card)] border border-white/10 hover:border-purple-400/40 transition-colors"
                >
                  <span className="mb-2 flex items-center gap-1 text-[16px] leading-none select-none">
                    <span
                      className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-purple-500/15 ring-1 ring-purple-400/60"
                      title={shareBadgeLabel(t, authorBadge)}
                      aria-label={shareBadgeLabel(t, authorBadge)}
                    >
                      {authorBadge.emoji}
                    </span>
                    {m.emojis.map((emoji, index) => <span key={`${emoji}:${index}`} aria-hidden>{emoji}</span>)}
                  </span>
                  <span className="block text-sm text-[var(--text)] break-words">{m.excerpt}</span>
                </LocaleLink>
              );
            })}
          </div>
        </section>
      ) : null}
    </main>
  );
}
