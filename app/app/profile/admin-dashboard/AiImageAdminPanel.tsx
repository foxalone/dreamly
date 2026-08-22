"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "firebase/auth";
import {
  AI_IMAGE_ASPECT_RATIO,
  AI_IMAGE_GEMINI_SIZE,
  AI_IMAGE_GOTHIC_PROMPT_TEMPLATE,
  AI_IMAGE_QUALITY,
  AI_IMAGE_SIZE,
  AI_IMAGE_SUBJECT_MAX_LENGTH,
  AI_IMAGE_TEMPLATE_MAX_LENGTH,
  buildGothicImagePrompt,
  type AdminAiImageJob,
  type AiImagePublicConfig,
} from "@/lib/adminAiImage";

const WORKER_COMMAND = "cd /Users/dimab/Documents/oneiro-web && npm run ai-image-worker";

type WorkerStatus = {
  online: boolean;
  lastSeenAt: string | null;
  host: string;
  state: string;
  currentJobId: string;
};

type BudgetStatus = { date: string; reservedUsd: number; jobsCount: number };

const DEFAULT_CONFIG: AiImagePublicConfig = {
  paidGenerationEnabled: false,
  dailyBudgetUsd: 10,
  maxJobsPerDay: 50,
  soraModel: "gpt-image-1-mini",
  veoModel: "gemini-3.1-flash-image",
  soraSize: AI_IMAGE_SIZE,
  soraQuality: AI_IMAGE_QUALITY,
  veoSize: AI_IMAGE_GEMINI_SIZE,
  veoAspectRatio: AI_IMAGE_ASPECT_RATIO,
  prices: { sora: 0.015, veo: 0.07 },
  promptTemplate: AI_IMAGE_GOTHIC_PROMPT_TEMPLATE,
};

function statusLabel(status: AdminAiImageJob["status"]) {
  return { queued: "В очереди", processing: "Генерация", completed: "Готово", failed: "Ошибка" }[status];
}

function statusColor(status: AdminAiImageJob["status"]) {
  return status === "completed" ? "text-emerald-500 bg-emerald-500/10" : status === "failed" ? "text-red-500 bg-red-500/10" : "text-violet-500 bg-violet-500/10";
}

function costLabel(job: AdminAiImageJob, usd: Intl.NumberFormat) {
  if (job.actualCostUsd != null) return `≈ ${usd.format(job.actualCostUsd)}`;
  return `оценка ${usd.format(job.estimatedCostUsd)}`;
}

