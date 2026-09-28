"use client";

import { AdminPollingError, AdminPollingGate } from "@/lib/adminPolling";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { AUTO_PAIR_COUNT } from "@/lib/adminAutoSlots";
import { useAdminActivePolling } from "./useAdminActivePolling";

const STORAGE_KEY = "dreamly.autoCatchUp";
/** Booking a slot uploads to YouTube and can take minutes; timeouts and dropped fetches are retried on the next poll. */
const MAX_SCHEDULE_ATTEMPTS = 6;

type Slot = { dateKey: string; hour: number; publishAt: string };
type CatchUpPair = {
  slug: string;
  title: string;
  videoJobId: string;
  imageJobId: string;
  publishAt: string;
  dateKey?: string;
  hour?: number | null;
  videoStatus?: string;
  imageStatus?: string;
  scheduled?: boolean;
  scheduling?: boolean;
  youtubeScheduled?: boolean;
  imageScheduled?: boolean;
  imageError?: string;
  scheduleAttempts?: number;
  scheduleError?: string;
  error?: string;
};

type WorkerStatus = { online: boolean };

type RespaceMove = {
  libraryId: string;
  slug: string;
  title: string;
  from: string;
  to: string;
  youtube: string;
  image: string;
  imageAt: string;
  errors: string[];
};

const RESPACE_YOUTUBE_LABEL: Record<string, string> = {
  moved: "переносится",
  same: "уже вовремя",
  booked: "загрузим",
  none: "—",
  later: "позже",
  error: "ошибка",
};

function slotLabel(publishAt: string) {
  const when = new Date(publishAt);
  if (!Number.isFinite(when.getTime())) return publishAt;
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "America/New_York",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(when) + " ET";
}

function pairLine(pair: CatchUpPair) {
  if (pair.error) return pair.error;
  if (pair.scheduled) {
    const video = pair.youtubeScheduled === false ? "в слоте, YouTube не ушёл" : "поставлено в слот";
    const image = pair.imageScheduled ? "картинка в 19:00 ET" : pair.imageError ? `картинка: ${pair.imageError}` : "";
    return image ? `${video}, ${image}` : video;
  }
  if (pair.scheduling) return "ставим в слот…";
  if (pair.scheduleError) {
    return `слот не встал (${pair.scheduleError}), попытка ${pair.scheduleAttempts ?? 1}/${MAX_SCHEDULE_ATTEMPTS} — повторим…`;
  }
  if (pair.videoStatus === "failed" || pair.imageStatus === "failed") return "ошибка генерации";
  if (pair.videoStatus === "completed" && pair.imageStatus === "completed") return "готово, ставим в слот…";
  if (pair.videoStatus === "processing" || pair.imageStatus === "processing") return "генерация";
  return "в очереди";
}

