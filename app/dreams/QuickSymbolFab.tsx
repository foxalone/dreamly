"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, MoonStar, X } from "lucide-react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import { auth, firestore } from "@/lib/firebase";
import { ensureUserProfileOnSignIn } from "@/lib/auth/ensureUserProfile";
import { QUICK_SYMBOL_MAX_WORDS, countWords } from "@/lib/quickSymbol";

const PENDING_KEY = "dreamly:quickSymbolPending";

type QuickResult = {
  matched: boolean;
  cost: number;
  answer: string;
  href: string | null;
  match?: {
    slug: string;
    title: string;
    icon: string;
    shortMeaning: string;
  } | null;
};

type PendingPayload = {
  query: string;
};

function toDateKeyLocal(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toTimeKeyLocal(d: Date) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mi}`;
}

function makeTitle(text: string) {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= 48) return t;
  return `${t.slice(0, 45).trim()}…`;
}

function readPending(): PendingPayload | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingPayload;
    const q = String(parsed?.query ?? "").trim();
    return q ? { query: q } : null;
  } catch {
    return null;
  }
}

function writePending(query: string) {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ query }));
  } catch {
    // ignore
  }
}

function clearPending() {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // ignore
  }
}

export default function QuickSymbolFab() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuickResult | null>(null);
  const resumeStarted = useRef(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
      if (u) ensureUserProfileOnSignIn(u);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function saveToDiary(params: {
    query: string;
    answer: string;
    matched: boolean;
    slug: string | null;
    cost: number;
  }) {
    const u = auth.currentUser;
    if (!u) return;

    const now = new Date();
    await addDoc(collection(firestore, "users", u.uid, "dreams"), {
      uid: u.uid,
      text: params.query,
      title: makeTitle(params.query),
      summary: params.answer,
      analysisText: params.answer,
      analysisAtMs: Date.now(),
      analysisModel: params.matched ? "dictionary" : "gpt-5-nano",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdAtMs: Date.now(),
      dateKey: toDateKeyLocal(now),
      timeKey: toTimeKeyLocal(now),
      tzOffsetMin: now.getTimezoneOffset(),
      wordCount: countWords(params.query),
      charCount: params.query.length,
      tags: [],
      source: "dreamer",
      sourceType: "dream",
      deleted: false,
      emojis: [{ native: "🌙", name: "dreamer", id: "dreamer" }],
      iconsEn: [],
      shared: false,
      sharedAtMs: null,
      roots: [],
      rootsEn: [],
      rootsTop: [],
      rootsLang: null,
      quickSymbolMatched: params.matched,
      quickSymbolSlug: params.slug,
      quickSymbolCost: params.cost,
      ownerUid: u.uid,
      authorName: (u.displayName ?? "").trim() || null,
      authorEmail: (u.email ?? "").trim() || null,
    });
  }

  async function runLookup(rawQuery: string, currentUser: User) {
    const q = rawQuery.trim();
    setError(null);
    setResult(null);

    if (!q) {
      setError("Type a short dream symbol.");
      return;
    }
    if (countWords(q) > QUICK_SYMBOL_MAX_WORDS) {
      setError(`Use up to ${QUICK_SYMBOL_MAX_WORDS} words.`);
      return;
    }

    setBusy(true);
    try {
      const idToken = await currentUser.getIdToken();
      const res = await fetch("/api/dreams/quick-symbol", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, idToken }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data?.code === "AUTH_REQUIRED") {
          goToSignIn(q);
          return;
        }
        if (data?.code === "INSUFFICIENT_CREDITS") {
          setError("Not enough credits.");
          router.push("/app/upgrade");
          return;
        }
        throw new Error(data?.error ?? "Quick symbol failed");
      }

      const next: QuickResult = {
        matched: !!data.matched,
        cost: Number(data.cost ?? 0) || 0,
        answer: String(data.answer ?? "").trim(),
        href: data.href ? String(data.href) : null,
        match: data.match ?? null,
      };
      setResult(next);

      try {
        await saveToDiary({
          query: q,
          answer: next.answer,
          matched: next.matched,
          slug: next.match?.slug ?? null,
          cost: next.cost,
        });
      } catch (err) {
        console.warn("quick symbol diary save failed", err);
      }
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function goToSignIn(pendingQuery: string) {
    writePending(pendingQuery);
    const returnTo = `${pathname || "/dreams"}${typeof window !== "undefined" ? window.location.search : ""}`;
    router.push(`/signin?next=${encodeURIComponent(returnTo)}`);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    const q = query.trim();
    if (!q) {
      setError("Type a short dream symbol.");
      return;
    }
    if (countWords(q) > QUICK_SYMBOL_MAX_WORDS) {
      setError(`Use up to ${QUICK_SYMBOL_MAX_WORDS} words.`);
      return;
    }

    if (!user) {
      goToSignIn(q);
      return;
    }

    await runLookup(q, user);
  }

  // After sign-in return: restore query and auto-fetch answer
  useEffect(() => {
    if (!authReady || !user || resumeStarted.current) return;

    const pending = readPending();
    if (!pending) return;

    resumeStarted.current = true;
    clearPending();
    setOpen(true);
    setQuery(pending.query);
    void runLookup(pending.query, user);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once after auth resume
  }, [authReady, user]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setError(null);
        }}
        className="fixed z-[60] bottom-[5.75rem] right-4 sm:right-6 flex items-center gap-2 rounded-full border border-violet-400/30 bg-[color-mix(in_srgb,var(--dd-surface)_92%,transparent)] px-3.5 py-3 text-sm font-semibold text-[var(--dd-text)] shadow-lg backdrop-blur-md transition hover:border-violet-400/50 hover:bg-violet-500/15"
        aria-label="Quick dream symbol"
        title="Quick symbol"
      >
        <MoonStar size={18} className="text-[var(--dd-accent-text)]" aria-hidden />
        <span className="hidden sm:inline">Quick</span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--dd-border)] bg-[var(--dd-surface)] p-5 shadow-2xl"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[var(--dd-text)]">Quick symbol</h2>
                <p className="mt-1 text-xs text-[var(--dd-muted)]">
                  Up to {QUICK_SYMBOL_MAX_WORDS} words. Dictionary match is free; unknown symbols cost 1 credit. Sign in required.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !busy && setOpen(false)}
                className="grid size-8 place-items-center rounded-full text-[var(--dd-subtle)] hover:bg-[var(--dd-surface-hover)]"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={onSubmit} className="mt-4 space-y-3">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows={3}
                maxLength={120}
                placeholder="e.g. snake, teeth falling out, tunnel…"
                className="w-full resize-none rounded-xl border border-[var(--dd-border)] bg-[var(--dd-bg)] px-3 py-2.5 text-sm text-[var(--dd-text)] outline-none focus:border-violet-400/40"
                disabled={busy}
              />
              <div className="flex items-center justify-between gap-2 text-xs text-[var(--dd-subtle)]">
                <span>
                  {countWords(query)} / {QUICK_SYMBOL_MAX_WORDS} words
                </span>
                {user ? (
                  <span className="truncate max-w-[180px]">{user.email}</span>
                ) : (
                  <span>Sign in to continue</span>
                )}
              </div>

              {error ? (
                <div className="rounded-xl border border-red-500/30 bg-red-600/10 px-3 py-2 text-xs text-red-200">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={busy || !query.trim()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[var(--dd-text)] px-4 py-2.5 text-sm font-semibold text-[var(--dd-bg)] disabled:opacity-50"
              >
                {busy ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Looking up…
                  </>
                ) : user ? (
                  "Get meaning"
                ) : (
                  "Sign in & get meaning"
                )}
              </button>
            </form>

            {result ? (
              <div className="mt-4 rounded-xl border border-[var(--dd-border)] bg-[var(--dd-bg)] p-4">
                <div className="flex items-center justify-between gap-2 text-xs text-[var(--dd-subtle)]">
                  <span>
                    {result.matched
                      ? `${result.match?.icon ?? "🌙"} ${result.match?.title ?? "Match"}`
                      : "AI draft"}
                  </span>
                  <span>{result.cost === 0 ? "Free" : "1 credit"}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[var(--dd-text)] whitespace-pre-wrap">
                  {result.answer}
                </p>
                {result.href ? (
                  <Link
                    href={result.href}
                    className="mt-3 inline-flex text-sm font-semibold text-[var(--dd-accent-text)] hover:underline"
                  >
                    Open full page →
                  </Link>
                ) : null}
                <p className="mt-2 text-xs text-[var(--dd-subtle)]">Saved to your journal (Quick / dreamer).</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
