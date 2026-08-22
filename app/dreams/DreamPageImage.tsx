"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import type { AdminImageLibraryItem } from "@/lib/adminImageLibrary";
import type { DreamPageImageAssignment } from "@/lib/dreamPageImage";

const ADMIN_UIDS = new Set<string>(["sGbA77TlcsatEMrgEvCv7Shjrj32"]);

type PageImageContextValue = {
  slug: string;
  accent: string;
  isAdmin: boolean;
  image: DreamPageImageAssignment | null;
  openPicker: () => void;
  clearImage: () => Promise<void>;
  clearing: boolean;
};

const PageImageContext = createContext<PageImageContextValue | null>(null);

function usePageImage() {
  const value = useContext(PageImageContext);
  if (!value) throw new Error("Dream page image context is missing");
  return value;
}

export function DreamPageImageProvider({
  slug,
  accent,
  children,
}: {
  slug: string;
  accent: string;
  children: ReactNode;
}) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [image, setImage] = useState<DreamPageImageAssignment | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [items, setItems] = useState<AdminImageLibraryItem[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState("");

  const loadAssignment = useCallback(async () => {
    const response = await fetch(`/api/dreams/${encodeURIComponent(slug)}/page-image`, { cache: "no-store" });
    const payload = (await response.json()) as { image?: DreamPageImageAssignment | null };
    if (response.ok) setImage(payload.image ?? null);
  }, [slug]);

  useEffect(() => {
    void loadAssignment();
  }, [loadAssignment]);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setIsAdmin(Boolean(user?.uid && ADMIN_UIDS.has(user.uid)));
    });
  }, []);

  const loadLibrary = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    setLoadingLibrary(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/image-library", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload = (await response.json()) as { items?: AdminImageLibraryItem[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "Не удалось загрузить библиотеку");
      setItems(payload.items ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка загрузки");
    } finally {
      setLoadingLibrary(false);
    }
  }, []);

  const openPicker = useCallback(() => {
    setPickerOpen(true);
    void loadLibrary();
  }, [loadLibrary]);

  async function chooseImage(item: AdminImageLibraryItem) {
    const user = auth.currentUser;
    if (!user) return;
    setSavingId(item.id);
    setError("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/dream-page-image", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ slug, imageJobId: item.id }),
      });
      const payload = (await response.json()) as { image?: DreamPageImageAssignment; error?: string };
      if (!response.ok || !payload.image) throw new Error(payload.error || "Не удалось назначить картинку");
      setImage(payload.image);
      setPickerOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка сохранения");
    } finally {
      setSavingId("");
    }
  }

  const clearImage = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    setClearing(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/admin/dream-page-image?slug=${encodeURIComponent(slug)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Не удалось убрать картинку");
      setImage(null);
      setPickerOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка удаления");
    } finally {
      setClearing(false);
    }
  }, [slug]);

  const value = useMemo(
    () => ({ slug, accent, isAdmin, image, openPicker, clearImage, clearing }),
    [accent, clearImage, clearing, image, isAdmin, slug],
  );

  return (
    <PageImageContext.Provider value={value}>
      {children}
      {pickerOpen && isAdmin ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-4 sm:items-center" role="dialog" aria-modal="true">
          <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-[var(--dd-border)] bg-[var(--dd-surface)] shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--dd-border)] px-5 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--dd-subtle)]">Admin</p>
                <h3 className="mt-1 text-lg font-semibold text-[var(--dd-text)]">Выбрать картинку страницы</h3>
              </div>
              <div className="flex gap-2">
                {image ? (
                  <button
                    type="button"
                    disabled={clearing}
                    onClick={() => void clearImage()}
                    className="rounded-full border border-[var(--dd-border)] px-3 py-1.5 text-xs font-semibold text-[var(--dd-muted)] disabled:opacity-50"
                  >
                    {clearing ? "Убираем…" : "Убрать"}
                  </button>
                ) : null}
                <button type="button" onClick={() => setPickerOpen(false)} className="rounded-full border border-[var(--dd-border)] px-3 py-1.5 text-xs font-semibold text-[var(--dd-text)]">
                  Закрыть
                </button>
              </div>
            </div>
            <div className="overflow-y-auto p-4">
              {error ? <p className="mb-3 rounded-xl bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-500">{error}</p> : null}
              {loadingLibrary ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                  {Array.from({ length: 10 }, (_, index) => (
                    <div key={index} className="aspect-square animate-pulse rounded-xl bg-[var(--dd-surface-soft)]" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <p className="py-10 text-center text-sm text-[var(--dd-muted)]">В библиотеке пока нет готовых картинок.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                  {items.map((item) => {
                    const selected = image?.imageJobId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={Boolean(savingId)}
                        onClick={() => void chooseImage(item)}
                        className={`overflow-hidden rounded-xl border text-left disabled:opacity-60 ${selected ? "border-violet-500 ring-2 ring-violet-400/40" : "border-[var(--dd-border)]"}`}
                      >
                        <span className="relative block aspect-square">
                          <img src={item.imageUrl} alt={item.subject} className="h-full w-full object-cover" />
                          {savingId === item.id ? (
                            <span className="absolute inset-0 grid place-items-center bg-black/45 text-xs font-bold text-white">Сохраняем…</span>
                          ) : null}
                        </span>
                        <span className="block truncate px-2 py-1.5 text-[10px] font-semibold text-[var(--dd-muted)]">{item.subject || item.sourceLabel}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </PageImageContext.Provider>
  );
}

export function DreamPageImagePickerButton() {
  const { isAdmin, openPicker, accent } = usePageImage();
  if (!isAdmin) return null;
  return (
    <button
      type="button"
      onClick={openPicker}
      title="Выбрать картинку страницы"
      aria-label="Выбрать картинку страницы"
      className="mt-1 inline-flex size-3.5 shrink-0 rounded-full opacity-35 transition hover:opacity-80"
      style={{ backgroundColor: accent }}
    />
  );
}

export function DreamPageImageFrame() {
  const { image, isAdmin, openPicker } = usePageImage();
  if (!image?.imageUrl) return null;
  return (
    <figure className="relative mb-8 max-w-lg overflow-hidden rounded-[1.6rem] border border-[var(--dd-border)] bg-[var(--dd-surface-soft)]">
      <img src={image.imageUrl} alt={image.subject || "Dream symbol illustration"} className="aspect-[3/4] w-full object-cover" />
      {isAdmin ? (
        <button
          type="button"
          onClick={openPicker}
          className="absolute right-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-semibold text-white/90 backdrop-blur-[2px]"
        >
          Сменить
        </button>
      ) : null}
    </figure>
  );
}
