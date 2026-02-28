"use client";

import BottomNav from "../BottomNav";
import { useEffect, useMemo, useRef, useState } from "react";

import { pickDreamIconsEn, DREAM_ICONS_EN } from "@/lib/dream-icons/dreamIcons.en";
import { ingestDreamForMap } from "@/lib/map/ingestDreamForMap";
import { ensureSignedIn } from "@/lib/auth/ensureUser";

import { getDatabase, ref as rtdbRef, onValue, off } from "firebase/database";

import { auth, firestore } from "@/lib/firebase";
import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";

import { onAuthStateChanged } from "firebase/auth";

import data from "@emoji-mart/data";
import { init, SearchIndex } from "emoji-mart";

// ------------------------
// types
// ------------------------
type DreamIconKey = keyof typeof DREAM_ICONS_EN;

type DreamEmoji = {
  native: string;
  name?: string;
  id?: string;
};

type Dream = {
  id: string;
  text?: string;
  title?: string;
  createdAtMs?: number;
  dateKey?: string;
  timeKey?: string;
  wordCount?: number;
  charCount?: number;
  source?: "manual" | "voice";
  shared?: boolean;
  sharedAtMs?: number;
  emojis?: DreamEmoji[];
  deleted?: boolean;
  deletedAtMs?: number;

  rootsEn?: string[];
  roots?: string[];
  rootsTop?: { w: string; c: number }[];
  rootsLang?: string;
  rootsUpdatedAt?: any;

  analysisText?: string;
  analysisAtMs?: number;
  analysisModel?: string;

  iconsEn?: DreamIconKey[];
};

type Tab = "ALL" | "SHARED";
type RecStatus = "idle" | "listening" | "paused" | "error";

