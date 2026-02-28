"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  collectionGroup,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";

import {
  getDatabase,
  onValue,
  ref as rtdbRef,
  set as rtdbSet,
} from "firebase/database";

import { ensureUserProfileOnSignIn } from "@/lib/auth/ensureUserProfile";
import { auth, firestore } from "@/lib/firebase";

import data from "@emoji-mart/data";
import { init, SearchIndex } from "emoji-mart";

type DreamAdmin = {
  id: string;
  userId: string;

  title?: string;
  text?: string;

  createdAtMs?: number;
  dateKey?: string;
  timeKey?: string;

  shared?: boolean;
  sharedAtMs?: number;

  deleted?: boolean;
  deletedAtMs?: number;

  emojis?: Array<{ id?: string; name?: string; native?: string }>;
};

const ADMIN_UIDS = new Set<string>(["sGbA77TlcsatEMrgEvCv7Shjrj32"]);

type AdminTab = "DREAMS" | "EMOJIS" | "CONFIG";

function clampText(s?: string, n = 180) {
  const t = (s ?? "").trim();
  if (!t) return "";
  return t.length > n ? t.slice(0, n) + "…" : t;
}

function safeDate(ms?: number) {
  if (!ms) return "";
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return "";
  }
}

function pickUserIdFromPath(refPath: string) {
  // users/{uid}/dreams/{dreamId}
  const parts = refPath.split("/");
  const i = parts.indexOf("users");
  if (i >= 0 && parts[i + 1]) return parts[i + 1];
  return "unknown";
}

// ✅ Added iconKey
type EmojiOverride = { name?: string; keywords?: string[]; iconKey?: string };
type OverridesMap = Record<string, EmojiOverride>;

function norm(s: any) {
  return String(s ?? "").toLowerCase().trim();
}

function toNative(r: any) {
  return r?.skins?.[0]?.native || r?.native || "";
}

