"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import {
  AI_VIDEO_MAX_DURATION_SECONDS,
  AI_VIDEO_MODES,
  type AdminAiVideoJob,
  type AiVideoMode,
  type AiVideoPublicConfig,
} from "@/lib/adminAiVideo";

const WORKER_COMMAND = "cd /Users/dimab/Documents/oneiro-web && npm run ai-video-worker";

type WorkerStatus = {
  online: boolean;
  lastSeenAt: string | null;
  host: string;
  state: string;
  currentJobId: string;
};

type BudgetStatus = { date: string; reservedUsd: number; jobsCount: number };

const DEFAULT_CONFIG: AiVideoPublicConfig = {
  paidGenerationEnabled: false,
  pricePerSecondUsd: 0.05,
  veoPricePerSecondUsd: 0.03,
  dailyBudgetUsd: 5,
  maxJobsPerDay: 2,
  model: "sora-2",
  veoModel: "veo-3.1-lite-generate-001",
  prices: { preview: 0.2, standard: 1.6, combined: 0.4, veo: 0.96 },
};

function statusLabel(status: AdminAiVideoJob["status"]) {
  return { queued: "В очереди", processing: "Генерация", completed: "Готово", failed: "Ошибка" }[status];
}

function statusColor(status: AdminAiVideoJob["status"]) {
  return status === "completed" ? "text-emerald-500 bg-emerald-500/10" : status === "failed" ? "text-red-500 bg-red-500/10" : "text-violet-500 bg-violet-500/10";
}

