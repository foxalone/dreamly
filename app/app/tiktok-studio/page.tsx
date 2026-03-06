"use client";

import BottomNav from "../BottomNav";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, firestore } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import data from "@emoji-mart/data";
import { init, SearchIndex } from "emoji-mart";

import { getDatabase, ref as rtdbRef, onValue, off } from "firebase/database";

import { pickDreamIconsEn, DREAM_ICONS_EN } from "@/lib/dream-icons/dreamIcons.en";

type DreamIconKey = keyof typeof DREAM_ICONS_EN;
type DreamEmoji = { native: string; name?: string; id?: string };

type CityPick = {
  cityId: string;
  label: string;
  city?: string;
  country?: string;
  admin1?: string;
  lat?: number | null;
  lng?: number | null;
};

type Step = "idle" | "saved" | "visuals" | "analyzed" | "shared";

function cn(...a: (string | false | null | undefined)[]) {
  return a.filter(Boolean).join(" ");
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

function normalizeForIconsEn(input: string) {
  return (input ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
}

function desiredCountsFromText(text: string) {
  const wc = (text ?? "").trim().split(/\s+/).filter(Boolean).length;
  const cc = (text ?? "").trim().length;
  if (wc <= 12 || cc <= 80) return { roots: 2, emojis: 1, icons: 1 };
  if (wc <= 25 || cc <= 160) return { roots: 3, emojis: 2, icons: 2 };
  if (wc <= 55 || cc <= 320) return { roots: 5, emojis: 4, icons: 3 };
  return { roots: 6, emojis: 5, icons: 4 };
}

// ------------------------
// Emoji overrides (RTDB)
// ------------------------
type EmojiOverride = { name?: string; keywords?: string[] };
type OverridesMap = Record<string, EmojiOverride>;
let EMOJI_OVERRIDES: OverridesMap = {};

function norm(s: any) {
  return String(s ?? "").toLowerCase().trim();
}
function toNative(r: any) {
  return r?.skins?.[0]?.native || r?.native || "";
}

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
// emoji scoring
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

const STOP = new Set([
  "i", "me", "my", "we", "you", "he", "she", "it", "they",
  "a", "an", "the", "and", "or", "but",
  "was", "were", "am", "is", "are", "be", "been",
  "to", "of", "in", "on", "at", "for", "with", "from", "into", "over", "under",
  "that", "this", "there", "here", "then",
  "dream", "dreamed", "dreaming",
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

  const tokens = (lang ?? "en") === "en"
    ? tokenizeEn(q)
    : q.split(/\s+/).filter(Boolean).slice(0, 6);

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

export default function TikTokStudioPage() {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [text, setText] = useState("");
  const [dreamId, setDreamId] = useState<string | null>(null);

  const [city, setCity] = useState<CityPick | null>(null);

  const [roots, setRoots] = useState<string[]>([]);
  const [rootsEn, setRootsEn] = useState<string[]>([]);
  const [iconsEn, setIconsEn] = useState<DreamIconKey[]>([]);
  const [emojis, setEmojis] = useState<DreamEmoji[]>([]);

  const [analysisText, setAnalysisText] = useState<string>("");
  const [step, setStep] = useState<Step>("idle");

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [iconsGenerated, setIconsGenerated] = useState(false);

  // City search
  const [cityQ, setCityQ] = useState("");
  const [cityItems, setCityItems] = useState<CityPick[]>([]);
  const [cityOpen, setCityOpen] = useState(false);
  const cityTimer = useRef<any>(null);

  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const MAX_DREAM_CHARS = 2000;

  const hintsRef = useRef<Record<string, string>>({});

  // RTDB emojiHints
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

  // RTDB emojiOverrides
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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUid(u?.uid ?? null);
      console.log("AUTH UID:", u?.uid);

      if (!u) {
        setIsAdmin(false);
        setReady(true);
        return;
      }

      try {
        // можно оставить твой жёсткий uid
        setIsAdmin(u.uid === "sGbA77TlcsatEMrgEvCv7Shjrj32");
        // либо заменить на firestore-check:
        // const snap = await getDoc(doc(firestore, "users", u.uid));
        // setIsAdmin(snap.exists() ? (snap.data() as any)?.isAdmin === true : false);
      } catch {
        setIsAdmin(false);
      } finally {
        setReady(true);
      }
    });

    return () => unsub();
  }, []);

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

  function normalizeRootForEmojiLive(root: string, lang?: string) {
    const s = (root ?? "").trim();
    if (!s) return "";
    const lower = s.toLowerCase().trim();

    const hints = hintsRef.current || {};
    const mapped = hints[lower];
    if (mapped) return mapped;

    return textForIconPicker(s, lang);
  }

  async function idToken() {
    const u = auth.currentUser;
    if (!u) throw new Error("Not signed in");
    return await u.getIdToken();
  }

  async function apiGet(path: string) {
    const token = await idToken();
    const r = await fetch(path, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j?.error ?? "Request failed");
    return j;
  }

  async function apiPost(path: string, body: any) {
    const token = await idToken();
    const r = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body ?? {}),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j?.error ?? "Request failed");
    return j;
  }