function readStoredPairs() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as CatchUpPair[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** A pair whose generation succeeded but whose slot booking failed — safe to retry, the API is idempotent. */
export function isRetryablePair(pair: CatchUpPair) {
  return !pair.scheduled && pair.videoStatus !== "failed" && pair.imageStatus !== "failed" && Boolean(pair.error || pair.scheduling);
}

/** Clear stale "scheduling" flags (a reload killed that request) and optionally give failed bookings another go. */
export function revivePairs(pairs: CatchUpPair[], retryErrors: boolean) {
  return pairs.map((pair) => {
    if (!isRetryablePair(pair)) return pair;
    if (pair.error && !retryErrors) return pair;
    return { ...pair, scheduling: false, error: "", scheduleError: "", scheduleAttempts: 0 };
  });
}

/** Generation failed (video or image) — the slot is still empty and needs a fresh pair. */
export function isFailedGeneration(pair: CatchUpPair) {
  return !pair.scheduled && (pair.videoStatus === "failed" || pair.imageStatus === "failed");
}

function isTransientScheduleFailure(status: number) {
  return status === 0 || status === 408 || status === 409 || status === 429 || status >= 500;
}

export default function AutoDictionaryCatchUpCard({ user }: { user: User }) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [pairs, setPairs] = useState<CatchUpPair[]>([]);
  const [videoWorker, setVideoWorker] = useState<WorkerStatus>({ online: false });
  const [imageWorker, setImageWorker] = useState<WorkerStatus>({ online: false });
  const [running, setRunning] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [respacing, setRespacing] = useState(false);
  const [respacePreview, setRespacePreview] = useState<RespaceMove[] | null>(null);
  const [notice, setNotice] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const slotText = useMemo(
    () => (slots.length ? slots.map((slot) => slotLabel(slot.publishAt)).join(" · ") : "свободный день, 12:00 ET"),
    [slots],
  );
  const active = pairs.some(
    (pair) => !pair.scheduled && !pair.error && pair.videoStatus !== "failed" && pair.imageStatus !== "failed",
  );

  const persist = useCallback((next: CatchUpPair[]) => {
    setPairs(next);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const loadPreview = useCallback(async () => {
    const token = await user.getIdToken();
    const headers = { Authorization: `Bearer ${token}` };
    const [autoResponse, videoResponse, imageResponse] = await Promise.all([
      fetch("/api/admin/auto-content", { headers, cache: "no-store" }),
      fetch("/api/admin/videos", { headers, cache: "no-store" }),
      fetch("/api/admin/ai-image", { headers, cache: "no-store" }),
    ]);
    const autoPayload = (await autoResponse.json()) as { slots?: { slots?: Slot[] } };
    const videoPayload = (await videoResponse.json()) as { worker?: WorkerStatus };
    const imagePayload = (await imageResponse.json()) as { worker?: WorkerStatus };
    if (autoResponse.ok) setSlots(autoPayload.slots?.slots || []);
    if (videoResponse.ok) setVideoWorker(videoPayload.worker ?? { online: false });
    if (imageResponse.ok) setImageWorker(imagePayload.worker ?? { online: false });
  }, [user]);

  const pairPollGate = useRef(new AdminPollingGate());
  const refreshPairs = useCallback(async (current: CatchUpPair[], quiet = false) => {
    if (!current.length || !pairPollGate.current.begin(quiet)) return current;
    try {
      const token = await user.getIdToken();
      const next = [];
      for (const pair of current) {
        if (pair.scheduled || pair.scheduling || pair.error) {
          next.push(pair);
          continue;
        }
        try {
          const response = await fetch(
            `/api/admin/auto-content/schedule?videoJobId=${encodeURIComponent(pair.videoJobId)}&imageJobId=${encodeURIComponent(pair.imageJobId)}`,
            { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
          );
          const payload = (await response.json()) as {
            video?: { status?: string; error?: string };
            image?: { status?: string; error?: string };
            error?: string;
          };
          if (!response.ok) throw new AdminPollingError(response.status, payload.error || "Ошибка генерации");
          const videoStatus = payload.video?.status || pair.videoStatus || "queued";
          const imageStatus = payload.image?.status || pair.imageStatus || "queued";
          if (videoStatus === "failed" || imageStatus === "failed") {
            next.push({
              ...pair,
              videoStatus,
              imageStatus,
              error: payload.video?.error || payload.image?.error || "Ошибка генерации",
            });
            continue;
          }
          if (videoStatus === "completed" && imageStatus === "completed") {
            const remaining = current.slice(next.length + 1);
            persist([...next, { ...pair, videoStatus, imageStatus, scheduling: true }, ...remaining]);
            const booked = await fetch("/api/admin/auto-content/schedule", {
              method: "POST",
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                slug: pair.slug,
                videoJobId: pair.videoJobId,
                imageJobId: pair.imageJobId,
                publishAt: pair.publishAt,
              }),
            });
            const bookedPayload = (await booked.json().catch(() => ({}))) as {
              youtubeScheduled?: boolean;
              youtubeError?: string;
              imageScheduled?: boolean;
              imageError?: string;
              error?: string;
            };
            if (!booked.ok) {
              throw new AdminPollingError(booked.status, bookedPayload.error || "Не удалось поставить в слот");
            }
            next.push({
              ...pair,
              videoStatus,
              imageStatus,
              scheduling: false,
              scheduled: true,
              scheduleError: "",
              youtubeScheduled: bookedPayload.youtubeScheduled !== false,
              imageScheduled: bookedPayload.imageScheduled === true,
              imageError: bookedPayload.imageError || "",
              error: bookedPayload.youtubeError || "",
            });
            continue;
          }
          next.push({ ...pair, videoStatus, imageStatus });
        } catch (error) {
          const status = error instanceof AdminPollingError ? error.status : 0;
          if (status === 401 || status === 403) throw error;
          const message = error instanceof Error ? error.message : "Ошибка";
          const attempts = (pair.scheduleAttempts ?? 0) + 1;
          if (isTransientScheduleFailure(status) && attempts < MAX_SCHEDULE_ATTEMPTS) {
            next.push({ ...pair, scheduling: false, scheduleAttempts: attempts, scheduleError: message });
          } else {
            next.push({ ...pair, scheduling: false, scheduleAttempts: attempts, scheduleError: "", error: message });
          }
        }
      }
      persist(next);
      pairPollGate.current.success();
      return next;
    } catch (error) {
      pairPollGate.current.failure(error);
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Ошибка генерации" });
      return current;
    } finally {
      pairPollGate.current.finish();
    }
  }, [persist, user]);

  const pollCatchUp = useCallback(() => {
    return refreshPairs(readStoredPairs().length ? readStoredPairs() : pairs, true);
  }, [pairs, refreshPairs]);

  useEffect(() => {
    const stored = readStoredPairs();
    if (stored.length) persist(revivePairs(stored, false));
    void loadPreview();
  }, [loadPreview, persist]);

  const retryable = pairs.some((pair) => isRetryablePair(pair) && Boolean(pair.error));
  function retryFailedSlots() {
    setNotice(null);
    pairPollGate.current.success();
    const revived = revivePairs(readStoredPairs().length ? readStoredPairs() : pairs, true);
    persist(revived);
    void refreshPairs(revived);
  }
  useAdminActivePolling(active, pollCatchUp, 8_000, { pauseWhenHidden: false });

  async function waitForWorkers(token: string) {
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      const [videoResponse, imageResponse] = await Promise.all([
        fetch("/api/admin/videos", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
        fetch("/api/admin/ai-image", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
      ]);
      const videoPayload = (await videoResponse.json()) as { worker?: WorkerStatus };
      const imagePayload = (await imageResponse.json()) as { worker?: WorkerStatus };
      const videoOnline = Boolean(videoPayload.worker?.online);
      const imageOnline = Boolean(imagePayload.worker?.online);
      setVideoWorker({ online: videoOnline });
      setImageWorker({ online: imageOnline });
      if (videoOnline && imageOnline) return true;
      await new Promise((resolve) => setTimeout(resolve, 3_000));
    }
    return false;
  }

  const failedCount = pairs.filter(isFailedGeneration).length;

  /** `fillGaps` re-queues only as many pairs as failed, into the earliest free slots (the holes they left). */
  async function startCatchUp(fillGaps = false) {
    setRunning(true);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const stored = readStoredPairs().length ? readStoredPairs() : pairs;
      const gaps = fillGaps ? stored.filter(isFailedGeneration).length : 0;
      if (fillGaps && !gaps) throw new Error("Нет проваленных пар — заполнять нечего");
      setNotice({
        type: "ok",
        text: fillGaps
          ? `Поднимаем воркеры и ставим ${gaps} новых пар в освободившиеся слоты…`
          : "Поднимаем воркеры на этом Mac и ставим ночной цикл в очередь…",
      });
      const response = await fetch("/api/admin/auto-content", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(fillGaps ? { catchUp: true, fillGaps: true, count: gaps, sendToTelegram: true } : { catchUp: true, sendToTelegram: true }),
      });
      const payload = (await response.json()) as { pairs?: CatchUpPair[]; slots?: { slots?: Slot[] }; error?: string };
      if (!response.ok || !payload.pairs?.length) throw new Error(payload.error || "Не удалось запустить пропущенную ночь");
      if (payload.slots?.slots && !fillGaps) setSlots(payload.slots.slots);
      // Refill keeps the pairs that made it and swaps the failed ones for the new batch.
      const next = fillGaps ? [...stored.filter((pair) => !isFailedGeneration(pair)), ...payload.pairs] : payload.pairs;
      persist(next);
      const woke = await waitForWorkers(token);
      void refreshPairs(next);
      setNotice({
        type: woke ? "ok" : "error",
        text: woke
          ? `Воркеры запущены. В очереди ${payload.pairs.length} видео и ${payload.pairs.length} картинок — слоты проставятся сами.`
          : "Очередь поставлена, но воркеры ещё не поднялись. Оставь Mac открытым — супервизор повторит старт.",
      });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Ошибка запуска" });
    } finally {
      setRunning(false);
    }
  }

  /** One video + one image a day: preview first, then re-time everything booked from tomorrow on. */
  async function respace(dryRun: boolean) {
    setRespacing(true);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/auto-content", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ respace: true, dryRun }),
      });
      const payload = (await response.json()) as {
        moves?: RespaceMove[];
        count?: number;
        lastDay?: string;
        errors?: number;
        youtubeLater?: number;
        strayImages?: Array<{ title: string; scheduledAt: string }>;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || "Не удалось перенести публикации");
      const moves = payload.moves || [];
      if (dryRun) {
        setRespacePreview(moves);
        setNotice({ type: "ok", text: `Будет ${moves.length} видео по одному в день, последнее — ${payload.lastDay || "—"}. Проверьте список и нажмите «Применить».` });
        return;
      }
      setRespacePreview(moves);
      const failed = moves.filter((move) => move.errors.length);
      const text = [
        `Перенесено: ${moves.length} видео, по одному в день до ${payload.lastDay || "—"}`,
        payload.youtubeLater ? `YouTube ещё не загружен у ${payload.youtubeLater} — нажмите «Применить» ещё раз` : "",
        payload.strayImages?.length ? `картинок без пары оставлено как было: ${payload.strayImages.length}` : "",
        failed.length ? `ошибки: ${failed.map((move) => `${move.slug || move.libraryId} — ${move.errors.join(", ")}`).join("; ")}` : "",
      ].filter(Boolean).join(" · ");
      setNotice({ type: failed.length ? "error" : "ok", text });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Ошибка переноса" });
    } finally {
      setRespacing(false);
    }
  }

  /** Pairs booked before 2026-09-23 have a video slot but no image: queue the image at 19:00 ET the same day. */
  async function backfillImages() {
    setBackfilling(true);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/auto-content", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ backfillImages: true }),
      });
      const payload = (await response.json()) as {
        booked?: number;
        already?: number;
        missed?: number;
        errors?: number;
        items?: Array<{ slug: string; outcome: string; imagePublishAt: string; error: string }>;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || "Не удалось добронировать картинки");
      const booked = (payload.items || []).filter((item) => item.outcome === "booked");
      const failed = (payload.items || []).filter((item) => item.outcome === "error");
      const text = [
        booked.length
          ? `Картинки поставлены: ${booked.map((item) => `${item.slug} → ${slotLabel(item.imagePublishAt)}`).join(", ")}`
          : "Новых картинок ставить нечего",
        `уже стояло ${payload.already ?? 0}`,
        payload.missed ? `время картинки уже прошло у ${payload.missed}` : "",
        failed.length ? `ошибки: ${failed.map((item) => `${item.slug} — ${item.error}`).join("; ")}` : "",
      ]
        .filter(Boolean)
        .join(" · ");
      setNotice({ type: failed.length ? "error" : "ok", text });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Ошибка добронирования" });
    } finally {
      setBackfilling(false);
    }
  }

  return (
    <div className="rounded-2xl border border-violet-500/25 bg-violet-500/[.06] p-4 space-y-3">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-500">Ночная автоматизация</p>
      <p className="text-sm leading-6 text-[var(--muted)]">
        Каждый день — одно видео во все соцсети в 12:00 ET и одна картинка (Instagram, Facebook, Threads) в 19:00 ET. Если ночной запуск в 02:00 пропущен — одна кнопка. Она сама поднимает воркеры на этом Mac и повторяет цикл: {AUTO_PAIR_COUNT} Free Mix + {AUTO_PAIR_COUNT} Veo на ближайший свободный день. Терминал открывать не нужно.
      </p>
      <p className="text-sm font-semibold text-[var(--text)]">Ближайшие слоты: {slotText}</p>
      <div className="flex flex-wrap gap-2 text-xs font-semibold">
        <span className={`rounded-full px-2.5 py-1 ${videoWorker.online ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-700"}`}>
          video-worker {videoWorker.online ? "онлайн" : "выключен"}
        </span>
        <span className={`rounded-full px-2.5 py-1 ${imageWorker.online ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-700"}`}>
          ai-image-worker {imageWorker.online ? "онлайн" : "выключен"}
        </span>
      </div>
      <button
        type="button"
        disabled={running || active}
        onClick={() => void startCatchUp()}
        className="rounded-full bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-500 disabled:opacity-50"
      >
        {running ? "Запускаем воркеры и очередь…" : active ? "Пропущенная ночь уже идёт" : "Запустить пропущенную ночь"}
      </button>
      {retryable && (
        <button
          type="button"
          onClick={retryFailedSlots}
          className="ml-2 rounded-full border border-violet-500/40 px-4 py-2 text-sm font-semibold text-violet-500 hover:bg-violet-500/10"
        >
          Повторить постановку в слот
        </button>
      )}
      {failedCount > 0 && !running && (
        <button
          type="button"
          disabled={running}
          onClick={() => void startCatchUp(true)}
          className="ml-2 rounded-full border border-violet-500/40 px-4 py-2 text-sm font-semibold text-violet-500 hover:bg-violet-500/10 disabled:opacity-50"
        >
          Перегенерировать {failedCount} в свободные слоты
        </button>
      )}
      <button
        type="button"
        disabled={backfilling}
        onClick={() => void backfillImages()}
        title="Для каждой уже запланированной пары без картинки ставит картинку в соцсети в 19:00 ET того же дня"
        className="ml-2 rounded-full border border-violet-500/40 px-4 py-2 text-sm font-semibold text-violet-500 hover:bg-violet-500/10 disabled:opacity-50"
      >
        {backfilling ? "Ставим картинки…" : "Добронировать картинки 19:00 ET"}
      </button>
      <button
        type="button"
        disabled={respacing}
        onClick={() => void respace(respacePreview === null)}
        title="Всё, что уже стоит в очереди с завтрашнего дня, разносится по одному видео в день (12:00 ET) и одной картинке (19:00 ET): соцсети, YouTube и Positioner"
        className="ml-2 rounded-full border border-violet-500/40 px-4 py-2 text-sm font-semibold text-violet-500 hover:bg-violet-500/10 disabled:opacity-50"
      >
        {respacing ? "Переносим…" : respacePreview === null ? "1 видео в день: показать перенос" : "Применить перенос"}
      </button>
      {respacePreview && respacePreview.length > 0 && (
        <ul className="max-h-64 space-y-1 overflow-y-auto text-xs text-[var(--text)]">
          {respacePreview.map((move) => (
            <li key={move.libraryId}>
              <span className="text-[var(--muted)]">{slotLabel(move.from)}</span>
              {" → "}
              <span className="font-semibold">{slotLabel(move.to)}</span>
              {" · "}
              {move.title || move.slug}
              {" · YouTube "}
              {RESPACE_YOUTUBE_LABEL[move.youtube] || move.youtube}
              {move.imageAt ? ` · картинка ${slotLabel(move.imageAt)}` : " · без картинки"}
              {move.errors.length ? <span className="text-red-500"> · {move.errors.join(", ")}</span> : null}
            </li>
          ))}
        </ul>
      )}
      {pairs.length > 0 && (
        <ul className="space-y-1.5 text-sm text-[var(--text)]">
          {pairs.map((pair) => (
            <li key={`${pair.videoJobId}:${pair.imageJobId}`}>
              <span className="font-semibold">{slotLabel(pair.publishAt)}</span>
              {" · "}
              {pair.title}
              {" · "}
              <span className={pair.error ? "text-red-500" : pair.scheduled ? "text-emerald-600" : "text-[var(--muted)]"}>
                {pairLine(pair)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {notice && (
        <p className={`text-sm font-semibold ${notice.type === "ok" ? "text-emerald-600" : "text-red-500"}`}>{notice.text}</p>
      )}
    </div>
  );
}