export default function AiImageAdminPanel({ user, studio }: { user: User; studio: "sora" | "veo" }) {
  const isVeo = studio === "veo";
  const [subject, setSubject] = useState("");
  const [promptPreviewOpen, setPromptPreviewOpen] = useState(false);
  const [promptTemplate, setPromptTemplate] = useState(AI_IMAGE_GOTHIC_PROMPT_TEMPLATE);
  const [templateDirty, setTemplateDirty] = useState(false);
  const templateDirtyRef = useRef(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [jobPromptId, setJobPromptId] = useState("");
  const [sendToTelegram, setSendToTelegram] = useState(true);
  const [costConfirmed, setCostConfirmed] = useState(false);
  const [jobs, setJobs] = useState<AdminAiImageJob[]>([]);
  const [config, setConfig] = useState<AiImagePublicConfig>(DEFAULT_CONFIG);
  const [budget, setBudget] = useState<BudgetStatus>({ date: "", reservedUsd: 0, jobsCount: 0 });
  const [worker, setWorker] = useState<WorkerStatus>({ online: false, lastSeenAt: null, host: "", state: "offline", currentJobId: "" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busyJob, setBusyJob] = useState("");
  const [notice, setNotice] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [copied, setCopied] = useState("");
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }), []);
  const numberFormatter = useMemo(() => new Intl.NumberFormat("ru-RU"), []);
  const usd = useMemo(() => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 4 }), []);
  const estimatedPrice = isVeo ? config.prices.veo : config.prices.sora;
  const fullPrompt = useMemo(() => buildGothicImagePrompt(subject, promptTemplate), [promptTemplate, subject]);
  const templateHasSubject = promptTemplate.includes("[SUBJECT]");

  const loadJobs = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/ai-image", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const payload = (await response.json()) as {
        jobs?: AdminAiImageJob[];
        config?: AiImagePublicConfig;
        budget?: BudgetStatus;
        worker?: WorkerStatus;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || "Не удалось загрузить задания");
      setJobs((payload.jobs ?? []).filter((job) => (isVeo ? job.provider === "veo" : job.provider === "sora")));
      setConfig(payload.config ?? DEFAULT_CONFIG);
      if (!templateDirtyRef.current) setPromptTemplate(payload.config?.promptTemplate ?? AI_IMAGE_GOTHIC_PROMPT_TEMPLATE);
      setBudget(payload.budget ?? { date: "", reservedUsd: 0, jobsCount: 0 });
      setWorker(payload.worker ?? { online: false, lastSeenAt: null, host: "", state: "offline", currentJobId: "" });
    } catch (error) {
      if (!quiet) setNotice({ type: "error", text: error instanceof Error ? error.message : "Ошибка загрузки" });
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [isVeo, user]);

  useEffect(() => {
    void loadJobs();
    const timer = window.setInterval(() => void loadJobs(true), 5_000);
    return () => window.clearInterval(timer);
  }, [loadJobs]);

  function copy(key: string, value: string) {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(key);
      window.setTimeout(() => setCopied(""), 2_000);
    });
  }

  async function saveTemplate(nextTemplate = promptTemplate, reset = false) {
    if (!reset && (!nextTemplate.trim() || !nextTemplate.includes("[SUBJECT]"))) return;
    setSavingTemplate(true);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/ai-image", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(reset ? { reset: true } : { promptTemplate: nextTemplate }),
      });
      const payload = (await response.json()) as { config?: AiImagePublicConfig; error?: string };
      if (!response.ok || !payload.config) throw new Error(payload.error || "Не удалось сохранить промпт");
      setConfig(payload.config);
      setPromptTemplate(payload.config.promptTemplate);
      templateDirtyRef.current = false;
      setTemplateDirty(false);
      setNotice({ type: "ok", text: reset ? "Шаблон промпта сброшен к готическому дефолту." : "Шаблон промпта сохранён. Новые картинки будут использовать его." });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Ошибка сохранения промпта" });
    } finally {
      setSavingTemplate(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (subject.trim().length < 2 || !costConfirmed || !config.paidGenerationEnabled) return;
    setSubmitting(true);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/ai-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ subject, provider: studio, sendToTelegram, costConfirmed: true }),
      });
      const payload = (await response.json()) as { job?: AdminAiImageJob; error?: string };
      if (!response.ok || !payload.job) throw new Error(payload.error || "Не удалось поставить задание в очередь");
      setJobs((current) => [payload.job!, ...current]);
      setBudget((current) => ({ ...current, reservedUsd: current.reservedUsd + payload.job!.estimatedCostUsd, jobsCount: current.jobsCount + 1 }));
      setSubject("");
      setCostConfirmed(false);
      setPromptPreviewOpen(false);
      setNotice({ type: "ok", text: `${isVeo ? "Veo" : "Sora"}-картинка поставлена в очередь. После генерации появится приблизительная стоимость.` });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Ошибка создания задания" });
    } finally {
      setSubmitting(false);
    }
  }

  async function retry(job: AdminAiImageJob, action: "resume" | "telegram") {
    setBusyJob(`${job.id}:${action}`);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/admin/ai-image/${encodeURIComponent(job.id)}/retry`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = (await response.json()) as { job?: AdminAiImageJob; error?: string };
      if (!response.ok || !payload.job) throw new Error(payload.error || "Не удалось повторить задание");
      setJobs((current) => current.map((item) => (item.id === job.id ? payload.job! : item)));
      setNotice({ type: "ok", text: action === "telegram" ? "Повторная отправка в Telegram поставлена в очередь." : "Задание снова поставлено в очередь." });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Ошибка повтора" });
    } finally {
      setBusyJob("");
    }
  }

  async function downloadImage(job: AdminAiImageJob) {
    if (!job.imageUrl) return;
    setBusyJob(`${job.id}:download`);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/admin/ai-image/${encodeURIComponent(job.id)}/download`, {
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
      const filename = matched?.[1] || `${job.id}.jpg`;
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Ошибка скачивания" });
    } finally {
      setBusyJob("");
    }
  }

  const card = "rounded-2xl bg-[var(--card)] border border-[var(--border)]";
  const input = "w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-[var(--text)] outline-none focus:ring-2 focus:ring-violet-500/25";

  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <form onSubmit={submit} className={`${card} space-y-5 p-6`}>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-500">{isVeo ? "Image · Veo / Gemini Flash" : "Image · Sora / GPT Image mini"}</p>
            <h2 className="mt-2 text-2xl font-bold text-[var(--text)]">{isVeo ? "Картинка через Vertex (тот же аккаунт, что Veo)" : "Картинка через OpenAI (тот же ключ, что Sora)"}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{isVeo ? "Sora и Veo — видеомодели. Для картинок берём самую дешёвую image-модель того же Vertex-проекта: Gemini 3.1 Flash Image, 9:16, 1K." : "Sora не умеет stills. Берём самый дешёвый OpenAI image API: gpt-image-1-mini, portrait 1024×1536, quality medium. Медленнее — дешевле, это нормально."}</p>
          </div>

          {!config.paidGenerationEnabled && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold leading-6 text-amber-600">
              Платная генерация отключена на сервере. Включите <code>AI_VIDEO_PAID_GENERATION_ENABLED=true</code> или отдельно <code>AI_IMAGE_PAID_GENERATION_ENABLED=true</code>.
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center gap-2">
              <label htmlFor="ai-image-subject" className="text-sm font-semibold text-[var(--text)]">Сюжет [SUBJECT]</label>
              <button
                type="button"
                onClick={() => setPromptPreviewOpen((open) => !open)}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--border)] text-[11px] font-bold text-[var(--muted)] hover:border-violet-500 hover:text-violet-500"
                title="Показать и изменить полный промпт"
                aria-label="Показать и изменить полный промпт"
              >
                i
              </button>
            </div>
            <textarea
              id="ai-image-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className={`${input} min-h-28 resize-y`}
              placeholder="Например: a person falling through clouds in a dream"
              minLength={2}
              maxLength={AI_IMAGE_SUBJECT_MAX_LENGTH}
              required
            />
            <span className="mt-1 block text-right text-xs text-[var(--muted)]">{subject.length}/{AI_IMAGE_SUBJECT_MAX_LENGTH}</span>
          </div>

          {promptPreviewOpen && (
            <div className="rounded-xl border border-violet-500/25 bg-violet-500/[.05] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-500">Шаблон промпта</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => copy("full-prompt", fullPrompt)} className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-bold text-[var(--muted)]">
                    {copied === "full-prompt" ? "Скопировано" : "Копировать итог"}
                  </button>
                  <button
                    type="button"
                    disabled={savingTemplate}
                    onClick={() => void saveTemplate(AI_IMAGE_GOTHIC_PROMPT_TEMPLATE, true)}
                    className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-bold text-[var(--muted)] disabled:opacity-50"
                  >
                    Сбросить
                  </button>
                  <button
                    type="button"
                    disabled={savingTemplate || !templateHasSubject || promptTemplate.trim().length < 1}
                    onClick={() => void saveTemplate()}
                    className="rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {savingTemplate ? "Сохраняем…" : "Сохранить"}
                  </button>
                </div>
              </div>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Оставь плейсхолдер <code>[SUBJECT]</code> — туда подставится сюжет из поля выше. Шаблон общий для Sora и Veo.</p>
              <textarea
                value={promptTemplate}
                onChange={(event) => {
                  setPromptTemplate(event.target.value);
                  templateDirtyRef.current = true;
                  setTemplateDirty(true);
                }}
                className={`${input} mt-3 min-h-56 resize-y font-mono text-xs leading-5`}
                maxLength={AI_IMAGE_TEMPLATE_MAX_LENGTH}
              />
              <span className="mt-1 block text-right text-xs text-[var(--muted)]">{promptTemplate.length}/{AI_IMAGE_TEMPLATE_MAX_LENGTH}</span>
              {!templateHasSubject && (
                <p className="mt-2 text-xs font-semibold text-red-500">В шаблоне должен быть [SUBJECT], иначе сюжет некуда подставить.</p>
              )}
              {subject.trim() && (
                <div className="mt-3 rounded-xl bg-[var(--card)] p-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Итог для модели</p>
                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs leading-5 text-[var(--text)]">{fullPrompt}</pre>
                </div>
              )}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Формат", isVeo ? `9:16 · ${config.veoSize}` : `9:16 · ${config.soraSize}`],
              ["Качество", isVeo ? "Flash Image" : config.soraQuality],
              ["Модель", isVeo ? config.veoModel : config.soraModel],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--text)_4%,transparent)] p-4">
                <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>
                <p className="mt-1 truncate text-sm font-bold text-[var(--text)]">{value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-violet-500/25 bg-violet-500/[.05] p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-500">Оценка до запуска</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{isVeo ? "Vertex · Gemini 3.1 Flash Image · ~1120 image tokens." : "OpenAI · gpt-image-1-mini · medium · 1024×1536."}</p>
              </div>
              <p className="text-3xl font-black text-[var(--text)]">{usd.format(estimatedPrice)}</p>
            </div>
            <p className="mt-2 text-xs font-semibold text-violet-500">После генерации в карточке появится фактическая approx-стоимость по usage.</p>
            <p className="mt-3 text-xs leading-5 text-[var(--muted)]">Дневной лимит картинок: {usd.format(budget.reservedUsd)} / {usd.format(config.dailyBudgetUsd)} · заданий {budget.jobsCount} / {config.maxJobsPerDay}</p>
          </div>

          <label className="flex cursor-pointer gap-3 rounded-xl border border-[var(--border)] p-4">
            <input type="checkbox" checked={sendToTelegram} onChange={(event) => setSendToTelegram(event.target.checked)} className="mt-1 h-4 w-4 accent-violet-500" />
            <span><span className="block text-sm font-semibold text-[var(--text)]">Доставить в приватный Telegram</span><span className="mt-1 block text-xs leading-5 text-[var(--muted)]">В подписи будет промпт и approx-стоимость. Ошибка Telegram не испортит готовую картинку.</span></span>
          </label>

          <label className="flex cursor-pointer gap-3 rounded-xl border border-red-500/25 bg-red-500/[.035] p-4">
            <input type="checkbox" checked={costConfirmed} onChange={(event) => setCostConfirmed(event.target.checked)} className="mt-1 h-4 w-4 accent-red-500" />
            <span className="text-sm font-semibold leading-6 text-[var(--text)]">Я подтверждаю платную генерацию {isVeo ? "Veo/Gemini" : "Sora/GPT Image"} с оценочной стоимостью {usd.format(estimatedPrice)}. Подтверждение будет повторно проверено сервером.</span>
          </label>

          <button type="submit" disabled={submitting || subject.trim().length < 2 || !costConfirmed || !config.paidGenerationEnabled} className="rounded-full bg-violet-600 px-6 py-3 text-sm font-bold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-45">
            {submitting ? "Резервируем и ставим в очередь…" : `Создать за ${usd.format(estimatedPrice)}`}
          </button>
        </form>

        <aside className={`${card} h-fit p-6`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">{isVeo ? "Veo image worker" : "Sora image worker"}</p>
              <h3 className="mt-1 text-xl font-bold text-[var(--text)]">{worker.online ? "Worker подключён" : "Worker не подключён"}</h3>
              <p className="mt-1 text-xs text-[var(--muted)]">{worker.online ? `${worker.state}${worker.host ? ` · ${worker.host}` : ""}` : "Запустите локальный процесс"}</p>
            </div>
            <span className={`h-3 w-3 rounded-full ${worker.online ? "bg-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,.12)]" : "bg-amber-500"}`} />
          </div>
          <div className="mt-5 rounded-2xl border border-[var(--border)] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text)]">Команда worker</p>
            <code className="mt-3 block overflow-x-auto rounded-xl bg-[var(--text)] px-3 py-3 text-xs text-[var(--bg)]">{WORKER_COMMAND}</code>
            <button type="button" onClick={() => copy("worker", WORKER_COMMAND)} className="mt-3 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-bold text-[var(--text)]">{copied === "worker" ? "Скопировано" : "Скопировать команду"}</button>
            <p className="mt-4 text-xs leading-5 text-[var(--muted)]">Это отдельный процесс от видео-worker. Видео-пайплайн не менялся.</p>
          </div>
          <div className="mt-4 rounded-xl bg-[color-mix(in_srgb,var(--text)_4%,transparent)] p-4 text-xs leading-6 text-[var(--muted)]">
            <p><b className="text-[var(--text)]">Модель:</b> {isVeo ? `${config.veoModel} · Vertex AI` : `${config.soraModel} · Images API`}</p>
            <p><b className="text-[var(--text)]">Размер:</b> {isVeo ? `${config.veoAspectRatio} · ${config.veoSize}` : `${config.soraSize} · ${config.soraQuality}`}</p>
            <p><b className="text-[var(--text)]">Выход:</b> JPEG/PNG в Firebase Storage + библиотека</p>
          </div>
        </aside>
      </div>

      {notice && <p className={`rounded-xl px-4 py-3 text-sm font-semibold ${notice.type === "ok" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>{notice.text}</p>}

      <section className={`${card} p-6`}>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-500">{isVeo ? "История Veo Image" : "История Sora Image"}</p>
            <h2 className="mt-1 text-2xl font-bold text-[var(--text)]">Задания и стоимость</h2>
          </div>
          <button type="button" onClick={() => void loadJobs()} className="text-sm font-semibold text-[var(--muted)] underline">Обновить</button>
        </div>
        {loading ? (
          <div className="mt-6 h-28 animate-pulse rounded-2xl bg-[color-mix(in_srgb,var(--text)_8%,transparent)]" />
        ) : jobs.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--muted)]">{isVeo ? "Veo-картинки ещё не создавались." : "Sora-картинки ещё не создавались."}</div>
        ) : (
          <div className="mt-6 space-y-4">
            {jobs.map((job) => (
              <article key={job.id} className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusColor(job.status)}`}>{statusLabel(job.status)}</span>
                      <span className="text-xs text-[var(--muted)]">{job.provider} · {costLabel(job, usd)}</span>
                    </div>
                    <h3 className="mt-3 flex items-start gap-2 text-lg font-bold text-[var(--text)]">
                      <span className="min-w-0">{job.subject || job.prompt}</span>
                      <button
                        type="button"
                        onClick={() => setJobPromptId((current) => (current === job.id ? "" : job.id))}
                        className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[11px] font-bold text-[var(--muted)] hover:border-violet-500 hover:text-violet-500"
                        title="Показать полный промпт"
                        aria-label="Показать полный промпт"
                      >
                        i
                      </button>
                    </h3>
                    <p className="mt-1 text-xs text-[var(--muted)]">{dateFormatter.format(new Date(job.createdAt))} · {job.stage}</p>
                    {jobPromptId === job.id && job.prompt && (
                      <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-xl border border-violet-500/20 bg-violet-500/[.04] p-3 text-xs leading-5 text-[var(--muted)]">{job.prompt}</pre>
                    )}
                  </div>
                  <div className="flex h-fit flex-wrap gap-2">
                    {job.imageUrl && <a href={job.imageUrl} target="_blank" rel="noreferrer" className="rounded-full bg-[var(--text)] px-4 py-2.5 text-sm font-bold text-[var(--bg)]">Открыть</a>}
                    {job.imageUrl && (
                      <button type="button" disabled={busyJob === `${job.id}:download`} onClick={() => void downloadImage(job)} className="rounded-full border border-[var(--border)] px-4 py-2.5 text-sm font-bold text-[var(--text)] disabled:opacity-50">
                        {busyJob === `${job.id}:download` ? "Скачиваем…" : "Скачать"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs text-[var(--muted)]"><span>{job.stage}</span><span>{Math.round(job.progress)}%</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--text)_8%,transparent)]">
                    <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${job.progress}%` }} />
                  </div>
                </div>

                {job.imageUrl && (
                  <a href={job.imageUrl} target="_blank" rel="noreferrer" className="mt-4 block overflow-hidden rounded-2xl border border-[var(--border)]">
                    <img src={job.imageUrl} alt={job.subject || job.prompt} className="max-h-96 w-full object-cover" />
                  </a>
                )}

                <div className="mt-4 grid gap-2 sm:grid-cols-4">
                  <div className="rounded-xl bg-[color-mix(in_srgb,var(--text)_5%,transparent)] px-3 py-2">
                    <p className="text-[11px] uppercase text-[var(--muted)]">Оценка</p>
                    <p className="mt-1 font-bold text-[var(--text)]">{usd.format(job.estimatedCostUsd)}</p>
                  </div>
                  <div className="rounded-xl bg-[color-mix(in_srgb,var(--text)_5%,transparent)] px-3 py-2">
                    <p className="text-[11px] uppercase text-[var(--muted)]">Approx факт</p>
                    <p className="mt-1 font-bold text-[var(--text)]">{job.actualCostUsd == null ? "после генерации" : usd.format(job.actualCostUsd)}</p>
                  </div>
                  <div className="rounded-xl bg-[color-mix(in_srgb,var(--text)_5%,transparent)] px-3 py-2">
                    <p className="text-[11px] uppercase text-[var(--muted)]">Модель</p>
                    <p className="mt-1 truncate font-bold text-[var(--text)]">{job.providerUsage.model}</p>
                  </div>
                  <div className="rounded-xl bg-[color-mix(in_srgb,var(--text)_5%,transparent)] px-3 py-2">
                    <p className="text-[11px] uppercase text-[var(--muted)]">Размер</p>
                    <p className="mt-1 font-bold text-[var(--text)]">{job.providerUsage.size} · {job.providerUsage.aspectRatio}</p>
                  </div>
                </div>

                {job.tokenUsage && (
                  <div className="mt-4 grid gap-2 sm:grid-cols-4">
                    {[["Input tokens", job.tokenUsage.input], ["Output tokens", job.tokenUsage.output], ["Image tokens", job.tokenUsage.imageOutput]].map(([label, value]) => (
                      <div key={String(label)} className="rounded-xl bg-[color-mix(in_srgb,var(--text)_5%,transparent)] px-3 py-2">
                        <p className="text-[11px] uppercase text-[var(--muted)]">{label}</p>
                        <p className="mt-1 font-bold text-[var(--text)]">{numberFormatter.format(Number(value))}</p>
                      </div>
                    ))}
                    <div className="rounded-xl bg-[color-mix(in_srgb,var(--text)_5%,transparent)] px-3 py-2">
                      <p className="text-[11px] uppercase text-[var(--muted)]">LLM</p>
                      <p className="mt-1 truncate text-sm font-bold text-[var(--text)]">{job.tokenUsage.model}</p>
                    </div>
                  </div>
                )}

                {job.telegramMessageId && <p className="mt-3 text-xs font-semibold text-emerald-500">Telegram delivered · message {job.telegramMessageId}</p>}
                {job.telegramError && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-600">
                    <span>Telegram: {job.telegramError}</span>
                    {job.status === "completed" && (
                      <button type="button" disabled={busyJob === `${job.id}:telegram`} onClick={() => void retry(job, "telegram")} className="rounded-full border border-amber-500/30 px-3 py-1.5 font-bold disabled:opacity-50">
                        {busyJob === `${job.id}:telegram` ? "Ставим в очередь…" : "Повторить доставку"}
                      </button>
                    )}
                  </div>
                )}
                {job.error && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-500">
                    <span>{job.error}</span>
                    {job.status === "failed" && (
                      <button type="button" disabled={busyJob === `${job.id}:resume`} onClick={() => void retry(job, "resume")} className="rounded-full border border-red-500/30 px-3 py-1.5 font-bold disabled:opacity-50">
                        {busyJob === `${job.id}:resume` ? "Ставим в очередь…" : "Повторить генерацию"}
                      </button>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
