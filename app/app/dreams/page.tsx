"use client";

import BottomNav from "../BottomNav";
import { useEffect, useMemo, useRef, useState } from "react";
import { pickDreamIconsEn, DREAM_ICONS_EN } from "@/lib/dream-icons/dreamIcons.en";
import { onIdTokenChanged } from "firebase/auth";
import { FcGoogle } from "react-icons/fc";

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
import {
  GoogleAuthProvider,
  signInWithPopup,
  type User,
} from "firebase/auth";
import data from "@emoji-mart/data";
import { init, SearchIndex } from "emoji-mart";

type DreamIconKey = keyof typeof DREAM_ICONS_EN;

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
  rootsEn?: string[];        // корни на английском (для emoji поиска)
  roots?: string[];
  rootsTop?: { w: string; c: number }[];
  rootsLang?: string;
  rootsUpdatedAt?: any;

  // (optional) legacy
  iconsEn?: DreamIconKey[];
};

type DreamEmoji = {
  native: string;
  name?: string;
  id?: string;
};

type Tab = "ALL" | "SHARED";

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

  // если явно один алфавит — переключаем
  if (hasHe && !hasCy && !hasLat) return "he-IL";
  if (hasCy && !hasHe) return "ru-RU";
  if (hasLat && !hasHe && !hasCy) return "en-US";

  // смешано / пусто — не трогаем
  return null;
}