function uniq(arr: string[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of arr) {
    const v = norm(x);
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

export default function AdminDashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<AdminTab>("DREAMS");

  // DREAMS
  const [items, setItems] = useState<DreamAdmin[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [showDeleted, setShowDeleted] = useState(true);
  const [onlyShared, setOnlyShared] = useState(false);
  const [pageSize, setPageSize] = useState(50);

  // CONFIG (your old JSON editor)
  const [hintsPath, setHintsPath] = useState("/app_config/dreamly/emojiHints/en");
  const [hintsJson, setHintsJson] = useState<string>("{}");
  const [hintsErr, setHintsErr] = useState<string | null>(null);
  const [hintsSaving, setHintsSaving] = useState(false);

  // EMOJIS (overrides editor)
  const overridesPath = "/app_config/dreamly/emojiOverrides/en";
  const [overrides, setOverrides] = useState<OverridesMap>({});
  const overridesRef = useRef<OverridesMap>({});
  const [emojiReady, setEmojiReady] = useState(false);
  const [emojiQuery, setEmojiQuery] = useState("");
  const [emojiLimit, setEmojiLimit] = useState(60);
  const [emojiSavingId, setEmojiSavingId] = useState<string | null>(null);
  const [emojiSaveErr, setEmojiSaveErr] = useState<string | null>(null);

  const isAdmin = !!user?.uid && ADMIN_UIDS.has(user.uid);

  // theme-aware styles via CSS vars
  const card = "rounded-2xl bg-[var(--card)] border border-[var(--border)]";
  const titleText = "text-[var(--text)]";
  const mutedText = "text-[var(--muted)]";

  const pillBase = "h-11 px-5 rounded-full font-semibold transition border";
  const pillSurface =
    "bg-[var(--card)] text-[var(--text)] border border-[var(--border)] hover:opacity-90";
  const pillDisabled = "disabled:opacity-50 disabled:cursor-not-allowed";

  useEffect(() =>
    onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) return;
      ensureUserProfileOnSignIn(u);
    }),
  []);
  useEffect(() => setLoading(false), []);

  // ✅ Live dreams query
  useEffect(() => {
    setErr(null);

    if (!user || !isAdmin) {
      setItems([]);
      return;
    }

    const q = query(
      collectionGroup(firestore, "dreams"),
      orderBy("createdAtMs", "desc"),
      limit(pageSize)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: DreamAdmin[] = snap.docs.map((d) => {
          const data = d.data() as any;
          const refPath = d.ref.path;
          const userId = pickUserIdFromPath(refPath);

          return {
            id: d.id,
            userId,

            title: data.title,
            text: data.text,

            createdAtMs: data.createdAtMs,
            dateKey: data.dateKey,
            timeKey: data.timeKey,

            shared: !!data.shared,
            sharedAtMs: data.sharedAtMs,

            deleted: !!data.deleted,
            deletedAtMs: data.deletedAtMs,

            emojis: Array.isArray(data.emojis) ? data.emojis : [],
          };
        });

        setItems(rows);
      },
      (e) => setErr(e?.message ?? "Failed to load")
    );

    return () => unsub();
  }, [user?.uid, isAdmin, pageSize]);

  // ✅ RTDB: live load config JSON
  useEffect(() => {
    if (!user || !isAdmin) return;
    if (tab !== "CONFIG") return;

    const db = getDatabase();
    const p = rtdbRef(db, hintsPath);

    const unsub = onValue(
      p,
      (snap) => {
        const v = snap.val();
        setHintsJson(JSON.stringify(v ?? {}, null, 2));
        setHintsErr(null);
      },
      (e) => {
        console.warn("RTDB read failed:", e);
        setHintsErr((e as any)?.message ?? "Failed to read config");
      }
    );

    return () => unsub();
  }, [user?.uid, isAdmin, hintsPath, tab]);

  // ✅ RTDB: live load emoji overrides
  useEffect(() => {
    if (!user || !isAdmin) return;
    if (tab !== "EMOJIS") return;

    const db = getDatabase();
    const p = rtdbRef(db, overridesPath);

    const unsub = onValue(
      p,
      (snap) => {
        const v = snap.val();
        const obj: OverridesMap =
          v && typeof v === "object" && !Array.isArray(v) ? v : {};
        overridesRef.current = obj;
        setOverrides(obj);
        setEmojiSaveErr(null);
      },
      (e) => {
        console.warn("RTDB overrides read failed:", e);
        setEmojiSaveErr((e as any)?.message ?? "Failed to read overrides");
      }
    );

    return () => unsub();
  }, [user?.uid, isAdmin, tab]);

  // ✅ init emoji-mart index (client)
  useEffect(() => {
    if (tab !== "EMOJIS") return;
    let alive = true;

    (async () => {
      try {
        await init({ data });
        if (!alive) return;
        setEmojiReady(true);
      } catch (e) {
        console.warn("emoji-mart init failed", e);
        if (!alive) return;
        setEmojiReady(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [tab]);

  const filtered = useMemo(() => {
    let r = items;
    if (!showDeleted) r = r.filter((x) => !x.deleted);
    if (onlyShared) r = r.filter((x) => !!x.shared);
    return r;
  }, [items, showDeleted, onlyShared]);

  async function hideFromShared(d: DreamAdmin) {
    if (!isAdmin) return;
    if (!confirm("Hide this dream from Shared?")) return;

    const ref = doc(firestore, "users", d.userId, "dreams", d.id);
    await updateDoc(ref, { shared: false, sharedAtMs: null });
  }

  async function softDelete(d: DreamAdmin) {
    if (!isAdmin) return;
    if (!confirm("Soft delete this dream?")) return;

    const ref = doc(firestore, "users", d.userId, "dreams", d.id);
    await updateDoc(ref, {
      deleted: true,
      deletedAtMs: Date.now(),
      shared: false,
      sharedAtMs: null,
    });
  }

  async function hardDelete(d: DreamAdmin) {
    if (!isAdmin) return;
    if (!confirm("HARD DELETE? Permanently remove document?")) return;

    const ref = doc(firestore, "users", d.userId, "dreams", d.id);
    await deleteDoc(ref);
  }

  async function saveHints() {
    if (!isAdmin) return;

    setHintsErr(null);

    let obj: any;
    try {
      obj = JSON.parse(hintsJson || "{}");
    } catch {
      setHintsErr("Invalid JSON");
      return;
    }

    if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
      setHintsErr('Config must be a JSON object, e.g. { "floor": "ground" }');
      return;
    }

    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj)) {
      const kk = String(k ?? "").toLowerCase().trim();
      const vv = String(v ?? "").toLowerCase().trim();
      if (!kk || !vv) continue;
      cleaned[kk] = vv;
    }

    setHintsSaving(true);
    try {
      const db = getDatabase();
      await rtdbSet(rtdbRef(db, hintsPath), cleaned);
    } catch (e: any) {
      setHintsErr(e?.message ?? "Failed to save");
    } finally {
      setHintsSaving(false);
    }
  }

  // ---- EMOJIS TAB logic ----
  const [emojiRows, setEmojiRows] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!emojiReady) return;
      const q = norm(emojiQuery);
      if (!q) {
        setEmojiRows([]);
        return;
      }

      try {
        // @ts-ignore
        const res = await (SearchIndex as any).search(q);
        if (cancelled) return;

        const rows = (res ?? []).filter(Boolean).slice(0, emojiLimit);
        setEmojiRows(rows);
      } catch (e) {
        console.warn("emoji search failed", e);
        if (!cancelled) setEmojiRows([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [emojiQuery, emojiLimit, emojiReady]);

  function effectiveName(id?: string, libName?: string) {
    if (!id) return libName || "";
    return overridesRef.current?.[id]?.name || libName || "";
  }

  function effectiveKeywords(id?: string, libKeywords?: string[]) {
    if (!id) return libKeywords ?? [];
    const ov = overridesRef.current?.[id];
    if (ov?.keywords?.length) return ov.keywords;
    return libKeywords ?? [];
  }

  function setOverrideField(id: string, patch: EmojiOverride) {
    setOverrides((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? {}),
        ...patch,
      },
    }));
  }

  async function saveOverride(id: string) {
    if (!isAdmin) return;

    setEmojiSaveErr(null);
    setEmojiSavingId(id);

    try {
      const cur = overridesRef.current?.[id] ?? overrides[id] ?? {};

      const name = String(cur.name ?? "").trim();
      const iconKey = String(cur.iconKey ?? "").trim().toLowerCase();

      // keywords always stored as array of lowercased strings
      const kws = uniq(Array.isArray(cur.keywords) ? cur.keywords : []).slice(0, 50);

      // if everything empty -> delete override node
      const empty = !name && !iconKey && kws.length === 0;

      const value: any = empty
        ? null
        : {
            name: name || null,
            keywords: kws,
            iconKey: iconKey || null,
          };

      const db = getDatabase();
      await rtdbSet(rtdbRef(db, `${overridesPath}/${id}`), value);

      // ✅ sync local state immediately
      setOverrides((prev) => {
        const next = { ...prev };
        if (value === null) delete next[id];
        else {
          next[id] = {
            name: value.name ?? "",
            keywords: Array.isArray(value.keywords) ? value.keywords : [],
            iconKey: value.iconKey ?? "",
          };
        }
        overridesRef.current = next;
        return next;
      });
    } catch (e: any) {
      setEmojiSaveErr(e?.message ?? "Failed to save override");
    } finally {
      setEmojiSavingId(null);
    }
  }

  function copy(text: string) {
    try {
      navigator.clipboard?.writeText(text);
    } catch {}
  }

  if (!loading && !user) {
    return (
      <main className="px-6 py-10 max-w-5xl mx-auto">
        <h1 className={`text-3xl font-semibold ${titleText}`}>Admin dashboard</h1>
        <p className={`mt-3 ${mutedText}`}>Not signed in.</p>
      </main>
    );
  }

  if (!loading && user && !isAdmin) {
    return (
      <main className="px-6 py-10 max-w-5xl mx-auto">
        <h1 className={`text-3xl font-semibold ${titleText}`}>Admin dashboard</h1>
        <p className={`mt-3 ${mutedText}`}>Access denied.</p>
      </main>
    );
  }

  return (
    <main className="px-6 py-10 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className={`text-3xl font-semibold ${titleText}`}>Admin dashboard</h1>
          <div className={`mt-2 text-sm ${mutedText}`}>
            {tab === "DREAMS" ? (
              <>
                All dreams (collectionGroup: <span className="font-mono">dreams</span>)
              </>
            ) : tab === "EMOJIS" ? (
              <>
                Emoji overrides (RTDB: <span className="font-mono">{overridesPath}</span>)
              </>
            ) : (
              <>
                Realtime config (RTDB: <span className="font-mono">{hintsPath}</span>)
              </>
            )}
          </div>
        </div>

        {tab === "CONFIG" ? (
          <button
            onClick={saveHints}
            disabled={hintsSaving}
            className={`${pillBase} ${pillSurface} ${pillDisabled}`}
          >
            {hintsSaving ? "Saving…" : "Save"}
          </button>
        ) : null}
      </div>

      {/* Tabs */}
      <div className="mt-5 inline-flex rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_70%,transparent)] p-1">
        <button
          onClick={() => setTab("DREAMS")}
          className={[
            "px-4 py-2 rounded-full text-sm font-semibold transition",
            tab === "DREAMS"
              ? "bg-[var(--text)] text-[var(--bg)]"
              : "text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--text)_10%,transparent)]",
          ].join(" ")}
        >
          Dreams
        </button>

        <button
          onClick={() => setTab("EMOJIS")}
          className={[
            "px-4 py-2 rounded-full text-sm font-semibold transition",
            tab === "EMOJIS"
              ? "bg-[var(--text)] text-[var(--bg)]"
              : "text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--text)_10%,transparent)]",
          ].join(" ")}
        >
          Emojis
        </button>

        <button
          onClick={() => setTab("CONFIG")}
          className={[
            "px-4 py-2 rounded-full text-sm font-semibold transition",
            tab === "CONFIG"
              ? "bg-[var(--text)] text-[var(--bg)]"
              : "text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--text)_10%,transparent)]",
          ].join(" ")}
        >
          Config
        </button>
      </div>

      {/* DREAMS TAB */}
      {tab === "DREAMS" && (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setOnlyShared((v) => !v)}
              className={`${pillBase} ${pillSurface}`}
            >
              {onlyShared ? "Only Shared: ON" : "Only Shared: OFF"}
            </button>

            <button
              onClick={() => setShowDeleted((v) => !v)}
              className={`${pillBase} ${pillSurface}`}
            >
              {showDeleted ? "Show Deleted: ON" : "Show Deleted: OFF"}
            </button>

            <button
              onClick={() => setPageSize((s) => (s === 50 ? 100 : 50))}
              className={`${pillBase} ${pillSurface}`}
            >
              Page size: {pageSize}
            </button>
          </div>

          {err ? (
            <div className={`${card} mt-6 p-4`}>
              <div className={`font-semibold ${titleText}`}>Error</div>
              <div className={`mt-2 text-sm ${mutedText}`}>{err}</div>
            </div>
          ) : null}

          <div className="mt-6 space-y-3">
            {filtered.map((d) => (
              <div key={`${d.userId}_${d.id}`} className={`${card} p-4`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className={`font-semibold ${titleText} truncate`}>
                      {d.title?.trim() ? d.title : "Untitled dream"}
                    </div>

                    <div className={`mt-1 text-xs ${mutedText} flex flex-wrap gap-x-3 gap-y-1`}>
                      <span>
                        user: <span className="font-mono">{d.userId}</span>
                      </span>
                      <span>
                        id: <span className="font-mono">{d.id}</span>
                      </span>
                      {d.createdAtMs ? <span>{safeDate(d.createdAtMs)}</span> : null}
                      {d.dateKey ? <span>{d.dateKey}</span> : null}
                      {d.timeKey ? <span>{d.timeKey}</span> : null}
                      <span>
                        shared: <b>{d.shared ? "yes" : "no"}</b>
                      </span>
                      <span>
                        deleted: <b>{d.deleted ? "yes" : "no"}</b>
                      </span>
                    </div>

                    {d.emojis?.length ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {d.emojis.slice(0, 12).map((e, i) => (
                          <span
                            key={`${d.id}_e_${i}`}
                            className="text-xs px-2 py-1 rounded-full border border-[var(--border)] bg-[rgba(127,127,127,0.10)]"
                            title={e.name ?? e.id ?? ""}
                          >
                            {e.native ? e.native : e.name ?? e.id ?? "?"}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {d.text ? (
                      <div className={`mt-3 text-sm ${mutedText}`}>{clampText(d.text, 240)}</div>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => hideFromShared(d)}
                      disabled={!d.shared}
                      className={`${pillBase} ${pillSurface} ${pillDisabled}`}
                    >
                      Hide from Shared
                    </button>

                    <button onClick={() => softDelete(d)} className={`${pillBase} ${pillSurface}`}>
                      Soft delete
                    </button>

                    <button
                      onClick={() => hardDelete(d)}
                      className={`${pillBase} bg-red-600 text-white border-transparent hover:bg-red-500`}
                    >
                      Hard delete
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {!filtered.length ? (
              <div className={`${card} p-6 text-center`}>
                <div className={`text-sm ${mutedText}`}>No dreams found for current filters.</div>
              </div>
            ) : null}
          </div>

          <div className="mt-8 flex justify-center">
            <button
              onClick={() => setPageSize((s) => Math.min(300, s + 50))}
              className={`${pillBase} ${pillSurface}`}
            >
              Load more
            </button>
          </div>
        </>
      )}

      {/* EMOJIS TAB */}
      {tab === "EMOJIS" && (
        <div className="mt-6 space-y-4">
          <div className={`${card} p-4`}>
            <div className={`font-semibold ${titleText}`}>Emoji library</div>
            <div className={`mt-1 text-sm ${mutedText}`}>
              Search by id, name, keyword, or the emoji itself. Override name/keywords (and iconKey)
              to control what the AI picks next time.
            </div>

            <div className="mt-4 flex flex-wrap gap-2 items-center">
              <input
                value={emojiQuery}
                onChange={(e) => setEmojiQuery(e.target.value)}
                placeholder='Try: "umbrella" or "glass" or "mag"'
                className="flex-1 min-w-[240px] rounded-2xl px-4 py-3 bg-[var(--bg)] text-[var(--text)] border border-[var(--border)] outline-none"
              />

              <button
                onClick={() => setEmojiLimit((n) => (n === 60 ? 150 : 60))}
                className={`${pillBase} ${pillSurface}`}
              >
                Limit: {emojiLimit}
              </button>

              <div className={`text-sm ${mutedText}`}>
                {emojiReady ? `${emojiRows.length} results` : "Loading emoji index…"}
              </div>
            </div>

            {emojiSaveErr ? (
              <div className="mt-3 text-sm text-red-200 bg-red-600/15 border border-red-500/30 rounded-xl px-4 py-3">
                {emojiSaveErr}
              </div>
            ) : null}
          </div>

          {emojiQuery.trim() && (
            <div className={`${card} overflow-hidden`}>
              {emojiRows.map((r, idx) => {
                const id = String(r?.id ?? "");
                const libName = String(r?.name ?? "");
                const libKeywords: string[] = Array.isArray(r?.keywords) ? r.keywords : [];
                const native = toNative(r);

                const ov = overrides[id] ?? {};
                const ovName = String(ov.name ?? "");
                const ovKeywords = Array.isArray(ov.keywords) ? ov.keywords.join(", ") : "";
                const ovIconKey = String(ov.iconKey ?? "");

                const effName = effectiveName(id, libName);
                const effKeywords = effectiveKeywords(id, libKeywords);

                return (
                  <div
                    key={`${id}_${idx}`}
                    className="p-4 border-b border-[var(--border)] last:border-b-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl leading-none">{native}</div>
                          <div className="min-w-0">
                            <div className={`font-semibold ${titleText} truncate`}>
                              {effName || libName || id}
                            </div>
                            <div className={`text-xs ${mutedText} flex flex-wrap gap-x-3 gap-y-1`}>
                              <span className="font-mono">{id}</span>
                              {libName ? <span>lib: {libName}</span> : null}
                              {effKeywords?.length ? (
                                <span>
                                  keywords: {effKeywords.slice(0, 10).join(", ")}
                                  {effKeywords.length > 10 ? "…" : ""}
                                </span>
                              ) : null}
                              {ovIconKey ? (
                                <span>
                                  iconKey: <span className="font-mono">{ovIconKey}</span>
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        {/* ✅ 3 fields now */}
                        <div className="mt-3 grid gap-2 sm:grid-cols-3">
                          <div>
                            <div className={`text-xs ${mutedText} mb-1`}>
                              Override icon key (Dream icons)
                            </div>
                            <input
                              value={ovIconKey}
                              onChange={(e) =>
                                setOverrideField(id, {
                                  iconKey: e.target.value.trim().toLowerCase(),
                                })
                              }
                              placeholder='e.g. "bell"'
                              className="w-full rounded-xl px-3 py-2 bg-[var(--bg)] text-[var(--text)] border border-[var(--border)] outline-none"
                            />
                          </div>

                          <div>
                            <div className={`text-xs ${mutedText} mb-1`}>Override name (optional)</div>
                            <input
                              value={ovName}
                              onChange={(e) => setOverrideField(id, { name: e.target.value })}
                              placeholder="e.g. Beach umbrella"
                              className="w-full rounded-xl px-3 py-2 bg-[var(--bg)] text-[var(--text)] border border-[var(--border)] outline-none"
                            />
                          </div>

                          <div>
                            <div className={`text-xs ${mutedText} mb-1`}>
                              Override keywords (comma separated)
                            </div>
                            <input
                              value={ovKeywords}
                              onChange={(e) =>
                                setOverrideField(id, {
                                  keywords: e.target.value
                                    .split(",")
                                    .map((x) => x.trim().toLowerCase())
                                    .filter(Boolean),
                                })
                              }
                              placeholder="e.g. beach, sun, shade, vacation"
                              className="w-full rounded-xl px-3 py-2 bg-[var(--bg)] text-[var(--text)] border border-[var(--border)] outline-none"
                            />
                          </div>
                        </div>

                        <div className={`mt-2 text-xs ${mutedText}`}>
                          Tip: to “remove” a wrong emoji from being chosen, delete any relevant keywords
                          (or replace with correct ones). You can also set iconKey if you want to map this
                          emoji concept to your Dream icons dictionary.
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 shrink-0">
                        <button onClick={() => copy(id)} className={`${pillBase} ${pillSurface}`}>
                          Copy id
                        </button>

                        <button
                          onClick={() => saveOverride(id)}
                          disabled={emojiSavingId === id}
                          className={`${pillBase} ${pillSurface} ${pillDisabled}`}
                        >
                          {emojiSavingId === id ? "Saving…" : "Save"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {!emojiRows.length ? (
                <div className="p-6 text-center">
                  <div className={`text-sm ${mutedText}`}>No results.</div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* CONFIG TAB */}
      {tab === "CONFIG" && (
        <div className="mt-6 space-y-4">
          <div className={`${card} p-4`}>
            <div className={`font-semibold ${titleText}`}>Emoji hints (Realtime Database)</div>
            <div className={`mt-1 text-sm ${mutedText}`}>
              Edit mappings like <span className="font-mono">floor → ground</span>.
            </div>

            <div className="mt-4 flex flex-wrap gap-2 items-center">
              <span className={`text-xs ${mutedText}`}>Path</span>
              <input
                value={hintsPath}
                onChange={(e) => setHintsPath(e.target.value)}
                className="flex-1 min-w-[240px] rounded-xl px-3 py-2 bg-[var(--card)] text-[var(--text)] border border-[var(--border)] outline-none"
              />
              <button
                onClick={saveHints}
                disabled={hintsSaving}
                className={`${pillBase} ${pillSurface} ${pillDisabled}`}
              >
                {hintsSaving ? "Saving…" : "Save"}
              </button>
            </div>

            {hintsErr ? (
              <div className="mt-3 text-sm text-red-200 bg-red-600/15 border border-red-500/30 rounded-xl px-4 py-3">
                {hintsErr}
              </div>
            ) : null}

            <textarea
              value={hintsJson}
              onChange={(e) => setHintsJson(e.target.value)}
              rows={14}
              spellCheck={false}
              className="mt-4 w-full font-mono text-xs rounded-2xl p-4 bg-[var(--bg)] text-[var(--text)] border border-[var(--border)] outline-none focus:border-[color-mix(in_srgb,var(--text)_22%,var(--border))]"
            />

            <div className={`mt-3 text-xs ${mutedText}`}>
              Example: <span className="font-mono">{`{ "floor": "ground", "wood": "tree" }`}</span>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}