// ------------------------
// utils (твои же)
// ------------------------
function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function toDateKeyLocal(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function toTimeKeyLocal(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function countWords(text: string) {
  const t = (text ?? "").trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}
function norm(s: any) {
  return String(s ?? "").toLowerCase().trim();
}
function toNative(r: any) {
  return r?.skins?.[0]?.native || r?.native || "";
}
function makeTitle(text: string) {
  const t = (text ?? "").trim().replace(/\s+/g, " ");
  if (!t) return "";
  return t.length <= 60 ? t : t.slice(0, 60) + "…";
}
function guessLang(text: string): "ru" | "en" | "he" | "unknown" {
  const t = text ?? "";
  const hasHe = /[\u0590-\u05FF]/.test(t);
  const hasCy = /[\u0400-\u04FF]/.test(t);
  const hasLat = /[A-Za-z]/.test(t);
  if (hasHe && !hasCy && !hasLat) return "he";
  if (hasCy && !hasHe) return "ru";
  if (hasLat && !hasHe && !hasCy) return "en";
  return "unknown";
}
function detectRecLangFromText(t: string): "ru-RU" | "en-US" | "he-IL" | null {
  const s = t ?? "";
  const hasHe = /[\u0590-\u05FF]/.test(s);
  const hasCy = /[\u0400-\u04FF]/.test(s);
  const hasLat = /[A-Za-z]/.test(s);

  if (hasHe && !hasCy && !hasLat) return "he-IL";
  if (hasCy && !hasHe) return "ru-RU";
  if (hasLat && !hasHe && !hasCy) return "en-US";
  return null;
}

function textForIconPicker(text: string, lang?: string) {
  const t = (text ?? "").toLowerCase();

  if (lang === "ru") {
    return t
      .replaceAll("лес", "forest")
      .replaceAll("дерев", "tree")
      .replaceAll("колокол", "bell")
      .replaceAll("ветер", "wind")
      .replaceAll("музык", "music")
      .replaceAll("мелоди", "music")
      .replaceAll("свет", "sun")
      .replaceAll("солнц", "sun")
      .replaceAll("тишин", "silence")
      .replaceAll("звук", "sound");
  }

  return t;
}

// ------------------------
// icon normalization (plural handling)
// ------------------------
const IRREGULAR_SINGULAR: Record<string, string> = {
  mice: "mouse",
  geese: "goose",
  teeth: "tooth",
  feet: "foot",
  children: "child",
  people: "person",
  men: "man",
  women: "woman",
};

function singularizeEnWord(w: string) {
  const s = (w ?? "").toLowerCase();
  if (!s) return s;

  if (IRREGULAR_SINGULAR[s]) return IRREGULAR_SINGULAR[s];
  if (s.length <= 3) return s;

  if (
    s.endsWith("ches") ||
    s.endsWith("shes") ||
    s.endsWith("xes") ||
    s.endsWith("ses") ||
    s.endsWith("zes")
  )
    return s.slice(0, -2);

  if (s.endsWith("ies") && s.length > 4) return s.slice(0, -3) + "y";
  if (s.endsWith("ves") && s.length > 4) return s.slice(0, -3) + "f";
  if (s.endsWith("s") && !s.endsWith("ss")) return s.slice(0, -1);

  return s;
}

function normalizeForIconsEn(input: string) {
  return (input ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(singularizeEnWord)
    .join(" ");
}

// ------------------------
// Emoji overrides (RTDB)
// ------------------------
type EmojiOverride = { name?: string; keywords?: string[] };
type OverridesMap = Record<string, EmojiOverride>;
let EMOJI_OVERRIDES: OverridesMap = {};

function effectiveName(id?: string, libName?: string) {
  const key = String(id ?? "").trim();
  if (!key) return libName || "";
  return EMOJI_OVERRIDES?.[key]?.name || libName || "";
}
function effectiveKeywords(id?: string, libKeywords?: string[]) {
  const base = Array.isArray(libKeywords) ? libKeywords : [];
  const key = String(id ?? "").trim();
  if (!key) return base;
  const ov = EMOJI_OVERRIDES?.[key];
  if (ov?.keywords?.length) return ov.keywords;
  return base;
}

// ------------------------
// emoji scoring (NO ID SEARCH)
// ------------------------
function hasWord(hay: string, word: string) {
  const h = String(hay ?? "").toLowerCase();
  const w = String(word ?? "").toLowerCase();
  if (!w) return false;
  return new RegExp(`(^|[\\s_-])${w}($|[\\s_-])`, "i").test(h);
}

function looksLikeBadPhraseEmoji(_id: string, name: string) {
  const s = String(name ?? "").toLowerCase();
  if (/\bon ground\b/.test(s)) return true;
  if (s.includes("umbrella on ground")) return true;
  return false;
}

function isGarbageEmoji(r: any) {
  const id = norm(r?.id);
  const name = norm(r?.name);

  if (id.startsWith("flag-") || name.includes("flag")) return true;
  if (id.includes("skin-tone")) return true;
  if (id.startsWith("keycap_") || name.includes("keycap")) return true;
  if (name.includes("regional indicator")) return true;

  if (looksLikeBadPhraseEmoji(id, name)) return true;

  return false;
}

function scoreCandidateForToken(token: string, r: any, allTokens: string[]) {
  const t = norm(token);
  if (!t) return 0;

  const nameEff = effectiveName(r?.id, r?.name);
  const kwsEff = effectiveKeywords(r?.id, Array.isArray(r?.keywords) ? r.keywords : []);
  const name = norm(nameEff);
  const kws: string[] = Array.isArray(kwsEff) ? kwsEff.map(norm) : [];

  if (looksLikeBadPhraseEmoji(r?.id ?? "", name)) return -100;

  const hay = `${name} ${kws.join(" ")}`.trim();

  let s = 0;
  if (name === t) s = Math.max(s, 170);
  if (kws.includes(t)) s = Math.max(s, 150);

  if (hasWord(hay, t)) s = Math.max(s, 120);
  if (hay.includes(t)) s = Math.max(s, 55);

  let hits = 0;
  for (const tok of allTokens) {
    const tt = norm(tok);
    if (!tt) continue;
    if (hasWord(hay, tt)) hits++;
  }
  if (hits >= 2) s += 25 + hits * 6;

  if (t === "thing" || t === "stuff" || t === "object") s -= 40;

  return s;
}

function desiredCountsFromText(text: string) {
  const wc = countWords(text);
  const cc = (text ?? "").trim().length;

  if (wc <= 12 || cc <= 80) return { roots: 2, emojis: 1, icons: 1 };
  if (wc <= 25 || cc <= 160) return { roots: 3, emojis: 2, icons: 2 };
  if (wc <= 55 || cc <= 320) return { roots: 5, emojis: 4, icons: 3 };
  return { roots: 6, emojis: 5, icons: 4 };
}

const STOP = new Set([
  "i",
  "me",
  "my",
  "we",
  "you",
  "he",
  "she",
  "it",
  "they",
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "was",
  "were",
  "am",
  "is",
  "are",
  "be",
  "been",
  "to",
  "of",
  "in",
  "on",
  "at",
  "for",
  "with",
  "from",
  "into",
  "over",
  "under",
  "that",
  "this",
  "there",
  "here",
  "then",
  "dream",
  "dreamed",
  "dreaming",
]);

function tokenizeEn(s: string) {
  return (s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => w.length >= 3 && !STOP.has(w))
    .slice(0, 20);
}

type EmojiCandidate = {
  native: string;
  id?: string;
  name?: string;
  keywords?: string[];
  score: number;
};

let EMOJI_READY: Promise<void> | null = null;
function ensureEmojiIndex() {
  if (!EMOJI_READY) EMOJI_READY = init({ data });
  return EMOJI_READY;
}

function uniqByNativeKeepBest(cands: EmojiCandidate[]) {
  const best = new Map<string, EmojiCandidate>();
  for (const c of cands) {
    const prev = best.get(c.native);
    if (!prev || c.score > prev.score) best.set(c.native, c);
  }
  return Array.from(best.values()).sort((a, b) => b.score - a.score);
}

async function pickEmojiForOneRoot_AI(root: string, lang?: string): Promise<DreamEmoji | null> {
  await ensureEmojiIndex();

  const q = (root ?? "").trim();
  if (!q) return null;

  const tokens = lang === "en" ? tokenizeEn(q) : q.split(/\s+/).filter(Boolean).slice(0, 6);
  if (tokens.length === 0) return null;

  const localHits: EmojiCandidate[] = [];

  for (const t of tokens) {
    // @ts-ignore
    const res: any[] = await (SearchIndex as any).search(t);

    for (const r of (res ?? []).slice(0, 80)) {
      if (!r) continue;
      if (isGarbageEmoji(r)) continue;

      const native = toNative(r);
      if (!native) continue;

      const sc = scoreCandidateForToken(t, r, tokens);
      if (sc <= 0) continue;

      const id = r?.id;
      const nameEff = effectiveName(id, r?.name);
      const kwsEff = effectiveKeywords(id, Array.isArray(r?.keywords) ? r.keywords : []);

      localHits.push({
        native,
        id,
        name: nameEff,
        keywords: Array.isArray(kwsEff) ? kwsEff.slice(0, 24) : [],
        score: sc,
      });
    }
  }

  const uniq = uniqByNativeKeepBest(localHits);
  const candidates = uniq.slice(0, 20);
  if (candidates.length === 0) return null;

  try {
    const resp = await fetch("/api/dreams/emoji-pick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        root: q,
        lang: lang ?? "unknown",
        candidates: candidates.map((c) => ({
          native: c.native,
          id: c.id,
          name: c.name,
          keywords: c.keywords ?? [],
        })),
      }),
    });

    const out = await resp.json();
    if (resp.ok) {
      const picked = candidates.find((c) => c.native === out?.native);
      if (picked) return { native: picked.native, id: picked.id, name: picked.name };
    }
  } catch {}

  const top = candidates[0];
  return top ? { native: top.native, id: top.id, name: top.name } : null;
}

