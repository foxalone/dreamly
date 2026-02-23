"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  collectionGroup,
  deleteDoc,
  doc,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  updateDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import { auth, firestore } from "@/lib/firebase";

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

const ADMIN_UIDS = new Set<string>([
  // ✅ добавь сюда UID админов
   "sGbA77TlcsatEMrgEvCv7Shjrj32",
]);

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
  // ожидаем users/{uid}/dreams/{dreamId}
  const parts = refPath.split("/");
  const i = parts.indexOf("users");
  if (i >= 0 && parts[i + 1]) return parts[i + 1];
  return "unknown";
}

export default function AdminDashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [items, setItems] = useState<DreamAdmin[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [showDeleted, setShowDeleted] = useState(true);
  const [onlyShared, setOnlyShared] = useState(false);

  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [pageSize, setPageSize] = useState(50);

  const isAdmin = !!user?.uid && ADMIN_UIDS.has(user.uid);

  // theme-aware styles via CSS vars
  const card = "rounded-2xl bg-[var(--card)] border border-[var(--border)]";
  const titleText = "text-[var(--text)]";
  const mutedText = "text-[var(--muted)]";

  const pillBase = "h-11 px-5 rounded-full font-semibold transition border";
  const pillSurface =
    "bg-[var(--card)] text-[var(--text)] border-[var(--border)] hover:opacity-90";
  const pillDisabled = "disabled:opacity-50 disabled:cursor-not-allowed";

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u)), []);

  useEffect(() => {
    setLoading(false);
  }, []);

  // live query: first page (или с курсором для следующей страницы)
  useEffect(() => {
    setErr(null);

    if (!user) {
      setItems([]);
      return;
    }
    if (!isAdmin) {
      setItems([]);
      return;
    }

    // базовый запрос по всем dreams
    // let q = query(
    //   collectionGroup(firestore, "dreams"),
    //   orderBy("createdAtMs", "desc"),
    //   limit(pageSize)
    // );

    let q = query(
  collectionGroup(firestore, "dreams"),
  limit(pageSize)
);

    if (cursor) {
      q = query(
        collectionGroup(firestore, "dreams"),
        orderBy("createdAtMs", "desc"),
        startAfter(cursor),
        limit(pageSize)
      );
    }

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
        // курсор на последнем документе страницы
        setCursor(snap.docs.length ? snap.docs[snap.docs.length - 1] : cursor);
      },
      (e) => setErr(e?.message ?? "Failed to load")
    );

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, isAdmin, pageSize, cursor === null]); // cursor===null -> чтобы авто-рефрешить только первую страницу

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
    await updateDoc(ref, {
      shared: false,
      sharedAtMs: null,
    });
  }

  async function softDelete(d: DreamAdmin) {
    if (!isAdmin) return;
    if (!confirm("Soft delete this dream? (It will stay in DB with deleted=true)")) return;

    const ref = doc(firestore, "users", d.userId, "dreams", d.id);
    await updateDoc(ref, {
      deleted: true,
      deletedAtMs: Date.now(),
      // на всякий случай: скрываем из Shared
      shared: false,
      sharedAtMs: null,
    });
  }

  async function hardDelete(d: DreamAdmin) {
    if (!isAdmin) return;
    if (!confirm("HARD DELETE? This will permanently remove the document from DB.")) return;

    const ref = doc(firestore, "users", d.userId, "dreams", d.id);
    await deleteDoc(ref);
  }

  function resetToFirstPage() {
    // простая перезагрузка первой страницы:
    // сброс курсора + очистка items — onSnapshot заново подхватит
    setItems([]);
    setCursor(null);
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
            All dreams (collectionGroup: <span className="font-mono">dreams</span>)
          </div>
        </div>

        <button onClick={resetToFirstPage} className={`${pillBase} ${pillSurface}`}>
          Refresh
        </button>
      </div>

      {/* Filters */}
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

      {/* List */}
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
                  <div className={`mt-3 text-sm ${mutedText}`}>
                    {clampText(d.text, 240)}
                  </div>
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

                <button
                  onClick={() => softDelete(d)}
                  className={`${pillBase} ${pillSurface}`}
                >
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

      {/* Pagination: next page */}
      <div className="mt-8 flex justify-center">
        <button
          onClick={() => {
            // “Следующая страница”: делаем отдельный one-shot onSnapshot сложно,
            // поэтому проще: переключаемся на "cursor mode" через startAfter.
            // Для UX: сбрасываем items, оставляем cursor как есть.
            // Тут делаем: items очистить, но cursor оставить — следующий запрос стартанет после курсора.
            setItems([]);
            // курсор уже стоит на конце текущей страницы
            // чтобы эффект отработал, используем хитрость: resetToFirstPage / cursor===null в deps выше.
            // Поэтому тут просто перезагрузим страницу через location:
            // но без лишнего — делаем ручной способ:
            // 1) оставляем cursor
            // 2) запускаем отдельную подписку "next page" — усложнение
            // ✅ проще: увеличиваем pageSize и показываем больше
            setPageSize((s) => Math.min(300, s + 50));
          }}
          className={`${pillBase} ${pillSurface}`}
        >
          Load more
        </button>
      </div>
    </main>
  );
}