export default function AiVideoAdminPanel({ user, studio }: { user: User; studio: "sora" | "combined" | "veo" }) {
  const isCombined = studio === "combined";
  const isVeo = studio === "veo";
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState<AiVideoMode>(isCombined ? "combined" : isVeo ? "veo" : "preview");
  const [sendToTelegram, setSendToTelegram] = useState(true);
  const [costConfirmed, setCostConfirmed] = useState(false);
  const [jobs, setJobs] = useState<AdminAiVideoJob[]>([]);
  const [config, setConfig] = useState<AiVideoPublicConfig>(DEFAULT_CONFIG);
  const [budget, setBudget] = useState<BudgetStatus>({ date: "", reservedUsd: 0, jobsCount: 0 });
  const [worker, setWorker] = useState<WorkerStatus>({ online: false, lastSeenAt: null, host: "", state: "offline", currentJobId: "" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busyJob, setBusyJob] = useState("");
  const [notice, setNotice] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [copied, setCopied] = useState("");
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }), []);
  const numberFormatter = useMemo(() => new Intl.NumberFormat("ru-RU"), []);
  const usd = useMemo(() => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }), []);
  const modeConfig = AI_VIDEO_MODES[mode];
  const estimatedPrice = config.prices[mode];

  const loadJobs = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/ai-video", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const payload = (await response.json()) as {
        jobs?: AdminAiVideoJob[];
        config?: AiVideoPublicConfig;
        budget?: BudgetStatus;
        worker?: WorkerStatus;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || "Не удалось загрузить задания");
      setJobs((payload.jobs ?? []).filter((job) => isCombined ? job.mode === "combined" : isVeo ? job.mode === "veo" : job.mode === "preview" || job.mode === "standard"));
      setConfig(payload.config ?? DEFAULT_CONFIG);
      setBudget(payload.budget ?? { date: "", reservedUsd: 0, jobsCount: 0 });
      setWorker(payload.worker ?? { online: false, lastSeenAt: null, host: "", state: "offline", currentJobId: "" });
    } catch (error) {
      if (!quiet) setNotice({ type: "error", text: error instanceof Error ? error.message : "Ошибка загрузки" });
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [isCombined, isVeo, user]);

  useEffect(() => {
    void loadJobs();
    const timer = window.setInterval(() => void loadJobs(true), 5_000);
    return () => window.clearInterval(timer);
  }, [loadJobs]);

  useEffect(() => setCostConfirmed(false), [mode]);

  function copy(key: string, value: string) {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(key);
      window.setTimeout(() => setCopied(""), 2_000);
    });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (topic.trim().length < 5 || !costConfirmed || !config.paidGenerationEnabled) return;
    setSubmitting(true);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/ai-video", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ topic, mode, sendToTelegram, costConfirmed: true }),
      });
      const payload = (await response.json()) as { job?: AdminAiVideoJob; error?: string };
      if (!response.ok || !payload.job) throw new Error(payload.error || "Не удалось поставить задание в очередь");
      setJobs((current) => [payload.job!, ...current]);
      setBudget((current) => ({ ...current, reservedUsd: current.reservedUsd + payload.job!.estimatedCostUsd, jobsCount: current.jobsCount + 1 }));
      setTopic("");
      setCostConfirmed(false);
      setNotice({ type: "ok", text: `${isVeo ? "Veo" : "Sora"}-видео поставлено в очередь. Стоимость зарезервирована в дневном лимите.` });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Ошибка создания задания" });
    } finally {
      setSubmitting(false);
    }
  }

  async function retry(job: AdminAiVideoJob, action: "resume" | "telegram") {
    setBusyJob(`${job.id}:${action}`);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/admin/ai-video/${encodeURIComponent(job.id)}/retry`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = (await response.json()) as { job?: AdminAiVideoJob; error?: string };
      if (!response.ok || !payload.job) throw new Error(payload.error || "Не удалось повторить задание");
      setJobs((current) => current.map((item) => item.id === job.id ? payload.job! : item));
      setNotice({ type: "ok", text: action === "telegram" ? "Повторная отправка в Telegram поставлена в очередь." : "Задание продолжится с сохранённых сцен и task ID." });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Ошибка повтора" });
    } finally {
      setBusyJob("");
    }
  }

  const card = "rounded-2xl bg-[var(--card)] border border-[var(--border)]";
  const input = "w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-[var(--text)] outline-none focus:ring-2 focus:ring-violet-500/25";
  const copyButton = (key: string, value: string) => (
    <button type="button" onClick={() => copy(key, value)} className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-bold text-[var(--muted)]">
      {copied === key ? "Скопировано" : "Копировать"}
    </button>
  );

  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <form onSubmit={submit} className={`${card} space-y-5 p-6`}>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-500">{isCombined ? "AI Video · Combined" : isVeo ? "Video · Veo 3.1 Lite" : "AI Video · Sora 2 Slow"}</p>
            <h2 className="mt-2 text-2xl font-bold text-[var(--text)]">{isCombined ? "Sora + бесплатные стоки" : isVeo ? "YouTube Short через Veo Lite" : "Автоматический YouTube Short"}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{isCombined ? "1 сцена Sora → 3 сцены Pexels → озвучка → караоке-субтитры → MP4 → обложка → Telegram." : isVeo ? "Тема → сценарий → 4 вертикальные сцены Veo Lite → озвучка → караоке-субтитры → MP4 → обложка → Telegram." : "Тема → сценарий → Sora-сцены через Batch API → озвучка → караоке-субтитры → MP4 → обложка → Telegram."}</p>
          </div>

          {!config.paidGenerationEnabled && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold leading-6 text-amber-600">
              Платная генерация отключена на сервере. Установите <code>AI_VIDEO_PAID_GENERATION_ENABLED=true</code> только когда будете готовы тратить средства.
            </div>
          )}

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[var(--text)]">Тема видео</span>
            <textarea value={topic} onChange={(event) => setTopic(event.target.value)} className={`${input} min-h-28 resize-y`} placeholder="Например: Why do we dream about falling?" minLength={5} maxLength={500} required />
            <span className="mt-1 block text-right text-xs text-[var(--muted)]">{topic.length}/500</span>
          </label>

          {!isCombined && !isVeo && <fieldset>
            <legend className="mb-2 text-sm font-semibold text-[var(--text)]">Режим</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {(["preview", "standard"] as const).map((value) => {
                const details = AI_VIDEO_MODES[value];
                return (
                  <label key={value} className={`cursor-pointer rounded-xl border p-4 transition ${mode === value ? "border-violet-500 bg-violet-500/[.06]" : "border-[var(--border)]"}`}>
                    <span className="flex items-center justify-between gap-2"><span className="font-bold capitalize text-[var(--text)]">{value}</span><input type="radio" name="mode" value={value} checked={mode === value} onChange={() => setMode(value)} className="accent-violet-500" /></span>
                    <span className="mt-2 block text-xs leading-5 text-[var(--muted)]">{details.sceneCount} {details.sceneCount === 1 ? "сцена" : "сцены"} × {details.sceneSeconds} сек. · {usd.format(config.prices[value])}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>}

          {isCombined && <div className="rounded-xl border border-violet-500/30 bg-violet-500/[.06] p-4"><p className="font-bold text-[var(--text)]">Combined · 4 сцены</p><p className="mt-2 text-xs leading-5 text-[var(--muted)]">1 уникальная сцена Sora 2 (8 сек.) + 3 бесплатные вертикальные сцены Pexels. Монтаж, озвучка и субтитры такие же, как в полном режиме.</p></div>}

          {isVeo && <div className="rounded-xl border border-violet-500/30 bg-violet-500/[.06] p-4"><p className="font-bold text-[var(--text)]">Veo 3.1 Lite · 4 сцены</p><p className="mt-2 text-xs leading-5 text-[var(--muted)]">4 уникальные вертикальные сцены по 8 сек. через Vertex AI. Нативный звук отключён: итоговая дорожка использует ту же озвучку и субтитры, что и остальные студии.</p></div>}

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Язык", "English only"],
              ["Сцены", isCombined ? "1 Sora + 3 stock" : isVeo ? "4 Veo × 8 сек." : `${modeConfig.sceneCount} × ${modeConfig.sceneSeconds} сек.`],
              ["Формат", `9:16 · 720×1280 · ≤${AI_VIDEO_MAX_DURATION_SECONDS} сек.`],
            ].map(([label, value]) => <div key={label} className="rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--text)_4%,transparent)] p-4"><p className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p><p className="mt-1 text-sm font-bold text-[var(--text)]">{value}</p></div>)}
          </div>

          <div className="rounded-2xl border border-violet-500/25 bg-violet-500/[.05] p-4">
            <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-500">{isVeo ? "Оценка Veo Lite" : "Оценка Sora Batch"}</p><p className="mt-1 text-sm text-[var(--muted)]">{modeConfig.generatedSeconds} платных сек. × {usd.format(isVeo ? config.veoPricePerSecondUsd : config.pricePerSecondUsd)}/сек.</p></div><p className="text-3xl font-black text-[var(--text)]">{usd.format(estimatedPrice)}</p></div>
            <p className="mt-2 text-xs font-semibold text-violet-500">{isVeo ? "Vertex AI · Veo 3.1 Lite · 720p · audio off." : "Медленная очередь OpenAI Batch · completion window до 24 часов."}</p>
            <p className="mt-3 text-xs leading-5 text-[var(--muted)]">Дневной лимит: {usd.format(budget.reservedUsd)} / {usd.format(config.dailyBudgetUsd)} · заданий {budget.jobsCount} / {config.maxJobsPerDay}</p>
          </div>

          <label className="flex cursor-pointer gap-3 rounded-xl border border-[var(--border)] p-4">
            <input type="checkbox" checked={sendToTelegram} onChange={(event) => setSendToTelegram(event.target.checked)} className="mt-1 h-4 w-4 accent-violet-500" />
            <span><span className="block text-sm font-semibold text-[var(--text)]">Доставить в приватный Telegram</span><span className="mt-1 block text-xs leading-5 text-[var(--muted)]">Ошибка Telegram не изменит статус успешно созданного видео.</span></span>
          </label>

          <label className="flex cursor-pointer gap-3 rounded-xl border border-red-500/25 bg-red-500/[.035] p-4">
            <input type="checkbox" checked={costConfirmed} onChange={(event) => setCostConfirmed(event.target.checked)} className="mt-1 h-4 w-4 accent-red-500" />
            <span className="text-sm font-semibold leading-6 text-[var(--text)]">Я подтверждаю платную генерацию {isVeo ? "Veo" : "Sora"} с оценочной стоимостью {usd.format(estimatedPrice)}. Подтверждение будет повторно проверено сервером.</span>
          </label>

          <button type="submit" disabled={submitting || topic.trim().length < 5 || !costConfirmed || !config.paidGenerationEnabled} className="rounded-full bg-violet-600 px-6 py-3 text-sm font-bold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-45">
            {submitting ? "Резервируем и ставим в очередь…" : `Создать за ${usd.format(estimatedPrice)}`}
          </button>
        </form>

        <aside className={`${card} h-fit p-6`}>
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">{isCombined ? "Combined worker" : isVeo ? "Veo worker" : "Sora Batch worker"}</p><h3 className="mt-1 text-xl font-bold text-[var(--text)]">{worker.online ? "Worker подключён" : "Worker не подключён"}</h3><p className="mt-1 text-xs text-[var(--muted)]">{worker.online ? `${worker.state}${worker.host ? ` · ${worker.host}` : ""}` : "Запустите локальный процесс"}</p></div>
            <span className={`h-3 w-3 rounded-full ${worker.online ? "bg-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,.12)]" : "bg-amber-500"}`} />
          </div>
          <div className="mt-5 rounded-2xl border border-[var(--border)] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text)]">Команда worker</p>
            <code className="mt-3 block overflow-x-auto rounded-xl bg-[var(--text)] px-3 py-3 text-xs text-[var(--bg)]">{WORKER_COMMAND}</code>
            <button type="button" onClick={() => copy("worker", WORKER_COMMAND)} className="mt-3 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-bold text-[var(--text)]">{copied === "worker" ? "Скопировано" : "Скопировать команду"}</button>
            <p className="mt-4 text-xs leading-5 text-[var(--muted)]">Worker возобновляет сохранённые {isVeo ? "Veo operation ID и готовые локальные сцены" : "Batch ID, Sora video ID, стоковые файлы и готовые локальные сцены"}. Не удаляйте рабочую папку во время незавершённых заданий.</p>
          </div>
          <div className="mt-4 rounded-xl bg-[color-mix(in_srgb,var(--text)_4%,transparent)] p-4 text-xs leading-6 text-[var(--muted)]">
            <p><b className="text-[var(--text)]">Модель:</b> {isVeo ? `${config.veoModel} · Vertex AI` : `${config.model} · Batch API`}</p>
            {isCombined && <p><b className="text-[var(--text)]">Стоки:</b> Pexels · бесплатно</p>}
            <p><b className="text-[var(--text)]">Размер:</b> 720×1280, 30 fps</p>
            <p><b className="text-[var(--text)]">Выход:</b> H.264 High · yuv420p · AAC</p>
          </div>
        </aside>
      </div>

      {notice && <p className={`rounded-xl px-4 py-3 text-sm font-semibold ${notice.type === "ok" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>{notice.text}</p>}

      <section className={`${card} p-6`}>
        <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-500">{isCombined ? "История Combined" : isVeo ? "История Veo Lite" : "История Sora Batch"}</p><h2 className="mt-1 text-2xl font-bold text-[var(--text)]">Задания и публикация</h2></div><button type="button" onClick={() => void loadJobs()} className="text-sm font-semibold text-[var(--muted)] underline">Обновить</button></div>
        {loading ? <div className="mt-6 h-28 animate-pulse rounded-2xl bg-[color-mix(in_srgb,var(--text)_8%,transparent)]" /> : jobs.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--muted)]">{isCombined ? "Combined-видео ещё не создавались." : isVeo ? "Veo-видео ещё не создавались." : "Sora-видео ещё не создавались."}</div> : (
          <div className="mt-6 space-y-4">
            {jobs.map((job) => {
              const metadata = job.youtubeMetadata;
              const tags = metadata?.tags.join(", ") ?? "";
              const hashtags = metadata?.hashtags.map((tag) => `#${tag.replace(/^#/, "")}`).join(" ") ?? "";
              const allMetadata = metadata ? [`Title:\n${metadata.title}`, `Description:\n${metadata.description}`, `Tags:\n${tags}`, `Hashtags:\n${hashtags}`, `Thumbnail:\n${metadata.thumbnailText}`, `Pinned comment:\n${metadata.pinnedComment}`, `Category:\n${metadata.category}`].join("\n\n") : "";
              return (
                <article key={job.id} className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-5">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row">
                    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusColor(job.status)}`}>{statusLabel(job.status)}</span><span className="text-xs text-[var(--muted)]">{job.mode} · {job.sceneCount}×{job.sceneSeconds} сек. · {usd.format(job.estimatedCostUsd)}</span></div><h3 className="mt-3 text-lg font-bold text-[var(--text)]">{job.topic}</h3><p className="mt-1 text-xs text-[var(--muted)]">{dateFormatter.format(new Date(job.createdAt))} · {job.stage}</p></div>
                    <div className="flex h-fit flex-wrap gap-2">{job.videoUrl && <a href={job.videoUrl} target="_blank" rel="noreferrer" className="rounded-full bg-[var(--text)] px-4 py-2.5 text-sm font-bold text-[var(--bg)]">Открыть MP4</a>}{job.thumbnailUrl && <a href={job.thumbnailUrl} target="_blank" rel="noreferrer" className="rounded-full border border-[var(--border)] px-4 py-2.5 text-sm font-bold text-[var(--text)]">Обложка</a>}</div>
                  </div>

                  <div className="mt-4"><div className="mb-1 flex justify-between text-xs text-[var(--muted)]"><span>{job.stage}</span><span>{Math.round(job.progress)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--text)_8%,transparent)]"><div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${job.progress}%` }} /></div></div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-4">
                    <div className="rounded-xl bg-[color-mix(in_srgb,var(--text)_5%,transparent)] px-3 py-2"><p className="text-[11px] uppercase text-[var(--muted)]">Generated</p><p className="mt-1 font-bold text-[var(--text)]">{job.generatedSeconds} sec</p></div>
                    <div className="rounded-xl bg-[color-mix(in_srgb,var(--text)_5%,transparent)] px-3 py-2"><p className="text-[11px] uppercase text-[var(--muted)]">Provider cost</p><p className="mt-1 font-bold text-[var(--text)]">{usd.format(job.estimatedCostUsd)}</p></div>
                    <div className="rounded-xl bg-[color-mix(in_srgb,var(--text)_5%,transparent)] px-3 py-2"><p className="text-[11px] uppercase text-[var(--muted)]">{job.provider === "veo" ? "Veo model" : "Sora model"}</p><p className="mt-1 truncate font-bold text-[var(--text)]">{job.providerUsage.model}</p></div>
                    <div className="rounded-xl bg-[color-mix(in_srgb,var(--text)_5%,transparent)] px-3 py-2"><p className="text-[11px] uppercase text-[var(--muted)]">{job.provider === "veo" ? "Veo operations" : "Sora IDs"}</p><p className="mt-1 font-bold text-[var(--text)]">{job.providerTaskIds.filter(Boolean).length}/{job.soraSceneCount}</p></div>
                  </div>

                  {job.sceneStates.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{job.sceneStates.map((scene) => <span key={scene.index} title={scene.taskId || scene.error || "Not submitted"} className={`rounded-full border px-3 py-1 text-xs font-semibold ${scene.status === "completed" ? "border-emerald-500/30 text-emerald-500" : scene.status === "failed" ? "border-red-500/30 text-red-500" : "border-[var(--border)] text-[var(--muted)]"}`}>{job.provider === "veo" ? "Veo" : "Sora"} {scene.index + 1} · {scene.status} {scene.progress ? `${Math.round(scene.progress)}%` : ""}</span>)}</div>}

                  {job.mode === "combined" && <div className="mt-3 flex flex-wrap gap-2">{Array.from({ length: job.stockSceneCount }, (_, index) => { const asset = job.stockAssets[index]; return <span key={index} title={asset?.sourceUrl || job.stockSearchTerms[index] || "Pexels stock"} className={`rounded-full border px-3 py-1 text-xs font-semibold ${asset ? "border-emerald-500/30 text-emerald-500" : "border-[var(--border)] text-[var(--muted)]"}`}>Stock {index + 1} · {asset ? "ready" : "pending"}</span>; })}</div>}

                  {job.tokenUsage && <div className="mt-4 grid gap-2 sm:grid-cols-4">{[["Prompt tokens", job.tokenUsage.prompt], ["Completion tokens", job.tokenUsage.completion], ["Total tokens", job.tokenUsage.total]].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-[color-mix(in_srgb,var(--text)_5%,transparent)] px-3 py-2"><p className="text-[11px] uppercase text-[var(--muted)]">{label}</p><p className="mt-1 font-bold text-[var(--text)]">{numberFormatter.format(Number(value))}</p></div>)}<div className="rounded-xl bg-[color-mix(in_srgb,var(--text)_5%,transparent)] px-3 py-2"><p className="text-[11px] uppercase text-[var(--muted)]">LLM</p><p className="mt-1 truncate text-sm font-bold text-[var(--text)]">{job.tokenUsage.model}</p></div></div>}

                  {metadata && <div className="mt-5 rounded-2xl border border-violet-500/20 bg-violet-500/[.035] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-500">YouTube publishing package</p><h4 className="mt-1 text-lg font-bold text-[var(--text)]">Готово к публикации</h4></div><button type="button" onClick={() => copy(`${job.id}:all`, allMetadata)} className="rounded-full bg-violet-600 px-4 py-2 text-xs font-bold text-white">{copied === `${job.id}:all` ? "Скопировано" : "Скопировать всё"}</button></div><div className="mt-4 space-y-3">{[["Title", metadata.title, "title"], ["Description", metadata.description, "description"], ["Tags", tags, "tags"], ["Hashtags", hashtags, "hashtags"], ["Thumbnail text", metadata.thumbnailText, "thumbnail"], ["Pinned comment", metadata.pinnedComment, "pinned"], ["Category", metadata.category, "category"]].map(([label, value, key]) => <div key={key} className="rounded-xl bg-[var(--card)] p-3"><div className="flex items-start justify-between gap-3"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>{copyButton(`${job.id}:${key}`, value)}</div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text)]">{value}</p></div>)}</div></div>}

                  {job.telegramMessageId && <p className="mt-3 text-xs font-semibold text-emerald-500">Telegram delivered · message {job.telegramMessageId}</p>}
                  {job.telegramError && <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-600"><span>Telegram: {job.telegramError}</span>{job.status === "completed" && <button type="button" disabled={busyJob === `${job.id}:telegram`} onClick={() => void retry(job, "telegram")} className="rounded-full border border-amber-500/30 px-3 py-1.5 font-bold disabled:opacity-50">{busyJob === `${job.id}:telegram` ? "Ставим в очередь…" : "Повторить доставку"}</button>}</div>}
                  {job.error && <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-500"><span>{job.error}</span>{job.status === "failed" && <button type="button" disabled={busyJob === `${job.id}:resume`} onClick={() => void retry(job, "resume")} className="rounded-full border border-red-500/30 px-3 py-1.5 font-bold disabled:opacity-50">{busyJob === `${job.id}:resume` ? "Ставим в очередь…" : "Продолжить без повтора готовых сцен"}</button>}</div>}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