useEffect(() => {
  const q = cityQ.trim();
  if (!q) {
    setCityItems([]);
    return;
  }

  if (cityTimer.current) {
    clearTimeout(cityTimer.current);
  }

  cityTimer.current = setTimeout(async () => {
    try {
      const j = await apiGet(`/api/admin/tiktok/city-search?q=${encodeURIComponent(q)}`);
      setCityItems(Array.isArray(j?.items) ? j.items : []);
    } catch {
      setCityItems([]);
    }
  }, 250);

  return () => {
    if (cityTimer.current) {
      clearTimeout(cityTimer.current);
    }
  };
}, [cityQ]);

  const canSave = useMemo(() => {
    const t = text.trim();
    return !!t && t.length <= MAX_DREAM_CHARS && !!city?.cityId && !busy;
  }, [text, city, busy]);

  function resetDraft() {
    setText("");
    setDreamId(null);
    setRoots([]);
    setRootsEn([]);
    setIconsEn([]);
    setEmojis([]);
    setAnalysisText("");
    setStep("idle");
    setError(null);
    setIconsGenerated(false);

    setCity(null);
    setCityQ("");
    setCityItems([]);
    setCityOpen(false);

    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function saveToSeed() {
    const t = text.trim();
    if (!t) return;

    if (!city?.cityId) {
      setError("Выбери город (важно для карты).");
      return;
    }

    if (t.length > MAX_DREAM_CHARS) {
      setError(`Слишком длинно. Максимум ${MAX_DREAM_CHARS} символов.`);
      return;
    }

    setError(null);
    setBusy("save");
    setIconsGenerated(false);

    try {
      const j = await apiPost("/api/admin/tiktok/save", { text: t, city });
      const id = String(j?.dreamId ?? "").trim();
      if (!id) throw new Error("No dreamId returned");

      setDreamId(id);
      setStep("saved");

      // сразу генерируем иконки автоматически
      await generateVisuals(id);
    } catch (e: any) {
      setError(e?.message ?? "Save failed");
    } finally {
      setBusy(null);
    }
  }

  async function generateVisuals(idArg?: string) {
    const id = idArg || dreamId;
    const t = text.trim();
    if (!id || !t) return;

    setError(null);
    setBusy("visuals");

    function filterIconsEn(keys: DreamIconKey[], max: number) {
      const out: DreamIconKey[] = [];
      for (const k of keys ?? []) {
        const icon = (DREAM_ICONS_EN as any)?.[k];
        const glyph = icon?.emoji ?? icon?.native;
        if (!glyph) continue;
        out.push(k);
        if (out.length >= max) break;
      }
      return out;
    }

    try {
      const res = await fetch("/api/dreams/rootwords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t }),
      });

      const data2 = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data2?.error ?? "rootwords failed");

      const counts = desiredCountsFromText(t);

      const rootsArr = Array.isArray(data2?.roots) ? data2.roots : [];
      const rootsEnArr = Array.isArray(data2?.rootsEn) ? data2.rootsEn : rootsArr;

      const rootsMajor = rootsArr
        .slice(0, counts.roots)
        .map((x: any) => String(x ?? "").trim())
        .filter(Boolean);

      const rootsEnMajor = rootsEnArr
        .slice(0, counts.roots)
        .map((x: any) => String(x ?? "").trim())
        .filter(Boolean);

      if (!rootsMajor.length || !rootsEnMajor.length) {
        throw new Error("Нет root-слов — добавь чуть больше деталей.");
      }

      const normalizedEn = normalizeForIconsEn(rootsEnMajor.join(" "));
      const iconsEnRaw = pickDreamIconsEn(normalizedEn, counts.icons) as DreamIconKey[];
      const iconsFinal = filterIconsEn(iconsEnRaw ?? [], counts.icons);

      const picked = await Promise.all(
        rootsEnMajor.map((r: string) =>
          pickEmojiForOneRoot_AI(normalizeRootForEmojiLive(r, "en"), "en")
        )
      );
      const emojisFinal = (picked.filter(Boolean) as DreamEmoji[]).slice(0, counts.emojis);

      setRoots(rootsMajor);
      setRootsEn(rootsEnMajor);
      setIconsEn(iconsFinal);
      setEmojis(emojisFinal);
      setStep("visuals");
      setIconsGenerated(true);

      if (!iconsFinal.length && !emojisFinal.length) {
        setError("Не удалось подобрать ни иконки, ни эмодзи.");
      }

      await apiPost("/api/admin/tiktok/update", {
        dreamId: id,
        city,
        roots: rootsMajor,
        rootsEn: rootsEnMajor,
        rootsLang: data2?.lang ?? null,
        iconsEn: iconsFinal,
        emojis: emojisFinal,
        ingestMap: true,
      });
    } catch (e: any) {
      console.error("[visuals] error:", e);
      setError(e?.message ?? "Generate visuals failed");
      setIconsGenerated(false);
    } finally {
      setBusy(null);
    }
  }

  async function analyze() {
    const id = dreamId;
    const t = text.trim();
    if (!id || !t) return;

    setError(null);
    setBusy("analyze");
    try {
      const res = await fetch("/api/dreams/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t, lang: guessLang(t) }),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error ?? "Analyze failed");

      const a = String(j?.analysis ?? "").trim();
      if (!a) throw new Error("Пустой анализ от AI");

      setAnalysisText(a);
      setStep("analyzed");

      await apiPost("/api/admin/tiktok/update", {
        dreamId: id,
        analysisText: a,
        analysisModel: j?.model ?? null,
      });
    } catch (e: any) {
      setError(e?.message ?? "Analyze failed");
    } finally {
      setBusy(null);
    }
  }

  async function share() {
    const id = dreamId;
    if (!id) return;

    setError(null);
    setBusy("share");
    try {
      await apiPost("/api/admin/tiktok/share", { dreamId: id });
      setStep("shared");
    } catch (e: any) {
      setError(e?.message ?? "Share failed");
    } finally {
      setBusy(null);
    }
  }

  async function del() {
    const id = dreamId;
    if (!id) return;

    if (!confirm("Удалить этот сон?")) return;

    setError(null);
    setBusy("delete");
    try {
      await apiPost("/api/admin/tiktok/delete", { dreamId: id });
      setError("Deleted ✅ (seed + shared)");
    } catch (e: any) {
      setError(e?.message ?? "Delete failed");
    } finally {
      setBusy(null);
    }
  }

  if (!ready) {
    return (
      <main className="min-h-screen px-5 py-10 max-w-3xl mx-auto text-[var(--muted)]">
        Loading…
      </main>
    );
  }

  if (!uid) {
    return (
      <main className="min-h-screen px-5 py-10 max-w-3xl mx-auto">
        <div className="rounded-3xl bg-[var(--card)] border border-[var(--border)] p-6">
          <div className="text-lg font-semibold text-[var(--text)]">Нужно войти.</div>
          <div className="mt-2 text-[var(--muted)]">Открой Admin Dashboard и авторизуйся.</div>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen px-5 py-10 max-w-3xl mx-auto">
        <div className="rounded-3xl bg-[var(--card)] border border-[var(--border)] p-6">
          <div className="text-lg font-semibold text-[var(--text)]">Доступ запрещён.</div>
          <div className="mt-2 text-[var(--muted)]">Эта страница только для админов.</div>
        </div>
      </main>
    );
  }

  const iconsPreview = (iconsEn ?? []).slice(0, 8).map((k) => {
    const icon = (DREAM_ICONS_EN as any)?.[k];
    const glyph = icon?.emoji ?? icon?.native ?? "⬤";

    return {
      k,
      glyph,
      label: icon?.label || icon?.name || String(k),
      found: !!icon,
    };
  });

  return (
    <main className="relative min-h-screen px-5 sm:px-6 py-8 sm:py-10 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold text-[var(--text)]">TikTok Studio</h1>
        
        </div>

        <button
          onClick={resetDraft}
          className="px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--text)] font-semibold hover:opacity-90"
        >
          Add Dream
        </button>
      </div>

      {error ? (
        <div className="mt-5 text-sm text-red-200 bg-red-600/15 border border-red-500/30 rounded-xl px-4 py-3">
          {error}
        </div>
      ) : null}

      <div className="mt-7 rounded-3xl bg-[var(--card)] border border-[var(--border)] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-[var(--text)]">City</div>
          </div>

          {city?.label ? (
            <span className="text-xs px-3 py-1 rounded-full border border-[var(--border)] text-[var(--muted)]">
              ✅ {city.label}
            </span>
          ) : (
            <span className="text-xs px-3 py-1 rounded-full border border-[var(--border)] text-[var(--muted)]">
              not selected
            </span>
          )}
        </div>

        <div className="mt-3 relative">
          <input
            value={cityQ}
            onChange={(e) => {
              setCityQ(e.target.value);
              setCityOpen(true);
            }}
            onFocus={() => setCityOpen(true)}
            placeholder="Start typing: New York, Paris, Tokyo…"
            className="w-full rounded-2xl px-4 py-3 bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] outline-none focus:border-[color-mix(in_srgb,var(--text)_22%,var(--border))]"
          />

          {cityOpen && cityItems.length > 0 ? (
            <div className="absolute z-20 mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-xl overflow-hidden">
              {cityItems.map((c) => (
                <button
                  key={c.cityId + c.label}
                  onClick={() => {
                    setCity(c);
                    setCityOpen(false);
                    setCityQ(c.label);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-[color-mix(in_srgb,var(--text)_8%,transparent)]"
                >
                  <div className="text-sm text-[var(--text)] font-semibold">{c.label}</div>
                  <div className="text-xs text-[var(--muted)]">{c.cityId}</div>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 rounded-3xl bg-[var(--card)] border border-[var(--border)] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-[var(--text)]">Dream text</div>
          </div>

          <div className="text-xs text-[var(--muted)]">
            {text.length}/{MAX_DREAM_CHARS} • {guessLang(text)}
          </div>
        </div>

        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => {
            const raw = e.target.value ?? "";
            const v = raw.length > MAX_DREAM_CHARS ? raw.slice(0, MAX_DREAM_CHARS) : raw;
            setText(v);
          }}
          rows={6}
          placeholder="Type a dream…"
          className="mt-3 w-full resize-none rounded-2xl p-4 bg-[var(--bg)] text-[var(--text)] border border-[var(--border)] outline-none focus:border-[color-mix(in_srgb,var(--text)_22%,var(--border))]"
        />

        <div className="mt-3 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
          

            {roots?.length ? (
              <div className="flex flex-wrap gap-2">
                {roots.slice(0, 6).map((w, i) => (
                  <span
                    key={w + i}
                    className="px-2 py-1 rounded-full border border-[var(--border)] text-xs text-[var(--muted)]"
                  >
                    {w}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

       
        </div>

        {(emojis ?? []).length ? (
          <div className="mt-2 inline-flex items-center gap-2 text-[22px] leading-none">
            {emojis.slice(0, 6).map((em, i) => (
              <span
                key={`${em.native}:${i}`}
                title={em.name || em.id || "emoji"}
                className="cursor-help"
              >
                {em.native}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            onClick={saveToSeed}
            disabled={!canSave}
            className={cn(
              "px-5 py-3 rounded-2xl font-semibold border border-[var(--border)]",
              canSave ? "bg-[var(--text)] text-[var(--bg)] hover:opacity-90" : "opacity-60 cursor-not-allowed"
            )}
          >
            {busy === "save" || busy === "visuals" ? "Saving…" : "Save (seed)"}
          </button>

          <button
            disabled
            className={cn(
              "px-5 py-3 rounded-2xl font-semibold border border-[var(--border)]",
              iconsGenerated
                ? "bg-[var(--bg)] text-[var(--muted)] opacity-70 cursor-not-allowed"
                : "bg-[var(--card)] text-[var(--muted)] opacity-60 cursor-not-allowed"
            )}
          >
            {busy === "visuals" ? "Generating…" : iconsGenerated ? "Icons generated" : "Auto after save"}
          </button>

          <button
            onClick={analyze}
            disabled={!dreamId || !!busy}
            className={cn(
              "px-5 py-3 rounded-2xl font-semibold border border-[var(--border)] bg-[var(--card)] text-[var(--text)] hover:opacity-90",
              (!dreamId || !!busy) && "opacity-60 cursor-not-allowed"
            )}
          >
            {busy === "analyze" ? "Analyzing…" : "Analyze"}
          </button>

          <button
            onClick={share}
            disabled={!dreamId || !!busy}
            className={cn(
              "px-5 py-3 rounded-2xl font-semibold border border-[var(--border)] bg-[var(--card)] text-[var(--text)] hover:opacity-90",
              (!dreamId || !!busy) && "opacity-60 cursor-not-allowed"
            )}
          >
            {busy === "share" ? "Sharing…" : "Share"}
          </button>

          <button
            onClick={del}
            disabled={!dreamId || !!busy}
            className={cn(
              "px-5 py-3 rounded-2xl font-semibold border border-red-500/40 text-red-200 bg-red-600/10 hover:bg-red-600/15",
              (!dreamId || !!busy) && "opacity-60 cursor-not-allowed"
            )}
          >
            {busy === "delete" ? "Deleting…" : "Delete"}
          </button>

        </div>
      </div>

      <div className="mt-4 rounded-3xl bg-[var(--card)] border border-[var(--border)] p-5">
        <div className="text-sm font-semibold text-[var(--text)]">Analysis</div>
        <div className="mt-3 text-sm text-[var(--text)] whitespace-pre-wrap break-words leading-relaxed">
          {analysisText.trim() ? (
            analysisText
          ) : (
            <span className="text-[var(--muted)]">No analysis yet.</span>
          )}
        </div>
      </div>

      <BottomNav />
    </main>
  );
}