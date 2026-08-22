"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import type { AdminImageLibraryItem } from "@/lib/adminImageLibrary";

function ImageTile({
  item,
  dateLabel,
  costLabel,
  busy,
  onDownload,
}: {
  item: AdminImageLibraryItem;
  dateLabel: string;
  costLabel: string;
  busy: boolean;
  onDownload: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg)]">
      <div className="relative aspect-square overflow-hidden bg-[color-mix(in_srgb,var(--text)_8%,transparent)]">
        <a href={item.imageUrl} target="_blank" rel="noreferrer" title={item.prompt} className="group absolute inset-0 block">
          <img src={item.imageUrl} alt={item.prompt} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
        </a>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/70" />
        {dateLabel ? (
          <p className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-[2px]">
            {dateLabel}
          </p>
        ) : null}
        <p className="pointer-events-none absolute right-2 top-2 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-[2px]">
          {item.sourceLabel}
        </p>
        <div className="absolute inset-x-0 bottom-0 z-10 px-1.5 pb-1.5 pt-8">
          <div className="flex items-center justify-between gap-1 rounded-lg bg-black/35 px-2 py-1.5 backdrop-blur-[2px]">
            <p className="min-w-0 truncate text-[10px] font-semibold text-white/90">{costLabel}</p>
            <button
              type="button"
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onDownload();
              }}
              className="shrink-0 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-black disabled:opacity-50"
            >
              {busy ? "…" : "Скачать"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ImageLibraryPanel({ user }: { user: User }) {
  const [items, setItems] = useState<AdminImageLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [busyId, setBusyId] = useState("");
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }), []);
  const usd = useMemo(
    () => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 4 }),
    [],
  );

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/image-library", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const payload = (await response.json()) as { items?: AdminImageLibraryItem[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "Не удалось загрузить библиотеку");
      setItems(payload.items ?? []);
      setError("");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Ошибка загрузки";
      if (!quiet) setError(message);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function download(item: AdminImageLibraryItem) {
    setBusyId(item.id);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/admin/ai-image/${encodeURIComponent(item.id)}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || "Не удалось скачать изображение");
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const disposition = response.headers.get("Content-Disposition") || "";
      const matched = /filename="([^"]+)"/i.exec(disposition);
      const filename = matched?.[1] || `${item.id}.jpg`;
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (caught) {
      setNotice({ type: "error", text: caught instanceof Error ? caught.message : "Ошибка скачивания" });
    } finally {
      setBusyId("");
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-500">Image library</p>
          <h2 className="mt-1 text-2xl font-bold text-[var(--text)]">Все сгенерированные картинки</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Sora · Veo · {items.length} готовых</p>
        </div>
        <button type="button" onClick={() => void load()} className="text-sm font-semibold text-[var(--muted)] underline">
          Обновить
        </button>
      </div>

      {notice && (
        <p className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold ${notice.type === "ok" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
          {notice.text}
        </p>
      )}
      {error && <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-500">{error}</p>}

      {loading ? (
        <div className="mt-6 grid grid-cols-5 gap-2">
          {Array.from({ length: 10 }, (_, index) => (
            <div key={index} className="aspect-square animate-pulse rounded-xl bg-[color-mix(in_srgb,var(--text)_8%,transparent)]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--muted)]">
          Готовых картинок пока нет.
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-5 gap-2">
          {items.map((item) => (
            <ImageTile
              key={item.id}
              item={item}
              dateLabel={dateFormatter.format(new Date(item.createdAt))}
              costLabel={item.actualCostUsd == null ? `оценка ${usd.format(item.estimatedCostUsd)}` : `≈ ${usd.format(item.actualCostUsd)}`}
              busy={busyId === item.id}
              onDownload={() => void download(item)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