// ------------------------
// Page
// ------------------------
export default function DreamsPage() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dreams, setDreams] = useState<Dream[]>([]);
  const [uid, setUid] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>("ALL");

  const [sharingId, setSharingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [rootsBusyId, setRootsBusyId] = useState<string | null>(null);

  const [publicReactions, setPublicReactions] = useState<
    Record<string, { heart: number; like: number; star: number }>
  >({});

  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const [recSupported, setRecSupported] = useState(false);
  const [recStatus, setRecStatus] = useState<RecStatus>("idle");
  const [recInterim, setRecInterim] = useState("");
  const [recErr, setRecErr] = useState<string | null>(null);

  const recRef = useRef<any>(null);
  const baseTextRef = useRef<string>("");
  const finalRef = useRef<string>("");
  const shouldRestartRef = useRef<boolean>(false);

  const [recLang, setRecLang] = useState<"ru-RU" | "en-US" | "he-IL">("en-US");
  const isStartingFreshRef = useRef(true);
  const lastFinalChunkRef = useRef<string>("");

  const [analysisBusyId, setAnalysisBusyId] = useState<string | null>(null);
  const [analysisOpenId, setAnalysisOpenId] = useState<string | null>(null);

  const hintsRef = useRef<Record<string, string>>({});

  // ✅ auth state -> uid
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUid(u?.uid ?? null);
    });
    return () => unsub();
  }, []);

  // ✅ RTDB emojiHints
  useEffect(() => {
    const db = getDatabase();
    const p = rtdbRef(db, "/app_config/dreamly/emojiHints/en");

    const cb = (snap: any) => {
      const v = snap.val();
      if (v && typeof v === "object") {
        const next: Record<string, string> = {};
        for (const [k, val] of Object.entries(v)) {
          const kk = String(k || "").toLowerCase().trim();
          const vv = String(val || "").toLowerCase().trim();
          if (kk && vv) next[kk] = vv;
        }
        if (Object.keys(next).length > 0) hintsRef.current = next;
      }
    };

    onValue(p, cb, (err: any) => console.warn("RTDB emojiHints load failed:", err));
    return () => off(p, "value", cb);
  }, []);

  // ✅ RTDB emojiOverrides
  useEffect(() => {
    const db = getDatabase();
    const p = rtdbRef(db, "/app_config/dreamly/emojiOverrides/en");

    const cb = (snap: any) => {
      const v = snap.val();
      const obj: OverridesMap = v && typeof v === "object" && !Array.isArray(v) ? v : {};
      EMOJI_OVERRIDES = obj;
    };

    onValue(p, cb, (err: any) => console.warn("RTDB emojiOverrides load failed:", err));
    return () => off(p, "value", cb);
  }, []);

  function openAnalysis(dreamId: string) {
    setAnalysisOpenId(dreamId);
  }
  function closeAnalysis() {
    setAnalysisOpenId(null);
  }

  // init recLang
  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = localStorage.getItem("recLang");
    if (saved === "ru-RU" || saved === "en-US" || saved === "he-IL") {
      setRecLang(saved);
      return;
    }

    const nav = (navigator.language || "").toLowerCase();
    if (nav.startsWith("he")) setRecLang("he-IL");
    else if (nav.startsWith("ru")) setRecLang("ru-RU");
    else setRecLang("en-US");
  }, []);

  // persist recLang
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("recLang", recLang);
  }, [recLang]);

  // apply new language during active recording
  useEffect(() => {
    if (recStatus !== "listening") return;
    try {
      recRef.current?.stop?.();
    } catch {}
  }, [recLang, recStatus]);

  // SpeechRecognition support
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setRecSupported(!!SR);
  }, []);

  function getSpeechRecognitionCtor() {
    if (typeof window === "undefined") return null;
    return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
  }

  function buildText(base: string, finals: string, interim: string) {
    const a = (base ?? "").trim();
    const b = (finals ?? "").trim();
    const c = (interim ?? "").trim();
    const parts = [a, b, c].filter(Boolean);
    return parts.join(a && (b || c) ? "\n" : " ");
  }

  function startRecording() {
    setRecErr(null);

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setRecErr("Speech recognition is not supported on this device/browser.");
      setRecStatus("error");
      return;
    }

    try {
      recRef.current?.stop?.();
    } catch {}

    const rec = new Ctor();
    recRef.current = rec;

    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.lang = recLang;

    if (isStartingFreshRef.current) {
      lastFinalChunkRef.current = "";
      baseTextRef.current = text.trim();
      finalRef.current = "";
      setRecInterim("");
    }

    shouldRestartRef.current = true;

    rec.onstart = () => {
      setRecording(true);
      setRecStatus("listening");
    };

    rec.onerror = (e: any) => {
      setRecErr(e?.error ? String(e.error) : "Speech recognition error");
      setRecStatus("error");
      setRecording(false);
      shouldRestartRef.current = false;
    };

    rec.onend = () => {
      if (recRef.current !== rec) return;

      if (shouldRestartRef.current) {
        setTimeout(() => {
          isStartingFreshRef.current = false;
          try {
            rec.start();
          } catch {}
        }, 150);
        return;
      }

      setRecording(false);
      setRecStatus("idle");
    };

    rec.onresult = (event: any) => {
      let interim = "";
      let finalsChunk = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const transcript = String(res?.[0]?.transcript ?? "").trim();
        if (!transcript) continue;

        if (res.isFinal) finalsChunk += transcript + " ";
        else interim += transcript + " ";
      }

      const finalsAdd = finalsChunk.trim();
      const interimNow = interim.trim();

      if (finalsAdd) {
        if (finalsAdd !== lastFinalChunkRef.current) {
          finalRef.current = `${finalRef.current} ${finalsAdd}`.trim();
          lastFinalChunkRef.current = finalsAdd;
        }
      }

      setRecInterim(interimNow);
      setText(buildText(baseTextRef.current, finalRef.current, interimNow));
    };

    try {
      rec.start();
    } catch (e: any) {
      setRecErr(e?.message ?? "Failed to start recording");
      setRecStatus("error");
      setRecording(false);
      shouldRestartRef.current = false;
    }
  }

  function stopRecording() {
    shouldRestartRef.current = false;
    setRecInterim("");
    setRecStatus("idle");
    setRecording(false);

    try {
      recRef.current?.stop?.();
    } catch {}
    recRef.current = null;
  }

  function pauseRecording() {
    shouldRestartRef.current = false;
    setRecStatus("paused");
    setRecording(false);

    try {
      recRef.current?.stop?.();
    } catch {}
    recRef.current = null;
  }

  function resumeRecording() {
    baseTextRef.current = buildText(baseTextRef.current, finalRef.current, "");
    finalRef.current = "";
    setRecInterim("");
    shouldRestartRef.current = true;

    isStartingFreshRef.current = true;
    startRecording();
  }

  // Load dreams when signed in
  useEffect(() => {
    if (!uid) {
      setDreams([]);
      return;
    }

    const q1 = query(
      collection(firestore, "users", uid, "dreams"),
      orderBy("createdAtMs", "desc"),
      limit(200)
    );

    const unsub = onSnapshot(
      q1,
      (snap) => {
        const items: Dream[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
        setDreams(items);
      },
      (err) => {
        console.error("dreams onSnapshot error:", err);
        setError(err?.message ?? "Failed to load dreams.");
      }
    );

    return () => unsub();
  }, [uid]);

  useEffect(() => {
    const root = document.documentElement;
    if (open) root.classList.add("modal-open");
    else root.classList.remove("modal-open");
    return () => root.classList.remove("modal-open");
  }, [open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      stopRecording();
      setText("");
      setError(null);
      setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function requireGoogleAuth(): Promise<boolean> {
    setOpen(false);
    try {
      await ensureSignedIn();
      setUid(auth.currentUser?.uid ?? null);
      return true;
    } catch (e: any) {
      setError(e?.message ?? "Failed to sign in.");
      return false;
    }
  }

  function close() {
    if (saving) return;
    setOpen(false);
  }

  async function save() {
    const v = text.trim();
    if (!v || saving) return;

    setError(null);

    let u = auth.currentUser;
    if (!u) {
      const ok = await requireGoogleAuth();
      if (!ok) return;
      u = auth.currentUser;
    }
    if (!u) {
      setError("Please sign in with Google to save dreams.");
      return;
    }

    const now = new Date();
    const payload = {
      uid: u.uid,

      text: v,
      title: makeTitle(v),

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdAtMs: Date.now(),
      dateKey: toDateKeyLocal(now),
      timeKey: toTimeKeyLocal(now),
      tzOffsetMin: now.getTimezoneOffset(),

      wordCount: countWords(v),
      charCount: v.length,
      langGuess: guessLang(v),

      tags: [] as string[],
      summary: "",
      source: recording ? ("voice" as const) : ("manual" as const),

      deleted: false,

      emojis: [] as DreamEmoji[],
      iconsEn: [] as DreamIconKey[],

      shared: false,
      sharedAtMs: null as any,
      sharedAt: null as any,

      roots: [] as string[],
      rootsTop: [] as any[],
      rootsEn: [] as string[],
      rootsLang: null as any,
      rootsUpdatedAt: null as any,
    };

    setSaving(true);
    try {
      const docRef = await addDoc(collection(firestore, "users", u.uid, "dreams"), payload);
      setOpen(false);
      setSaving(false);

      setTimeout(() => {
        extractRoots(docRef.id).catch(() => {});
      }, 50);
    } catch (e: any) {
      setError(e?.message ?? "Failed to save dream.");
      setSaving(false);
    }
  }

  async function shareDream(dreamId: string) {
    let u = auth.currentUser;
    if (!u) {
      const ok = await requireGoogleAuth();
      if (!ok) return;
      u = auth.currentUser;
    }
    if (!u) {
      setError("Please sign in with Google to share dreams.");
      return;
    }

    const uid2 = u.uid;
    if (!uid2) return;
    if (sharingId || deletingId) return;

    setError(null);
    setSharingId(dreamId);

    const dream = dreams.find((x) => x.id === dreamId);
    if (!dream) {
      setError("Dream not found in local state.");
      setSharingId(null);
      return;
    }

    setDreams((prev) => prev.map((d) => (d.id === dreamId ? { ...d, shared: true, sharedAtMs: Date.now() } : d)));

    try {
      const nowMs = Date.now();

      await updateDoc(doc(firestore, "users", uid2, "dreams", dreamId), {
        shared: true,
        sharedAtMs: nowMs,
        sharedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const sharedId = `${uid2}_${dreamId}`;

      await setDoc(doc(firestore, "shared_dreams", sharedId), {
        ownerUid: uid2,
        ownerDreamId: dreamId,

        title: dream.title ?? "",
        text: dream.text ?? "",

        dateKey: dream.dateKey ?? null,
        timeKey: dream.timeKey ?? null,
        createdAtMs: dream.createdAtMs ?? null,

        wordCount: dream.wordCount ?? null,
        charCount: dream.charCount ?? null,
        langGuess: (dream as any).langGuess ?? null,

        iconsEn: (dream as any).iconsEn ?? [],
        emojis: (dream as any).emojis ?? [],

        sharedAtMs: nowMs,
        sharedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),

        deleted: false,

        reactions: { heart: 0, like: 0, star: 0 },
      });

      setTab("SHARED");
    } catch (e: any) {
      setDreams((prev) => prev.map((d) => (d.id === dreamId ? { ...d, shared: false } : d)));
      setError(e?.message ?? "Failed to share dream.");
    } finally {
      setSharingId(null);
    }
  }

  async function analyzeDream(dreamId: string) {
    let u = auth.currentUser;
    if (!u) {
      const ok = await requireGoogleAuth();
      if (!ok) return;
      u = auth.currentUser;
    }
    if (!u) {
      setError("Please sign in with Google to analyze dreams.");
      return;
    }

    const uid2 = u.uid;
    if (!uid2) return;
    if (analysisBusyId || deletingId || sharingId || rootsBusyId) return;

    const dream = dreams.find((d) => d.id === dreamId);
    const t = (dream?.text ?? "").trim();
    if (!t) return;

    if ((dream?.analysisText ?? "").trim()) {
      openAnalysis(dreamId);
      return;
    }

    setError(null);
    setAnalysisBusyId(dreamId);

    try {
      const res = await fetch("/api/dreams/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: t,
          lang: (dream as any)?.langGuess ?? guessLang(t),
        }),
      });

      const data2 = await res.json();
      if (!res.ok) throw new Error(data2?.error ?? "Analyze API failed");

      const analysisText = String(data2?.analysis ?? "").trim();
      if (!analysisText) throw new Error("Empty analysis from AI");

      const nowMs = Date.now();

      await updateDoc(doc(firestore, "users", uid2, "dreams", dreamId), {
        analysisText,
        analysisAtMs: nowMs,
        analysisModel: data2?.model ?? null,
        updatedAt: serverTimestamp(),
      });

      setDreams((prev) =>
        prev.map((x) =>
          x.id === dreamId
            ? { ...x, analysisText, analysisAtMs: nowMs, analysisModel: data2?.model ?? undefined }
            : x
        )
      );

      openAnalysis(dreamId);
    } catch (e: any) {
      setError(e?.message ?? "Failed to analyze dream.");
    } finally {
      setAnalysisBusyId(null);
    }
  }

  async function deleteDream(dreamId: string) {
    let u = auth.currentUser;
    if (!u) {
      const ok = await requireGoogleAuth();
      if (!ok) return;
      u = auth.currentUser;
    }
    if (!u) {
      setError("Please sign in with Google to delete dreams.");
      return;
    }

    const uid2 = u.uid;
    if (!uid2) return;
    if (deletingId || sharingId) return;

    setError(null);
    setDeletingId(dreamId);

    setDreams((prev) => prev.map((d) => (d.id === dreamId ? { ...d, deleted: true } : d)));

    try {
      const nowMs = Date.now();

      await updateDoc(doc(firestore, "users", uid2, "dreams", dreamId), {
        deleted: true,
        deletedAtMs: nowMs,
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const sharedId = `${uid2}_${dreamId}`;
      await updateDoc(doc(firestore, "shared_dreams", sharedId), {
        deleted: true,
        deletedAtMs: nowMs,
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    } catch (e: any) {
      setDreams((prev) => prev.map((d) => (d.id === dreamId ? { ...d, deleted: false } : d)));
      setError(e?.message ?? "Failed to delete dream.");
    } finally {
      setDeletingId(null);
    }
  }

  function normalizeRootForEmojiLive(root: string, lang?: string) {
    const s = (root ?? "").trim();
    if (!s) return "";
    const lower = s.toLowerCase().trim();

    const hints = hintsRef.current || {};
    const mapped = hints[lower];
    if (mapped) return mapped;

    return textForIconPicker(s, lang);
  }

  function filterIconsEn(keys: DreamIconKey[], max: number) {
    const out: DreamIconKey[] = [];
    for (const k of keys) {
      const icon = (DREAM_ICONS_EN as any)?.[k];
      const glyph = icon?.emoji ?? icon?.native;
      if (!glyph) continue;
      out.push(k);
      if (out.length >= max) break;
    }
    return out;
  }

  async function extractRoots(dreamId: string) {
    let u = auth.currentUser;
    if (!u) {
      const ok = await requireGoogleAuth();
      if (!ok) return;
      u = auth.currentUser;
    }
    if (!u) {
      setError("Please sign in with Google to extract roots.");
      return;
    }

    const uid2 = u.uid;
    if (!uid2) return;
    if (rootsBusyId || deletingId || sharingId) return;

    let dream = dreams.find((d) => d.id === dreamId) as any;
    if (!dream) {
      const snap = await getDoc(doc(firestore, "users", uid2, "dreams", dreamId));
      if (!snap.exists()) return;
      dream = { id: dreamId, ...(snap.data() as any) };
    }

    const t = String(dream?.text ?? "").trim();
    if (!t) return;

    const hasRoots =
      (Array.isArray(dream?.roots) && dream.roots.length > 0) ||
      (Array.isArray(dream?.rootsEn) && dream.rootsEn.length > 0);

    const hasVisuals =
      (Array.isArray(dream?.emojis) && dream.emojis.length > 0) ||
      (Array.isArray(dream?.iconsEn) && dream.iconsEn.length > 0);

    if (hasRoots && hasVisuals) return;

    setError(null);
    setRootsBusyId(dreamId);

    try {
      const res = await fetch("/api/dreams/rootwords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t }),
      });

      const data2 = await res.json();
      if (!res.ok) throw new Error(data2?.error ?? "API failed");

      const rootsArr = Array.isArray(data2?.roots) ? data2.roots : [];
      const rootsEnArr = Array.isArray(data2?.rootsEn) ? data2.rootsEn : rootsArr;

      const counts = desiredCountsFromText(t);

      const rootsMajor = rootsArr.slice(0, counts.roots);
      const rootsEnMajor = rootsEnArr.slice(0, counts.roots);

      if (!rootsMajor.length || !rootsEnMajor.length) {
        throw new Error("No roots found. Try writing a bit more details.");
      }

      const normalizedEn = normalizeForIconsEn(rootsEnMajor.join(" "));
      const iconsEnRaw = pickDreamIconsEn(normalizedEn, counts.icons) as DreamIconKey[];
      const iconsEn = filterIconsEn(iconsEnRaw, counts.icons);

      const picked = await Promise.all(
        rootsEnMajor.map((r: string) => pickEmojiForOneRoot_AI(normalizeRootForEmojiLive(r, "en"), "en"))
      );

      const emojis = (picked.filter(Boolean) as DreamEmoji[]).slice(0, counts.emojis);

      await updateDoc(doc(firestore, "users", uid2, "dreams", dreamId), {
        roots: rootsMajor,
        rootsEn: rootsEnMajor,
        rootsLang: data2?.lang ?? null,
        rootsTop: [],
        iconsEn,
        emojis,
        rootsUpdatedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      try {
        await ingestDreamForMap({ uid: uid2, dreamId });
      } catch (e) {
        console.warn("map ingest failed", e);
      }

      setDreams((prev) =>
        prev.map((x) =>
          x.id === dreamId
            ? {
                ...x,
                roots: rootsMajor,
                rootsEn: rootsEnMajor,
                rootsLang: data2?.lang ?? null,
                rootsTop: [],
                iconsEn,
                emojis,
              }
            : x
        )
      );
    } catch (e: any) {
      setError(e?.message ?? "Failed to extract roots.");
    } finally {
      setRootsBusyId(null);
    }
  }

  const canSave = useMemo(() => !!text.trim() && !saving, [text, saving]);

  const aliveDreams = useMemo(() => dreams.filter((d) => (d as any).deleted !== true), [dreams]);
  const sharedDreams = useMemo(() => aliveDreams.filter((d) => d.shared === true), [aliveDreams]);
  const visibleDreams = tab === "SHARED" ? sharedDreams : aliveDreams;

  useEffect(() => {
    if (!uid) return;
    if (tab !== "SHARED") return;

    let cancelled = false;

    (async () => {
      const shared = aliveDreams.filter((d) => d.shared === true);

      const pairs = await Promise.all(
        shared.map(async (d) => {
          const sharedId = `${uid}_${d.id}`;
          const snap = await getDoc(doc(firestore, "shared_dreams", sharedId));
          const data2 = snap.exists() ? (snap.data() as any) : {};
          const r = data2.reactions ?? {};
          return [
            d.id,
            {
              heart: Number(r.heart ?? 0),
              like: Number(r.like ?? 0),
              star: Number(r.star ?? 0),
            },
          ] as const;
        })
      );

      if (cancelled) return;

      const map: Record<string, { heart: number; like: number; star: number }> = {};
      for (const [dreamId, r] of pairs) map[dreamId] = r;

      setPublicReactions(map);
    })().catch((e) => console.error(e));

    return () => {
      cancelled = true;
    };
  }, [uid, tab, aliveDreams]);

  return (
    <main className="min-h-screen px-5 sm:px-6 py-8 sm:py-10 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold">Your Dreams</h1>

          {/* Tabs */}
          <div className="mt-3 inline-flex rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_70%,transparent)] p-1">
            <button
              onClick={() => setTab("ALL")}
              className={[
                "px-4 py-2 rounded-full text-sm font-semibold transition",
                tab === "ALL"
                  ? "bg-[var(--text)] text-[var(--bg)]"
                  : "text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--text)_10%,transparent)]",
              ].join(" ")}
            >
              All <span className="opacity-70">({aliveDreams.length})</span>
            </button>

            <button
              onClick={() => setTab("SHARED")}
              className={[
                "px-4 py-2 rounded-full text-sm font-semibold transition",
                tab === "SHARED"
                  ? "bg-[var(--text)] text-[var(--bg)]"
                  : "text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--text)_10%,transparent)]",
              ].join(" ")}
            >
              Shared <span className="opacity-70">({sharedDreams.length})</span>
            </button>
          </div>
        </div>

        <button
          onClick={async () => {
            const u = auth.currentUser;
            if (!u) {
              const ok = await requireGoogleAuth();
              if (!ok) return;
            }
            setOpen(true);
          }}
          className="
            inline-flex items-center gap-2
            px-6 py-3
            rounded-full
            bg-[var(--card)]
            text-[var(--text)]
            border border-[var(--border)]
            font-semibold
            shadow-sm
            hover:opacity-90
            active:scale-[0.98]
            transition
          "
        >
          <span className="text-lg leading-none">+</span>
          <span>New</span>
        </button>
      </div>

      {/* Signed-out hint */}
      {!uid && (
        <div className="mt-5 p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] text-sm text-[var(--muted)] flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">You are not signed in. Sign in with Google to create and save your dreams.</div>

          <button
            onClick={async () => {
              await requireGoogleAuth();
            }}
            className="px-4 py-2 rounded-xl bg-white text-black font-semibold inline-flex items-center gap-2"
          >
            <span className="text-lg">G</span>
            <span>Sign in with Google</span>
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-5 text-sm text-red-200 bg-red-600/15 border border-red-500/30 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* List */}
      {!uid ? null : visibleDreams.length === 0 ? (
        <div className="mt-8 p-5 rounded-2xl bg-[var(--card)] text-[var(--muted)] border border-[var(--border)]">
          {tab === "SHARED" ? "No shared dreams yet. Share one from the All tab." : "No dreams yet. Add your first one."}
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {visibleDreams.map((d, index) => {
            const isShared = d.shared === true;
            const isSharing = sharingId === d.id;
            const isDeleting = deletingId === d.id;
            const isRootsBusy = rootsBusyId === d.id;

            const hasRoots =
              (Array.isArray(d.roots) && d.roots.length > 0) ||
              (Array.isArray(d.rootsEn) && d.rootsEn.length > 0);

            const hasVisuals =
              (Array.isArray(d.emojis) && d.emojis.length > 0) ||
              (Array.isArray(d.iconsEn) && d.iconsEn.length > 0);

            const dreamNum = visibleDreams.length - index;

            return (
              <div key={d.id} className="p-5 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="text-base font-semibold">Dream #{dreamNum}</div>

                      {isRootsBusy && !(hasRoots && hasVisuals) && (
                        <span className="text-xs text-[var(--muted)]">Generating…</span>
                      )}

                      {Array.isArray(d.emojis) && d.emojis.length > 0 && (
                        <span className="inline-flex items-baseline gap-2 text-[18px] leading-none">
                          {d.emojis.slice(0, 5).map((em, i) => (
                            <span
                              key={`${d.id}:${em.native}:${i}`}
                              title={em.name || em.id || "emoji"}
                              className="cursor-help"
                            >
                              {em.native}
                            </span>
                          ))}
                        </span>
                      )}

                      {Array.isArray(d.iconsEn) && d.iconsEn.length > 0 && (
                        <span className="inline-flex items-baseline gap-2 text-[18px] leading-none opacity-90">
                          {d.iconsEn
                            .map((k) => {
                              const icon = (DREAM_ICONS_EN as any)?.[k];
                              const glyph = icon?.emoji ?? icon?.native;
                              if (!glyph) return null;
                              return { k, glyph, label: icon?.label || icon?.name || String(k) };
                            })
                            .filter(Boolean)
                            .slice(0, 4)
                            .map((x: any, i: number) => (
                              <span key={`${d.id}:icon:${String(x.k)}:${i}`} title={x.label} className="cursor-help">
                                {x.glyph}
                              </span>
                            ))}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <button
                      onClick={() => shareDream(d.id)}
                      disabled={isShared || isSharing || isDeleting}
                      className={[
                        "dream-btn",
                        isShared ? "dream-btn--shared" : "dream-btn--neutral",
                        isSharing ? "opacity-70 cursor-wait" : "",
                        isDeleting ? "opacity-60 cursor-not-allowed" : "",
                      ].join(" ")}
                      title={isShared ? "Already shared" : "Publish to Shared feed"}
                    >
                      {isShared ? "✓ Shared" : isSharing ? "Sharing…" : "Share"}
                    </button>

                    {(() => {
                      const hasAnalysis = !!(d.analysisText ?? "").trim();
                      const isAnalyzing = analysisBusyId === d.id;
                      const pulse = !hasAnalysis && !isAnalyzing && !isDeleting && !isSharing && !isRootsBusy;

                      return (
                        <button
                          onClick={() => analyzeDream(d.id)}
                          disabled={isDeleting || isSharing || isRootsBusy || isAnalyzing}
                          className={[
                            "dream-btn",
                            hasAnalysis ? "dream-btn--blue" : "dream-btn--neutral",
                            pulse ? "dream-btn--pulse" : "",
                            isAnalyzing ? "opacity-80 cursor-wait" : "",
                            isDeleting || isSharing || isRootsBusy ? "opacity-60 cursor-not-allowed" : "",
                          ].join(" ")}
                          title={hasAnalysis ? "View analysis" : "Analyze with AI"}
                        >
                          {isAnalyzing ? "Analyzing…" : hasAnalysis ? "Analysis" : "Analyze"}
                        </button>
                      );
                    })()}

                    <button
                      onClick={() => {
                        if (confirm("Delete this dream?")) deleteDream(d.id);
                      }}
                      disabled={isDeleting || isSharing}
                      className={[
                        "dream-btn",
                        "dream-btn--danger",
                        isDeleting ? "opacity-70 cursor-wait" : "",
                        isSharing ? "opacity-60 cursor-not-allowed" : "",
                      ].join(" ")}
                      title="Delete"
                    >
                      🗑
                    </button>
                  </div>
                </div>

                <div className="mt-2 text-[var(--text)] whitespace-pre-wrap break-words">{d.text}</div>

                {(() => {
                  const chips =
                    (Array.isArray(d.roots) && d.roots.length > 0 && d.roots) ||
                    (Array.isArray(d.rootsEn) && d.rootsEn.length > 0 && d.rootsEn) ||
                    null;

                  if (!chips) return null;

                  return (
                    <div className="mt-3 text-xs text-[var(--muted)] flex flex-wrap gap-2">
                      {chips.slice(0, 6).map((w, i) => (
                        <span
                          key={`${d.id}:root:${i}`}
                          className="px-2 py-1 rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_70%,transparent)]"
                        >
                          {w}
                        </span>
                      ))}
                    </div>
                  );
                })()}

                <div className="mt-3 text-xs text-[var(--muted)] flex items-end justify-between gap-3 flex-wrap">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 items-center">
                    <span>{d.wordCount ?? 0} words</span>
                    <span>{d.charCount ?? 0} chars</span>
                    {d.source ? <span>{d.source}</span> : null}
                    {isShared ? <span className="opacity-80">shared</span> : null}
                  </div>

                  <div className="opacity-70 whitespace-nowrap">
                    {(d.dateKey ?? "") + (d.timeKey ? ` ${d.timeKey}` : "")}
                  </div>
                </div>

                {tab === "SHARED" &&
                  (() => {
                    const r = publicReactions[d.id] ?? { heart: 0, like: 0, star: 0 };
                    const total = r.heart + r.like + r.star;
                    if (total === 0) return null;

                    return (
                      <div className="mt-3 text-xs text-[var(--muted)] flex gap-3 flex-wrap items-center">
                        {r.heart > 0 && <span>❤️ {r.heart}</span>}
                        {r.like > 0 && <span>👍 {r.like}</span>}
                        {r.star > 0 && <span>⭐ {r.star}</span>}
                      </div>
                    );
                  })()}
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom sheet modal */}
      <div className={["fixed inset-0 z-50 transition", open ? "pointer-events-auto" : "pointer-events-none"].join(" ")}>
        <div
          onClick={close}
          className={["absolute inset-0 transition-opacity", open ? "opacity-100" : "opacity-0", "bg-black/40"].join(" ")}
        />

        <div
          className={[
            "absolute left-0 right-0 bottom-0",
            "mx-auto w-full max-w-3xl",
            "transition-transform duration-300 ease-out",
            open ? "translate-y-0" : "translate-y-full",
          ].join(" ")}
        >
          <div
            className="rounded-t-3xl border border-[var(--border)] bg-[var(--bg)] shadow-2xl"
            style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
          >
            <div className="flex justify-center pt-3">
              <div className="h-1.5 w-12 rounded-full bg-[color-mix(in_srgb,var(--text)_18%,transparent)]" />
            </div>

            <div className="px-5 sm:px-6 pt-4 pb-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">New Dream</h2>

                <button
                  onClick={close}
                  disabled={saving}
                  className={["dream-btn", "dream-btn--neutral", saving ? "opacity-60 cursor-not-allowed" : ""].join(" ")}
                >
                  Close
                </button>
              </div>

              <div className="mt-4">
                <textarea
                  ref={inputRef}
                  value={text}
                  onChange={(e) => {
                    const v = e.target.value;
                    setText(v);

                    const next = detectRecLangFromText(v);
                    if (next) setRecLang(next);
                  }}
                  placeholder="Type your dream…"
                  rows={5}
                  disabled={saving}
                  className="w-full resize-none rounded-2xl p-4
                             bg-[var(--card)] text-[var(--text)]
                             border border-[var(--border)] outline-none
                             focus:border-[color-mix(in_srgb,var(--text)_22%,var(--border))]
                             disabled:opacity-60"
                />
                <div className="mt-2 text-xs text-[var(--muted)]">Keep it short for Phase One. You can add tags later.</div>
              </div>

              {recInterim ? (
                <div className="mt-2 text-xs text-[var(--muted)]">
                  <span className="opacity-70">Listening…</span> <span className="italic">{recInterim}</span>
                </div>
              ) : null}

              {recErr ? (
                <div className="mt-2 text-xs text-red-200 bg-red-600/15 border border-red-500/30 rounded-xl px-3 py-2">
                  {recErr}
                </div>
              ) : null}

              <div className="mt-5 flex items-center justify-between gap-3 flex-wrap">
                {!recSupported ? (
                  <button
                    onClick={() => setRecErr("Tip: on iPhone use the 🎤 button on the keyboard for диктовка.")}
                    className={["dream-btn", "dream-btn--neutral"].join(" ")}
                    type="button"
                  >
                    🎙 Record (not supported)
                  </button>
                ) : recStatus === "listening" ? (
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={pauseRecording} className={["dream-btn", "dream-btn--neutral"].join(" ")} type="button">
                      ⏸ Pause
                    </button>
                    <button onClick={stopRecording} className={["dream-btn", "dream-btn--danger"].join(" ")} type="button">
                      ⏹ Stop
                    </button>
                  </div>
                ) : recStatus === "paused" ? (
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={resumeRecording} className={["dream-btn", "dream-btn--recording"].join(" ")} type="button">
                      ▶ Resume
                    </button>
                    <button onClick={stopRecording} className={["dream-btn", "dream-btn--danger"].join(" ")} type="button">
                      ⏹ Stop
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      isStartingFreshRef.current = true;
                      startRecording();
                    }}
                    disabled={saving}
                    className={["dream-btn", "dream-btn--recording", saving ? "opacity-60 cursor-not-allowed" : ""].join(" ")}
                    type="button"
                  >
                    🎙 Start
                  </button>
                )}

                <div className="flex gap-2 flex-wrap justify-end">
                  <button
                    onClick={close}
                    disabled={saving}
                    className={["dream-btn", "dream-btn--neutral", saving ? "opacity-60 cursor-not-allowed" : ""].join(" ")}
                  >
                    Cancel
                  </button>

                  <button
                    onClick={save}
                    disabled={!canSave}
                    className={["dream-primary-btn", !canSave ? "opacity-60 cursor-not-allowed" : ""].join(" ")}
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>

              <div className="mt-3 text-xs text-[var(--muted)]">
                Next: мы подключим Speech-to-Text и будем сохранять всё как текст.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analysis popup */}
      {analysisOpenId &&
        (() => {
          const d = dreams.find((x) => x.id === analysisOpenId);
          const txt = (d?.analysisText ?? "").trim();

          return (
            <div
              className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
              onClick={closeAnalysis}
            >
              <div
                className="w-full max-w-lg rounded-2xl bg-[var(--card)] p-5 shadow-2xl border border-[var(--border)]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-lg font-semibold text-[var(--text)]">Dream Analysis</div>
                    {d?.analysisAtMs ? (
                      <div className="mt-1 text-xs text-[var(--muted)]">Saved: {new Date(d.analysisAtMs).toLocaleString()}</div>
                    ) : null}
                  </div>

                  <button onClick={closeAnalysis} className={["dream-btn", "dream-btn--neutral"].join(" ")}>
                    Close
                  </button>
                </div>

                <div className="mt-4">
                  {!txt ? (
                    <div className="text-sm text-[var(--muted)]">No analysis found.</div>
                  ) : (
                    <div className="text-[var(--text)] whitespace-pre-wrap break-words text-sm leading-relaxed">{txt}</div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

      <BottomNav hidden={open} />
    </main>
  );
}