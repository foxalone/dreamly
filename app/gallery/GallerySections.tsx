"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { X } from "lucide-react";
import DreamImageFrame from "@/app/components/DreamImageFrame";
import { auth } from "@/lib/firebase";
import { dreamImageCopy } from "@/lib/i18n/dreamImage";
import { dreamersGalleryCopy } from "@/lib/i18n/dreamersGallery";
import type { Locale } from "@/lib/i18n/config";
import { GalleryHeartControl } from "./GalleryHearts";

type Illustration = { id: string; liked: boolean; count: number };
type Page = { images: Illustration[]; next: string | null };

export default function GallerySections({ locale, dictionary }: { locale: Locale; dictionary: ReactNode }) {
  const [dreamers, setDreamers] = useState(false);
  const copy = dreamersGalleryCopy[locale];

  return <>
    <div className="mx-auto mt-6 flex w-fit max-w-full gap-1 rounded-2xl border border-[var(--dd-border)] bg-[var(--dd-surface-soft)] p-1">
      {[copy.dictionary, copy.dreamers].map((label, index) => {
        const selected = dreamers === (index === 1);
        return <button key={label} type="button" aria-pressed={selected} onClick={() => setDreamers(index === 1)}
          className={`min-h-10 rounded-xl px-4 py-2 text-sm font-semibold transition sm:px-7 ${selected ? "bg-violet-700 text-white" : "text-[var(--dd-muted)] hover:text-[var(--dd-text)]"}`}>
          {label}
        </button>;
      })}
    </div>
    <div hidden={dreamers}>{dictionary}</div>
    {dreamers && <CommunityGallery locale={locale} />}
  </>;
}

function CommunityGallery({ locale }: { locale: Locale }) {
  const [viewer, setViewer] = useState<User | null>();
  useEffect(() => onAuthStateChanged(auth, setViewer), []);
  return viewer === undefined
    ? <p role="status" className="my-10 text-center text-[var(--dd-muted)]">{dreamersGalleryCopy[locale].loading}</p>
    : <CommunityGalleryPage key={viewer?.uid ?? "guest"} locale={locale} viewer={viewer} />;
}

async function fetchPage(viewer: User | null, cursor: string | null, signal?: AbortSignal): Promise<Page> {
  const token = await viewer?.getIdToken();
  const url = "/api/gallery/dreams" + (cursor ? `?cursor=${encodeURIComponent(cursor)}` : "");
  const response = await fetch(url, { signal, headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) throw new Error("GALLERY_UNAVAILABLE");
  return response.json();
}

function CommunityGalleryPage({ locale, viewer }: { locale: Locale; viewer: User | null }) {
  const copy = dreamersGalleryCopy[locale];
  const imageCopy = dreamImageCopy[locale];
  const [page, setPage] = useState<Page>({ images: [], next: null });
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reactionFailed, setReactionFailed] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const detail = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchPage(viewer, null, controller.signal).then(setPage).catch(() => {
      if (!controller.signal.aborted) setFailed(true);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [viewer]);

  useEffect(() => {
    if (selected && !detail.current?.open) detail.current?.showModal();
  }, [selected]);

  async function loadMore() {
    if (loading) return;
    setLoading(true);
    setFailed(false);
    try {
      const next = await fetchPage(viewer, page.next);
      setPage(current => ({
        images: page.next ? [...current.images, ...next.images] : next.images,
        next: next.next,
      }));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  async function toggle(image: Illustration) {
    if (pending) return;
    setPending(image.id);
    setReactionFailed(false);
    try {
      const idToken = await viewer?.getIdToken();
      const response = await fetch("/api/gallery/hearts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: image.id, idToken }),
      });
      if (!response.ok) throw new Error("HEART_UNAVAILABLE");
      const { count, liked } = await response.json() as { count: number; liked: boolean };
      setPage(current => ({ ...current, images: current.images.map(row => row.id === image.id ? { ...row, count, liked } : row) }));
    } catch {
      setReactionFailed(true);
    } finally {
      setPending(null);
    }
  }

  return <section className="mt-8" aria-label={copy.dreamers}>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {page.images.map(image => {
        const label = image.liked ? copy.unlike : copy.like;
        return <article key={image.id} className="group relative overflow-hidden rounded-[1.15rem] bg-[var(--dd-surface-soft)] ring-1 ring-[var(--dd-border)] sm:rounded-[1.35rem]">
          <button type="button" className="block w-full" onClick={() => setSelected(image.id)}>
            {/* eslint-disable-next-line @next/next/no-img-element -- Public thumbnails are already resized by the gallery route. */}
            <img src={`/api/gallery/dreams/${image.id}?thumb=1`} alt={imageCopy.title} loading="lazy" decoding="async"
              className="aspect-[2/3] w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
          </button>
          <div className="absolute end-2 top-2">
            <GalleryHeartControl liked={image.liked} count={image.count} disabled={pending !== null} label={label}
              accessibleLabel={`${label} (${image.count})`} onToggle={() => void toggle(image)} />
          </div>
        </article>;
      })}
    </div>
    <div className="my-8 text-center text-sm text-[var(--dd-muted)]">
      {loading ? <p role="status">{copy.loading}</p> : failed || reactionFailed ? <p role="alert">{copy.unavailable}</p>
        : !page.images.length && !page.next ? <p>{copy.empty}</p> : null}
      {!loading && (failed || page.next) && <button type="button" className="dream-btn dream-btn--neutral mt-3" onClick={() => void loadMore()}>
        {failed ? copy.retry : copy.more}
      </button>}
    </div>
    {selected && <dialog ref={detail} aria-labelledby="gallery-dream-title" onClose={() => setSelected(null)}
      className="m-auto w-[min(92vw,30rem)] max-h-[92dvh] overflow-auto rounded-3xl border border-purple-500/30 bg-[var(--card)] p-5 text-center text-[var(--text)] shadow-2xl backdrop:bg-black/70">
      <button type="button" aria-label={imageCopy.close} onClick={() => detail.current?.close()}
        className="absolute end-3 top-3 grid size-9 place-items-center rounded-full text-[var(--muted)] hover:bg-purple-500/15"><X size={20} aria-hidden /></button>
      <h2 id="gallery-dream-title" className="px-9 text-xl font-semibold">{imageCopy.title}</h2>
      <DreamImageFrame src={`/api/gallery/dreams/${selected}`} alt={imageCopy.title} />
    </dialog>}
  </section>;
}
