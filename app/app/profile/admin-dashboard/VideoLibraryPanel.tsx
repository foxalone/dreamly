"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import type { AdminVideoLibraryItem } from "@/lib/adminVideoLibrary";

function VideoTile({ item }: { item: AdminVideoLibraryItem }) {
  return (
    <a
      href={item.videoUrl}
      target="_blank"
      rel="noreferrer"
      className="group block overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg)] transition hover:border-[color-mix(in_srgb,var(--text)_35%,transparent)]"
    >
      <div className="relative aspect-square overflow-hidden bg-[color-mix(in_srgb,var(--text)_8%,transparent)]">
        {item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt={item.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <video
            src={item.videoUrl}
            muted
            playsInline
            preload="metadata"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-90" />
        <div className="absolute inset-x-0 bottom-0 p-2.5">
          <p className="line-clamp-2 text-[11px] font-bold leading-4 text-white">{item.title}</p>
          <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-white/75">{item.sourceLabel}</p>
        </div>
      </div>
    </a>
  );
}

export default function VideoLibraryPanel({ user }: { user: User }) {
  const [items, setItems] = useState<AdminVideoLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }), []);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/video-library", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload = (await response.json()) as { items?: AdminVideoLibraryItem[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "Не удалось загрузить библиотеку");
      setItems(payload.items ?? []);
      setError("");
    } catch (loadError) {
      if (!quiet) setError(loadError instanceof Error ? loadError.message : "Ошибка загрузки");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 15_000);
    return () => window.clearInterval(timer);
  }, [load]);

  return (
    <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-500">Video library</p>
          <h2 className="mt-1 text-2xl font-bold text-[var(--text)]">Все сгенерированные видео</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Free Video · Sora · Combined · Veo · {items.length} готовых
          </p>
        </div>
        <button type="button" onClick={() => void load()} className="text-sm font-semibold text-[var(--muted)] underline">
          Обновить
        </button>
      </div>

      {error && <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-500">{error}</p>}

      {loading ? (
        <div className="mt-6 grid grid-cols-5 gap-2">
          {Array.from({ length: 10 }, (_, index) => (
            <div key={index} className="aspect-square animate-pulse rounded-xl bg-[color-mix(in_srgb,var(--text)_8%,transparent)]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--muted)]">
          Готовых видео пока нет.
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-5 gap-2">
          {items.map((item) => (
            <div key={item.id} className="min-w-0">
              <VideoTile item={item} />
              <p className="mt-1.5 truncate px-0.5 text-[10px] text-[var(--muted)]">{dateFormatter.format(new Date(item.createdAt))}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
