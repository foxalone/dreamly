"use client";

import { EyeOff, Image as ImageIcon, ImagePlus, LoaderCircle, Share2, Sparkles, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import DreamImageFrame from "./DreamImageFrame";
import { createRewardedAd } from "@/lib/rewardedAd";
import { auth } from "@/lib/firebase";
import { dreamImageCopy } from "@/lib/i18n/dreamImage";
import { dreamersGalleryCopy } from "@/lib/i18n/dreamersGallery";
import { useLocale } from "@/lib/i18n/LocaleProvider";

type Status = { state: string; published?: boolean; attemptId?: string; adMaxSeconds?: number; google?: { path: string } };
type Phase = "progress" | "image" | "error" | null;
type ErrorKey = "unavailable" | "interrupted" | "pending" | "failed";
type ImageRequest = (signal: AbortSignal, body?: object, image?: boolean) => Promise<Response>;
let googleAdOpen = false;

export default function DreamImageButton({ dreamId, ready, disabled, requestOverride }: {
  dreamId: string; ready: boolean; disabled?: boolean; requestOverride?: ImageRequest;
}) {
  const locale = useLocale();
  const copy = dreamImageCopy[locale];
  const gallery = dreamersGalleryCopy[locale];
  const [phase, setPhase] = useState<Phase>(null);
  const [error, setError] = useState<ErrorKey>("failed");
  const [hasImage, setHasImage] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [published, setPublished] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publicationFailed, setPublicationFailed] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const running = useRef<AbortController | null>(null);
  const pendingWebReward = useRef<string | null>(null);
  const titleId = useId();
  const action = useRef<HTMLButtonElement>(null);
  const endpoint = `/api/dreams/image/${encodeURIComponent(dreamId)}`;
  const canView = ready || hasImage;

  useEffect(() => {
    if (phase && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [phase]);
  useEffect(() => () => running.current?.abort(), []);
  useEffect(() => () => { if (imageUrl) URL.revokeObjectURL(imageUrl); }, [imageUrl]);

  function close() {
    running.current?.abort();
    running.current = null;
    setPhase(null);
    setImageUrl("");
    setPublicationFailed(false);
    action.current?.focus();
  }

  async function request(signal: AbortSignal, body?: object, image = false) {
    if (requestOverride) return requestOverride(signal, body, image);
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("AUTH_REQUIRED");
    const response = await fetch(endpoint + (image ? "?image=1" : ""), {
      method: body ? "POST" : "GET",
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal,
      cache: "no-store",
    });
    if (!response.ok) throw new Error((await response.json().catch(() => null))?.code ?? "IMAGE_UNAVAILABLE");
    return response;
  }

  async function status(signal: AbortSignal, body?: object): Promise<Status> {
    return (await request(signal, body)).json();
  }

  async function showImage(signal: AbortSignal, publicInGallery = false) {
    const blob = await (await request(signal, undefined, true)).blob();
    if (signal.aborted) return;
    setImageUrl(URL.createObjectURL(blob));
    setHasImage(true);
    setPublished(publicInGallery);
    setPhase("image");
  }

  async function changePublication() {
    if (publishing) return;
    setPublishing(true);
    setPublicationFailed(false);
    try {
      const result = await status(AbortSignal.timeout(15_000), { action: "publish", published: !published });
      setPublished(result.published === true);
    } catch {
      setPublicationFailed(true);
    } finally {
      setPublishing(false);
    }
  }

  async function redeemWebReward(attemptId: string) {
    pendingWebReward.current = attemptId;
    try {
      const result = await status(AbortSignal.timeout(15_000), { action: "reward", attemptId });
      pendingWebReward.current = null;
      return result;
    } catch (error) {
      if (error instanceof Error && ["AD_UNVERIFIED", "AUTH_REQUIRED", "DREAM_NOT_FOUND"].includes(error.message)) {
        pendingWebReward.current = null;
      }
      throw error;
    }
  }

  async function playAd(signal: AbortSignal, ad: Status) {
    const attemptId = ad.attemptId;
    const adUnitPath = ad.google?.path;
    if (!attemptId || !adUnitPath || googleAdOpen || signal.aborted) throw new Error("AD_UNAVAILABLE");
    setPhase(null);
    googleAdOpen = true;
    try {
      await new Promise<void>((resolve, reject) => {
        let opened = false;
        const finish = (error?: Error) => {
          window.clearTimeout(timeout);
          signal.removeEventListener("abort", abort);
          player.dispose();
          if (error) reject(error);
          else resolve();
        };
        const abort = () => finish(new Error("AD_INTERRUPTED"));
        const player = createRewardedAd({
          adUnitPath,
          showWhenReady: true,
          onState: state => {
            if (state === "failed") finish(new Error(opened ? "IMAGE_FAILED" : "AD_UNAVAILABLE"));
            if (state === "unavailable") finish(new Error(opened ? "AD_INTERRUPTED" : "AD_UNAVAILABLE"));
          },
          onShown: () => { opened = true; },
          onGranted: async () => {
            await redeemWebReward(attemptId);
            return true;
          },
          onDone: () => finish(),
        });
        const timeout = window.setTimeout(abort, ((ad.adMaxSeconds ?? 60) + 45) * 1000);
        signal.addEventListener("abort", abort, { once: true });
      });
    } finally { googleAdOpen = false; }
  }

  async function run(mode: "create" | "view" | "retry") {
    if (running.current) return;
    const controller = new AbortController();
    const { signal } = controller;
    running.current = controller;
    try {
      let current = pendingWebReward.current
        ? await redeemWebReward(pendingWebReward.current)
        : await status(signal, mode === "create" ? { action: "attempt", platform: "web" } : undefined);
      if (current.state === "ready") return await showImage(signal, current.published);
      if (current.state === "failed" && mode === "retry") current = await status(signal, { action: "start" });
      if (current.state === "failed" || current.state === "new" || current.state === "awaiting-ad") {
        throw new Error("IMAGE_FAILED");
      }
      if (current.state === "ad" && mode === "create") await playAd(signal, current);
      if (signal.aborted) return;
      setPhase("progress");
      for (let count = 0; count < 30 && !signal.aborted; count++) {
        current = await status(signal);
        if (current.state === "ready") return await showImage(signal, current.published);
        if (current.state === "failed") throw new Error("IMAGE_FAILED");
        await new Promise<void>(resolve => window.setTimeout(resolve, 3000));
      }
      if (!signal.aborted) throw new Error("AD_CONFIRMATION_PENDING");
    } catch (cause) {
      if (signal.aborted) return;
      const code = cause instanceof Error ? cause.message : "";
      setError(code === "AD_UNAVAILABLE" ? "unavailable" : code === "AD_INTERRUPTED" ? "interrupted" :
        code === "AD_CONFIRMATION_PENDING" ? "pending" : "failed");
      setPhase("error");
    } finally {
      if (running.current === controller) running.current = null;
    }
  }

  const label = canView ? copy.view : copy.createWithAd;
  const Icon = canView ? ImageIcon : ImagePlus;
  const PublicationIcon = publishing ? LoaderCircle : published ? EyeOff : Share2;
  return <>
    <button ref={action} type="button" title={label} aria-label={label} disabled={disabled}
      className={`dream-btn inline-flex items-center gap-1.5 ${canView ? "!border-purple-500/50 !bg-purple-600/20 !text-purple-500" : "dream-btn--neutral"}`}
      onClick={() => void run(canView ? "view" : "create")}>
      <Icon size={17} aria-hidden />
      <span className="text-xs font-semibold">{label}</span>
    </button>
    {phase && createPortal(
      <dialog ref={dialog} aria-labelledby={titleId} dir={locale === "ar" ? "rtl" : "ltr"}
        onCancel={event => { event.preventDefault(); close(); }}
        onClick={event => { if (event.target === event.currentTarget) close(); }}
        className="m-auto w-[min(92vw,30rem)] max-h-[92dvh] overflow-auto rounded-3xl border border-purple-500/30 bg-[var(--card)] p-0 text-[var(--text)] shadow-2xl backdrop:bg-black/70">
        <div className="relative p-5 text-center sm:p-7">
          <button type="button" aria-label={copy.close} title={copy.close} onClick={close}
            className="absolute end-3 top-3 grid size-9 place-items-center rounded-full text-[var(--muted)] hover:bg-purple-500/15">
            <X size={20} aria-hidden />
          </button>
          <h2 id={titleId} className="px-8 text-xl font-semibold">
            {phase === "image" ? copy.title : phase === "progress" ? copy.generating : copy.create}
          </h2>
          {phase === "progress" && <div role="status" aria-live="polite" className="py-4">
            <Sparkles className="mx-auto h-8 w-8 text-purple-500" aria-hidden />
            <p className="mt-3 text-sm text-[var(--muted)]">{copy.waiting}</p>
            <div role="progressbar" aria-label={copy.generating} className="mt-5 h-3 overflow-hidden rounded-full bg-purple-500/15">
              <div className="dream-analysis-progress-bar h-full w-2/5 rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-400" />
            </div>
          </div>}
          {phase === "image" && imageUrl && <>
            <DreamImageFrame src={imageUrl} alt={copy.title} imageHeight="max-h-[min(72dvh,max(10rem,calc(92dvh_-_12rem)))]" />
            <button type="button" disabled={publishing} aria-busy={publishing} onClick={() => void changePublication()}
              className={`mx-auto mt-5 flex min-h-12 w-full max-w-80 items-center justify-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-500 disabled:cursor-wait disabled:opacity-70 ${
                published
                  ? "border-[var(--border)] text-[var(--text)] hover:bg-purple-500/10"
                  : "border-violet-500 bg-gradient-to-r from-violet-700 to-purple-700 text-white shadow-md shadow-violet-950/25 hover:from-violet-600 hover:to-purple-600"
              }`}>
              <PublicationIcon size={18} className={publishing ? "shrink-0 motion-safe:animate-spin" : "shrink-0"} aria-hidden />
              {published ? gallery.unpublish : gallery.publish}
            </button>
            {publicationFailed && <p role="alert" className="mt-2 text-sm text-[var(--muted)]">{gallery.publicationFailed}</p>}
          </>}
          {phase === "error" && <>
            <p role="alert" className="mt-4 text-sm text-[var(--muted)]">{copy[error]}</p>
            {error === "failed" && (
              <button type="button" className="dream-btn dream-btn--neutral mt-5" onClick={() => void run("retry")}>{copy.retry}</button>
            )}
          </>}
        </div>
      </dialog>, document.body,
    )}
  </>;
}
