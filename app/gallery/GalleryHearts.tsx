"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useLocale, useMessages } from "@/lib/i18n/LocaleProvider";
import { formatMessage } from "@/lib/i18n/messages";
import { localePath } from "@/lib/i18n/path";

type HeartsState = {
  counts: Record<string, number>;
  liked: Record<string, boolean>;
};

type HeartsContextValue = HeartsState & {
  toggle: (slug: string) => Promise<void>;
  busySlug: string | null;
};

const HeartsContext = createContext<HeartsContextValue | null>(null);

export function GalleryHeartsProvider({
  initialCounts,
  children,
}: {
  initialCounts: Record<string, number>;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const [uid, setUid] = useState<string | null>(null);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [state, setState] = useState<HeartsState>({
    counts: initialCounts,
    liked: {},
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUid(user ? user.uid : null);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
        const res = await fetch("/api/gallery/hearts", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: "same-origin",
        });
        const data = (await res.json().catch(() => ({}))) as {
          counts?: Record<string, number>;
          liked?: Record<string, boolean>;
        };
        if (!res.ok || cancelled) return;
        setState({
          counts: data.counts ?? {},
          liked: data.liked ?? {},
        });
      } catch {
        // Keep server-rendered counts if the live refresh fails.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const toggle = useCallback(
    async (slug: string) => {
      const user = auth.currentUser;
      if (!user) {
        const next = pathname || localePath("/gallery", locale);
        router.push(`${localePath("/signin", locale)}?next=${encodeURIComponent(next)}`);
        return;
      }
      if (busySlug) return;

      const wasLiked = !!state.liked[slug];
      const previousCount = state.counts[slug] ?? 0;
      const nextLiked = !wasLiked;
      const nextCount = Math.max(0, previousCount + (nextLiked ? 1 : -1));

      setBusySlug(slug);
      setState((prev) => ({
        counts: { ...prev.counts, [slug]: nextCount },
        liked: { ...prev.liked, [slug]: nextLiked },
      }));

      try {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/gallery/hearts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ slug, idToken }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          count?: number;
          liked?: boolean;
          code?: string;
        };
        if (res.status === 401 || data?.code === "AUTH_REQUIRED") {
          const next = pathname || localePath("/gallery", locale);
          router.push(`${localePath("/signin", locale)}?next=${encodeURIComponent(next)}`);
          throw new Error("auth");
        }
        if (!res.ok) throw new Error("save");
        setState((prev) => ({
          counts: {
            ...prev.counts,
            [slug]: typeof data.count === "number" ? data.count : nextCount,
          },
          liked: { ...prev.liked, [slug]: typeof data.liked === "boolean" ? data.liked : nextLiked },
        }));
      } catch {
        setState((prev) => ({
          counts: { ...prev.counts, [slug]: previousCount },
          liked: { ...prev.liked, [slug]: wasLiked },
        }));
      } finally {
        setBusySlug(null);
      }
    },
    [busySlug, locale, pathname, router, state.counts, state.liked]
  );

  const value = useMemo<HeartsContextValue>(
    () => ({ ...state, toggle, busySlug }),
    [state, toggle, busySlug]
  );

  return <HeartsContext.Provider value={value}>{children}</HeartsContext.Provider>;
}

export function GalleryHeartButton({ slug }: { slug: string }) {
  const t = useMessages();
  const ctx = useContext(HeartsContext);
  const liked = !!ctx?.liked[slug];
  const count = ctx?.counts[slug] ?? 0;
  const busy = ctx?.busySlug === slug;
  const label = liked ? t.gallery.undoHadThisDream : t.gallery.hadThisDream;
  const countLabel =
    count > 0 ? formatMessage(t.gallery.peopleHadThisDream, { count }) : label;

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void ctx?.toggle(slug);
      }}
      disabled={busy || !ctx}
      aria-pressed={liked}
      aria-label={countLabel}
      title={label}
      className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-full bg-black/40 px-2.5 text-white shadow-[0_1px_8px_rgba(0,0,0,0.35)] backdrop-blur-sm transition hover:bg-black/55 active:scale-90 disabled:opacity-70"
    >
      <Heart
        size={20}
        strokeWidth={2.15}
        className={
          liked
            ? "fill-[#ed4956] text-[#ed4956] drop-shadow-sm transition-transform duration-200"
            : "fill-transparent text-white drop-shadow-sm transition-transform duration-200"
        }
        aria-hidden
      />
      {count > 0 ? (
        <span className="min-w-[0.75rem] text-[12px] font-semibold tabular-nums leading-none">
          {count}
        </span>
      ) : null}
    </button>
  );
}
