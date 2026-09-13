"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { AUTO_PAIR_COUNT } from "@/lib/adminAutoSlots";
import { useAdminActivePolling } from "./useAdminActivePolling";

const STORAGE_KEY = "dreamly.autoCatchUp";

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
  error?: string;
};

type WorkerStatus = { online: boolean };

function slotLabel(publishAt: string) {
  const when = new Date(publishAt);
  if (!Number.isFinite(when.getTime())) return publishAt;
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Asia/Jerusalem",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(when);
}

function pairLine(pair: CatchUpPair) {
  if (pair.error) return pair.error;
  if (pair.scheduled) return pair.youtubeScheduled === false ? "в слоте, YouTube не ушёл" : "поставлено в слот";
  if (pair.scheduling) return "ставим в слот…";
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

export default function AutoDictionaryCatchUpCard({ user }: { user: User }) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [pairs, setPairs] = useState<CatchUpPair[]>([]);
  const [videoWorker, setVideoWorker] = useState<WorkerStatus>({ online: false });
  const [imageWorker, setImageWorker] = useState<WorkerStatus>({ online: false });
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const slotText = useMemo(
    () => (slots.length ? slots.map((slot) => slotLabel(slot.publishAt)).join(" · ") : "свободные 05:00 и 15:00"),
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

  const refreshPairs = useCallback(async (current: CatchUpPair[]) => {
    if (!current.length) return current;
    const token = await user.getIdToken();
    const next = [];
    for (const pair of current) {
      if (pair.scheduled || pair.scheduling || pair.error) {
        next.push(pair);
        continue;
      }
      const response = await fetch(
        `/api/admin/auto-content/schedule?videoJobId=${encodeURIComponent(pair.videoJobId)}&imageJobId=${encodeURIComponent(pair.imageJobId)}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
      );
      const payload = (await response.json()) as {
        video?: { status?: string; error?: string };
        image?: { status?: string; error?: string };
        error?: string;
      };
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
        const bookedPayload = (await booked.json()) as { youtubeScheduled?: boolean; youtubeError?: string; error?: string };
        if (!booked.ok) {
          next.push({ ...pair, videoStatus, imageStatus, error: bookedPayload.error || "Не удалось поставить в слот" });
          continue;
        }
        next.push({
          ...pair,
          videoStatus,
          imageStatus,
          scheduled: true,
          youtubeScheduled: bookedPayload.youtubeScheduled !== false,
          error: bookedPayload.youtubeError || "",
        });
        continue;
      }
      next.push({ ...pair, videoStatus, imageStatus });
    }
    persist(next);
    return next;
  }, [persist, user]);

  const pollCatchUp = useCallback(() => {
    void refreshPairs(readStoredPairs().length ? readStoredPairs() : pairs);
  }, [pairs, refreshPairs]);

  useEffect(() => {
    const stored = readStoredPairs();
    if (stored.length) setPairs(stored);
    void loadPreview();
  }, [loadPreview]);
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

  async function startCatchUp() {
    setRunning(true);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      setNotice({ type: "ok", text: "Поднимаем воркеры на этом Mac и ставим ночной цикл в очередь…" });
      const response = await fetch("/api/admin/auto-content", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ catchUp: true, sendToTelegram: true }),
      });
      const payload = (await response.json()) as { pairs?: CatchUpPair[]; slots?: { slots?: Slot[] }; error?: string };
      if (!response.ok || !payload.pairs?.length) throw new Error(payload.error || "Не удалось запустить пропущенную ночь");
      if (payload.slots?.slots) setSlots(payload.slots.slots);
      persist(payload.pairs);
      const woke = await waitForWorkers(token);
      void refreshPairs(payload.pairs);
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

  return (
    <div className="rounded-2xl border border-violet-500/25 bg-violet-500/[.06] p-4 space-y-3">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-500">Ночная автоматизация</p>
      <p className="text-sm leading-6 text-[var(--muted)]">
        Если ночной запуск в 02:00 пропущен — одна кнопка. Она сама поднимает воркеры на этом Mac и повторяет цикл: {AUTO_PAIR_COUNT} Free Mix + {AUTO_PAIR_COUNT} Veo на два свободных дня (05:00 и 15:00). Терминал открывать не нужно.
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
      {pairs.length > 0 && (
        <ul className="space-y-1.5 text-sm text-[var(--text)]">
          {pairs.map((pair) => (
            <li key={`${pair.videoJobId}:${pair.imageJobId}`}>
              <span className="font-semibold">{pair.hour ? `${String(pair.hour).padStart(2, "0")}:00` : slotLabel(pair.publishAt)}</span>
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