function makeTitle(text: string) {
  const t = (text ?? "").trim().replace(/\s+/g, " ");
  if (!t) return "";
  return t.length <= 60 ? t : t.slice(0, 60) + "…";
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

const STOP = new Set([
  "i","me","my","we","you","he","she","it","they",
  "a","an","the","and","or","but",
  "was","were","am","is","are","be","been",
  "to","of","in","on","at","for","with","from","into","over","under",
  "that","this","there","here","then",
  "dream","dreamed","dreaming",
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

type RecStatus = "idle" | "listening" | "paused" | "error";

type EmojiCandidate = {
  native: string;
  id?: string;
  name?: string;
  keywords?: string[];
  score: number;
};

function norm(s: any) {
  return String(s ?? "").toLowerCase().trim();
}
function toNative(r: any) {
  return r?.skins?.[0]?.native || r?.native || "";
}
function isGarbageEmoji(r: any) {
  const id = norm(r?.id);
  const name = norm(r?.name);

  if (id.startsWith("flag-") || name.includes("flag")) return true;
  if (id.includes("skin-tone")) return true;
  if (id.startsWith("keycap_") || name.includes("keycap")) return true;
  if (name.includes("regional indicator")) return true;

  return false;
}

const ROOT_HINTS: Record<string, string> = {
  forest: "tree",
  wood: "tree",
};

let EMOJI_READY: Promise<void> | null = null;
function ensureEmojiIndex() {
  if (!EMOJI_READY) EMOJI_READY = init({ data });
  return EMOJI_READY;
}

function normalizeRootForEmoji(root: string, lang?: string) {
  const s = (root ?? "").trim();
  if (!s) return "";
  const lower = s.toLowerCase();
  if (ROOT_HINTS[lower]) return ROOT_HINTS[lower];
  return textForIconPicker(s, lang);
}

function scoreCandidateForToken(token: string, r: any, allTokens: string[]) {
  const t = norm(token);
  const id = norm(r?.id).replace(/[-_]/g, " ");
  const name = norm(r?.name);
  const kws: string[] = Array.isArray(r?.keywords) ? r.keywords.map(norm) : [];

  if (id === t || name === t) return 140;
  if (kws.includes(t)) return 120;

  let s = 0;
  if (id.split(" ").includes(t)) s = Math.max(s, 90);
  if (name.split(" ").includes(t)) s = Math.max(s, 85);

  if (name.includes(t)) s = Math.max(s, 60);
  if (id.includes(t)) s = Math.max(s, 55);

  let hits = 0;
  for (const tok of allTokens) {
    const tt = norm(tok);
    if (!tt) continue;
    if (id.includes(tt) || name.includes(tt) || kws.some((k) => k.includes(tt))) hits++;
  }
  if (hits >= 2) s += 40 + hits * 8;

  if (t === "thing" || t === "stuff" || t === "object") s -= 30;

  return s;
}

function uniqByNativeKeepBest(cands: EmojiCandidate[]) {
  const best = new Map<string, EmojiCandidate>();
  for (const c of cands) {
    const prev = best.get(c.native);
    if (!prev || c.score > prev.score) best.set(c.native, c);
  }
  return Array.from(best.values()).sort((a, b) => b.score - a.score);
}

/**
 * Вариант A:
 * 1) локально собираем список кандидатов (топ-20)
 * 2) зовём API /api/dreams/emoji-pick (AI выбирает 1 из списка)
 * 3) если AI/сеть упала — берём top-1 локально
 */
async function pickEmojiForOneRoot_AI(root: string, lang?: string): Promise<DreamEmoji | null> {
  await ensureEmojiIndex();

  const q = normalizeRootForEmoji(root, lang);
  if (!q) return null;

  const tokens =
    lang === "en" ? tokenizeEn(q) : q.split(/\s+/).filter(Boolean).slice(0, 6);

  if (tokens.length === 0) return null;

  const localHits: EmojiCandidate[] = [];

  for (const t of tokens) {
    const res: any[] = await (SearchIndex as any).search(t);
    for (const r of (res ?? []).slice(0, 80)) {
      if (!r) continue;
      if (isGarbageEmoji(r)) continue;

      const native = toNative(r);
      if (!native) continue;

      const sc = scoreCandidateForToken(t, r, tokens);
      if (sc <= 0) continue;

      localHits.push({
        native,
        id: r?.id,
        name: r?.name,
        keywords: Array.isArray(r?.keywords) ? r.keywords.slice(0, 24) : [],
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

    const data = await resp.json();
    if (resp.ok && data?.native) {
      const picked = candidates.find((c) => c.native === data.native);
      if (picked) return { native: picked.native, id: picked.id, name: picked.name };
    }
  } catch {
    // ignore → fallback
  }

  const best = candidates[0];
  return best ? { native: best.native, id: best.id, name: best.name } : null;
}

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

  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [recLang, setRecLang] = useState<"ru-RU" | "en-US" | "he-IL">("en-US");

  const isStartingFreshRef = useRef(true);

  const lastFinalChunkRef = useRef<string>("");


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

// 🔥 apply new language during active recording
useEffect(() => {
  if (recStatus !== "listening") return;

  // мягко перезапустим — onend сам поднимет обратно
  try {
    recRef.current?.stop?.();
  } catch {}
}, [recLang, recStatus]);

  // ✅ SpeechRecognition support
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setRecSupported(!!SR);
  }, []);

  // ✅ ONLY Google auth: no anonymous sign-in
  useEffect(() => {
    const unsub = onIdTokenChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setUid(u.uid);
        setShowAuthModal(false);
      } else {
        setUser(null);
        setUid(null);
        // если пользователь не залогинен — можно показать модалку,
        // но мы будем открывать её по действию (New/Save/Roots/Share/Delete)
        setShowAuthModal(false);
      }
    });

    return () => unsub();
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

  try { recRef.current?.stop?.(); } catch {}

  const rec = new Ctor();
  recRef.current = rec;

  rec.continuous = false;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  rec.lang = recLang;

  // ✅ сбрасываем только при "fresh" старте (кнопка Start / Resume)
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
        // ✅ важно: это уже не fresh-start
        isStartingFreshRef.current = false;
        try { rec.start(); } catch {}
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
  // защита от дубля
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

  isStartingFreshRef.current = true; // ✅ это fresh для новой "сессии"
  startRecording();
}

  // ✅ Load dreams only when signed in
  useEffect(() => {
    if (!uid) {
      setDreams([]);
      return;
    }

    const q = query(
      collection(firestore, "users", uid, "dreams"),
      orderBy("createdAtMs", "desc"),
      limit(200)
    );

    const unsub = onSnapshot(
      q,
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

  function requireGoogleAuth() {
    setOpen(false);           // закрываем bottom-sheet если открыт
    setShowAuthModal(true);
  }

  function close() {
    if (saving) return;
    setOpen(false);
  }

  async function save() {
    const v = text.trim();
    if (!v || saving) return;

    setError(null);

    const u = auth.currentUser;
    if (!u) {
      requireGoogleAuth();
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
      shared: false,
      sharedAtMs: null as any,
      sharedAt: null as any,

      roots: [] as string[],
      rootsTop: [] as any[],
      rootsEn: [] as string[],      // ✅ ADD
      rootsLang: null as any,
      rootsUpdatedAt: null as any,
    };

    setSaving(true);
    try {
      await addDoc(collection(firestore, "users", u.uid, "dreams"), payload);
      setOpen(false);
    } catch (e: any) {
      setError(e?.message ?? "Failed to save dream.");
      setSaving(false);
    }
  }

  async function shareDream(dreamId: string) {
    const u = auth.currentUser;
    if (!u) {
      requireGoogleAuth();
      setError("Please sign in with Google to share dreams.");
      return;
    }
    if (!uid) return;
    if (sharingId || deletingId) return;

    setError(null);
    setSharingId(dreamId);

    const dream = dreams.find((x) => x.id === dreamId);
    if (!dream) {
      setError("Dream not found in local state.");
      setSharingId(null);
      return;
    }

    setDreams((prev) =>
      prev.map((d) =>
        d.id === dreamId ? { ...d, shared: true, sharedAtMs: Date.now() } : d
      )
    );

    try {
      const nowMs = Date.now();

      await updateDoc(doc(firestore, "users", uid, "dreams", dreamId), {
        shared: true,
        sharedAtMs: nowMs,
        sharedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const sharedId = `${uid}_${dreamId}`;

      await setDoc(doc(firestore, "shared_dreams", sharedId), {
        ownerUid: uid,
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
      setDreams((prev) =>
        prev.map((d) => (d.id === dreamId ? { ...d, shared: false } : d))
      );
      setError(e?.message ?? "Failed to share dream.");
    } finally {
      setSharingId(null);
    }
  }

  async function deleteDream(dreamId: string) {
    const u = auth.currentUser;
    if (!u) {
      requireGoogleAuth();
      setError("Please sign in with Google to delete dreams.");
      return;
    }
    if (!uid) return;
    if (deletingId || sharingId) return;

    setError(null);
    setDeletingId(dreamId);

    setDreams((prev) =>
      prev.map((d) => (d.id === dreamId ? { ...d, deleted: true } : d))
    );

    try {
      const nowMs = Date.now();

      await updateDoc(doc(firestore, "users", uid, "dreams", dreamId), {
        deleted: true,
        deletedAtMs: nowMs,
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const sharedId = `${uid}_${dreamId}`;
      await updateDoc(doc(firestore, "shared_dreams", sharedId), {
        deleted: true,
        deletedAtMs: nowMs,
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    } catch (e: any) {
      setDreams((prev) =>
        prev.map((d) => (d.id === dreamId ? { ...d, deleted: false } : d))
      );
      setError(e?.message ?? "Failed to delete dream.");
    } finally {
      setDeletingId(null);
    }
  }

 async function extractRoots(dreamId: string) {
  const u = auth.currentUser;
  if (!u) {
    requireGoogleAuth();
    setError("Please sign in with Google to extract roots.");
    return;
  }
  if (!uid) return;
  if (rootsBusyId || deletingId || sharingId) return;

  const dream = dreams.find((d) => d.id === dreamId);
  const t = (dream?.text ?? "").trim();
  if (!t) return;

const hasAnyRoots =
  (Array.isArray(dream?.roots) && dream.roots.length > 0) ||
  (Array.isArray(dream?.rootsEn) && dream.rootsEn.length > 0);

if (hasAnyRoots) return;
  setError(null);
  setRootsBusyId(dreamId);

  try {
    const res = await fetch("/api/dreams/rootwords", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: t }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? "API failed");

const rootsArr = Array.isArray(data?.roots) ? data.roots : [];
const rootsEnArr = Array.isArray(data?.rootsEn) ? data.rootsEn : rootsArr;

const MAJOR = 6;
const rootsMajor = rootsArr.slice(0, MAJOR);
const rootsEnMajor = rootsEnArr.slice(0, MAJOR);

if (!rootsMajor.length || !rootsEnMajor.length) {
  throw new Error("No roots found. Try writing a bit more details.");
}


  const normalizedEn = rootsEnMajor.join(" ").toLowerCase();
const iconsEn: DreamIconKey[] = pickDreamIconsEn(normalizedEn, 4) as DreamIconKey[];

const picked = await Promise.all(
  rootsEnMajor.map((r: string) => pickEmojiForOneRoot_AI(r, "en"))
);
const emojis = picked.filter(Boolean).slice(0, 5) as DreamEmoji[];

  await updateDoc(doc(firestore, "users", uid, "dreams", dreamId), {
  roots: rootsMajor,
  rootsEn: rootsEnMajor,
  rootsLang: data?.lang ?? null,
  rootsTop: [],
  iconsEn,
  emojis,
  rootsUpdatedAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});

    setDreams((prev) =>
      prev.map((x) =>
        x.id === dreamId
          ? {
              ...x,
              roots: rootsMajor,
rootsEn: rootsEnMajor,
              rootsLang: data?.lang ?? null,
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

  const aliveDreams = useMemo(
    () => dreams.filter((d) => (d as any).deleted !== true),
    [dreams]
  );

  const sharedDreams = useMemo(
    () => aliveDreams.filter((d) => d.shared === true),
    [aliveDreams]
  );

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
          const data = snap.exists() ? (snap.data() as any) : {};
          const r = data.reactions ?? {};
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
          onClick={() => {
            const u = auth.currentUser;
            if (!u) {
              requireGoogleAuth();
              return;
            }
            setOpen(true);
          }}
          className="px-6 py-3 rounded-full bg-white text-black font-semibold"
        >
          + New
        </button>
      </div>

      {/* Signed-out hint */}
      {!uid && (
       <div className="mt-5 p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] text-sm text-[var(--muted)] flex items-center justify-between gap-3 flex-wrap">
  <div className="min-w-0">
You are not signed in. Sign in with Google to create and save your dreams.
  </div>

  <button
    onClick={() => requireGoogleAuth()}
    className="px-4 py-2 rounded-xl bg-white text-black font-semibold inline-flex items-center gap-2"
  >
    <FcGoogle className="text-lg" />
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
          {tab === "SHARED"
            ? "No shared dreams yet. Share one from the All tab."
            : "No dreams yet. Add your first one."}
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

  
            return (
              <div
                key={d.id}
                className="p-5 rounded-2xl bg-[var(--card)] border border-[var(--border)]"
              >
                {/* Title + Actions */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    {(() => {
                      const dreamNum = visibleDreams.length - index;

                      return (
                        <div className="flex items-center gap-3">
                          <div className="text-base font-semibold">
                            Dream #{dreamNum}
                          </div>

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
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {/* Share */}
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

                    {/* Roots */}
                    <button
                      onClick={() => extractRoots(d.id)}
                      disabled={hasRoots || isRootsBusy || isDeleting}
                      className={[
                        "dream-btn",
                        "dream-btn--neutral",
                        hasRoots ? "opacity-60 cursor-not-allowed" : "",
                        isRootsBusy ? "opacity-70 cursor-wait" : "",
                        isDeleting ? "opacity-60 cursor-not-allowed" : "",
                      ].join(" ")}
                      title={hasRoots ? "Roots already extracted" : "Extract roots"}
                    >
                      {isRootsBusy ? "Roots…" : "Roots"}
                    </button>

                    {/* Delete */}
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

                {/* Text */}
                <div className="mt-2 text-[var(--text)] whitespace-pre-wrap break-words">
                  {d.text}
                </div>

                {/* Roots chips */}
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

                {/* Meta row */}
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

                {/* Reactions */}
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
      <div
        className={[
          "fixed inset-0 z-50 transition",
          open ? "pointer-events-auto" : "pointer-events-none",
        ].join(" ")}
      >
        <div
          onClick={close}
          className={[
            "absolute inset-0 transition-opacity",
            open ? "opacity-100" : "opacity-0",
            "bg-black/40",
          ].join(" ")}
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
                  className={[
                    "dream-btn",
                    "dream-btn--neutral",
                    saving ? "opacity-60 cursor-not-allowed" : "",
                  ].join(" ")}
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
                <div className="mt-2 text-xs text-[var(--muted)]">
                  Keep it short for Phase One. You can add tags later.
                </div>
              </div>

              {recInterim ? (
                <div className="mt-2 text-xs text-[var(--muted)]">
                  <span className="opacity-70">Listening…</span>{" "}
                  <span className="italic">{recInterim}</span>
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
                    onClick={() =>
                      setRecErr("Tip: on iPhone use the 🎤 button on the keyboard for диктовка.")
                    }
                    className={["dream-btn", "dream-btn--neutral"].join(" ")}
                    type="button"
                  >
                    🎙 Record (not supported)
                  </button>
                ) : recStatus === "listening" ? (
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={pauseRecording}
                      className={["dream-btn", "dream-btn--neutral"].join(" ")}
                      type="button"
                    >
                      ⏸ Pause
                    </button>
                    <button
                      onClick={stopRecording}
                      className={["dream-btn", "dream-btn--danger"].join(" ")}
                      type="button"
                    >
                      ⏹ Stop
                    </button>
                  </div>
                ) : recStatus === "paused" ? (
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={resumeRecording}
                      className={["dream-btn", "dream-btn--recording"].join(" ")}
                      type="button"
                    >
                      ▶ Resume
                    </button>
                    <button
                      onClick={stopRecording}
                      className={["dream-btn", "dream-btn--danger"].join(" ")}
                      type="button"
                    >
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
                    className={[
                      "dream-btn",
                      "dream-btn--recording",
                      saving ? "opacity-60 cursor-not-allowed" : "",
                    ].join(" ")}
                    type="button"
                  >
                    🎙 Start
                  </button>
                )}

                <div className="flex gap-2 flex-wrap justify-end">
                  <button
                    onClick={close}
                    disabled={saving}
                    className={[
                      "dream-btn",
                      "dream-btn--neutral",
                      saving ? "opacity-60 cursor-not-allowed" : "",
                    ].join(" ")}
                  >
                    Cancel
                  </button>

                  <button
                    onClick={save}
                    disabled={!canSave}
                    className={[
                      "dream-primary-btn",
                      !canSave ? "opacity-60 cursor-not-allowed" : "",
                    ].join(" ")}
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

      {/* Google-only auth modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--card)] p-6 shadow-2xl border border-[var(--border)]">
            <h2 className="text-xl font-bold mb-2 text-[var(--text)]">
              Sign in required
            </h2>

            <p className="text-sm text-[var(--muted)] mb-6">
              Пожалуйста, войдите через Google, чтобы создавать и сохранять сны.
            </p>


<button
  onClick={async () => {
    try {
      setError(null);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);

      const updatedUser = auth.currentUser;
      setUser(updatedUser);
      setUid(updatedUser?.uid ?? null);

      setShowAuthModal(false);
    } catch (e: any) {
      setError(e?.message ?? "Failed to sign in.");
    }
  }}
  className="w-full py-3 rounded-xl bg-white text-black font-semibold flex items-center justify-center gap-3"
>
  <FcGoogle className="text-xl" />
  <span>Continue with Google</span>
</button>

            <button
              onClick={() => {
                setShowAuthModal(false);
                setError(null);
              }}
              className="w-full mt-3 py-2 text-sm text-[var(--muted)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <BottomNav hidden={open} />
    </main>
  );
}