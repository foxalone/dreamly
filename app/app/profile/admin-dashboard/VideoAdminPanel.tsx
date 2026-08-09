"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { MAX_SHORT_DURATION_SECONDS, type AdminVideoJob } from "@/lib/adminVideo";

const WORKER_COMMAND = "cd /Users/dimab/Documents/oneiro-web && npm run video-worker";

type WorkerStatus = { online: boolean; lastSeenAt: string | null; host: string };

function statusLabel(status: AdminVideoJob["status"]) {
  return { queued: "В очереди", processing: "Обработка", completed: "Готово", failed: "Ошибка" }[status];
}

export default function VideoAdminPanel({ user }: { user: User }) {
  const [topic, setTopic] = useState("");
  const [sendToTelegram, setSendToTelegram] = useState(true);
  const [jobs, setJobs] = useState<AdminVideoJob[]>([]);
  const [worker, setWorker] = useState<WorkerStatus>({ online: false, lastSeenAt: null, host: "" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [copied, setCopied] = useState("");
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }), []);
  const numberFormatter = useMemo(() => new Intl.NumberFormat("ru-RU"), []);

  const loadJobs = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/videos", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload = (await response.json()) as { jobs?: AdminVideoJob[]; worker?: WorkerStatus; error?: string };
      if (!response.ok) throw new Error(payload.error || "Не удалось загрузить задания");
      setJobs(payload.jobs ?? []);
      setWorker(payload.worker ?? { online: false, lastSeenAt: null, host: "" });
    } catch (error) {
      if (!quiet) setNotice({ type: "error", text: error instanceof Error ? error.message : "Ошибка загрузки" });
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [user]);

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

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (topic.trim().length < 5) return;
    setSubmitting(true);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/videos", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ topic, sendToTelegram }),
      });
      const payload = (await response.json()) as { job?: AdminVideoJob; error?: string };
      if (!response.ok || !payload.job) throw new Error(payload.error || "Не удалось добавить видео в очередь");
      setJobs((current) => [payload.job!, ...current]);
      setTopic("");
      setNotice({ type: "ok", text: "Видео добавлено в очередь генерации." });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Ошибка создания задания" });
    } finally {
      setSubmitting(false);
    }
  }

  const card = "rounded-2xl bg-[var(--card)] border border-[var(--border)]";
  const input = "w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-[var(--text)] outline-none focus:ring-2 focus:ring-violet-500/25";

  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <form onSubmit={submit} className={`${card} p-6 space-y-5`}>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-500">Video Studio</p>
            <h2 className="mt-2 text-2xl font-bold text-[var(--text)]">Создать английский Short</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Вертикальное видео 9:16, английская озвучка и субтитры, максимум 45 секунд.</p>
          </div>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[var(--text)]">Тема видео</span>
            <textarea value={topic} onChange={(event) => setTopic(event.target.value)} className={`${input} min-h-28 resize-y`} placeholder="Например: What does dreaming about flying mean?" minLength={5} maxLength={300} required />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--text)_4%,transparent)] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Язык</p>
              <p className="mt-1 font-bold text-[var(--text)]">English · en-US</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--text)_4%,transparent)] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Формат</p>
              <p className="mt-1 font-bold text-[var(--text)]">9:16 · до {MAX_SHORT_DURATION_SECONDS} секунд</p>
            </div>
          </div>
          <label className="flex cursor-pointer gap-3 rounded-xl border border-[var(--border)] p-4">
            <input type="checkbox" checked={sendToTelegram} onChange={(event) => setSendToTelegram(event.target.checked)} className="mt-1 h-4 w-4 accent-violet-500" />
            <span><span className="block text-sm font-semibold text-[var(--text)]">Отправить в Telegram</span><span className="mt-1 block text-xs leading-5 text-[var(--muted)]">После генерации ролик будет отправлен в настроенный приватный Telegram-чат.</span></span>
          </label>
          <button type="submit" disabled={submitting || topic.trim().length < 5} className="rounded-full bg-violet-600 px-6 py-3 text-sm font-bold text-white hover:bg-violet-500 disabled:opacity-50">
            {submitting ? "Добавляем в очередь…" : "Создать видео"}
          </button>
        </form>

        <aside className={`${card} p-6`}>
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Локальный генератор</p><h3 className="mt-1 text-xl font-bold text-[var(--text)]">{worker.online ? "Worker подключён" : "Worker не подключён"}</h3></div>
            <span className={`h-3 w-3 rounded-full ${worker.online ? "bg-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,.12)]" : "bg-amber-500"}`} />
          </div>
          <div className="mt-5 rounded-2xl border border-[var(--border)] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text)]">Порядок действий</p>
            <ol className="mt-4 space-y-4 text-sm leading-6 text-[var(--muted)]">
              <li className="flex gap-3"><b className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-500">1</b><span>Скопируйте команду и вставьте её в Terminal на Mac.</span></li>
              <li className="rounded-xl bg-[var(--text)] p-2 text-[var(--bg)]"><code className="block overflow-x-auto px-1 py-1 text-xs">{WORKER_COMMAND}</code><button type="button" onClick={() => copy("worker", WORKER_COMMAND)} className="mt-2 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold text-white">{copied === "worker" ? "Скопировано" : "Скопировать команду"}</button></li>
              <li className="flex gap-3"><b className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${worker.online ? "bg-emerald-500 text-white" : "bg-violet-500/15 text-violet-500"}`}>{worker.online ? "✓" : "2"}</b><span>Оставьте Terminal открытым и дождитесь статуса «Worker подключён».</span></li>
              <li className="flex gap-3"><b className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-500">3</b><span>Введите тему и нажмите «Создать видео».</span></li>
              <li className="flex gap-3"><b className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-500">4</b><span>Дождитесь статуса «Готово», затем скачайте ролик или откройте Telegram.</span></li>
            </ol>
            <p className="mt-4 rounded-xl bg-amber-500/10 px-3 py-2 text-xs font-semibold leading-5 text-amber-600">Не закрывайте Terminal во время генерации.</p>
          </div>
        </aside>
      </div>

      {notice && <p className={`rounded-xl px-4 py-3 text-sm font-semibold ${notice.type === "ok" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>{notice.text}</p>}

      <section className={`${card} p-6`}>
        <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-500">История генераций</p><h2 className="mt-1 text-2xl font-bold text-[var(--text)]">Последние видео</h2></div><button type="button" onClick={() => void loadJobs()} className="text-sm font-semibold text-[var(--muted)] underline">Обновить</button></div>
        {loading ? <div className="mt-6 h-28 animate-pulse rounded-2xl bg-[color-mix(in_srgb,var(--text)_8%,transparent)]" /> : jobs.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--muted)]">Видео ещё не создавались.</div> : (
          <div className="mt-6 space-y-4">
            {jobs.map((job) => {
              const metadata = job.youtubeMetadata;
              const tags = metadata?.tags.join(", ") ?? "";
              const hashtags = metadata?.hashtags.map((tag) => `#${tag}`).join(" ") ?? "";
              const allMetadata = metadata ? [`Title:\n${metadata.title}`, `Description:\n${metadata.description}`, `Tags:\n${tags}`, `Hashtags:\n${hashtags}`, `Thumbnail:\n${metadata.thumbnailText}`, `Pinned comment:\n${metadata.pinnedComment}`, `Category:\n${metadata.category}`].join("\n\n") : "";
              const copyButton = (key: string, value: string) => <button type="button" onClick={() => copy(`${job.id}:${key}`, value)} className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-bold text-[var(--muted)]">{copied === `${job.id}:${key}` ? "Скопировано" : "Копировать"}</button>;
              return (
                <article key={job.id} className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-5">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-bold text-violet-500">{statusLabel(job.status)}</span><span className="text-xs text-[var(--muted)]">English · до {job.maxDurationSeconds} сек.</span></div><h3 className="mt-3 text-lg font-bold text-[var(--text)]">{job.topic}</h3><p className="mt-1 text-xs text-[var(--muted)]">{dateFormatter.format(new Date(job.createdAt))}{job.status === "processing" ? ` · ${job.stage}` : ""}</p></div>{job.videoUrl && <a href={job.videoUrl} target="_blank" rel="noreferrer" className="h-fit rounded-full bg-[var(--text)] px-4 py-2.5 text-sm font-bold text-[var(--bg)]">Открыть видео</a>}</div>
                  {job.tokenUsage && <div className="mt-4 grid gap-2 sm:grid-cols-4">{[["Промпт", job.tokenUsage.prompt], ["Ответ", job.tokenUsage.completion], ["Всего", job.tokenUsage.total]].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-[color-mix(in_srgb,var(--text)_5%,transparent)] px-3 py-2"><p className="text-[11px] uppercase text-[var(--muted)]">{label}</p><p className="mt-1 font-bold text-[var(--text)]">{numberFormatter.format(Number(value))}</p></div>)}<div className="rounded-xl bg-[color-mix(in_srgb,var(--text)_5%,transparent)] px-3 py-2"><p className="text-[11px] uppercase text-[var(--muted)]">Модель</p><p className="mt-1 truncate text-sm font-bold text-[var(--text)]">{job.tokenUsage.model}</p></div></div>}
                  {metadata && <div className="mt-5 rounded-2xl border border-violet-500/20 bg-violet-500/[.035] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-500">Пакет для YouTube</p><h4 className="mt-1 text-lg font-bold text-[var(--text)]">Готово к публикации</h4></div><button type="button" onClick={() => copy(`${job.id}:all`, allMetadata)} className="rounded-full bg-violet-600 px-4 py-2 text-xs font-bold text-white">{copied === `${job.id}:all` ? "Скопировано" : "Скопировать всё"}</button></div><div className="mt-4 space-y-3">{[["Заголовок", metadata.title, "title"], ["Описание", metadata.description, "description"], ["Теги", tags, "tags"], ["Хэштеги", hashtags, "hashtags"], ["Текст для обложки", metadata.thumbnailText, "thumbnail"], ["Закреплённый комментарий", metadata.pinnedComment, "pinned"], ["Категория", metadata.category, "category"]].map(([label, value, key]) => <div key={String(key)} className="rounded-xl bg-[var(--card)] p-3"><div className="flex items-start justify-between gap-3"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>{copyButton(String(key), String(value))}</div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text)]">{value}</p></div>)}</div></div>}
                  {job.telegramMessageId && <p className="mt-3 text-xs font-semibold text-emerald-500">Отправлено в Telegram · сообщение {job.telegramMessageId}</p>}
                  {job.telegramError && <p className="mt-3 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-600">Telegram: {job.telegramError}</p>}
                  {job.error && <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-500">{job.error}</p>}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
