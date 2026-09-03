"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";

import type { TikTokConnectionStatus } from "@/lib/adminTikTok";
import type { MetaConnectionStatus } from "@/lib/adminMeta";
import type { ThreadsConnectionStatus } from "@/lib/adminThreads";
import type { BlueskyConnectionStatus } from "@/lib/adminBluesky";
import type { YouTubeConnectionStatus } from "@/lib/adminYouTube";
import type { PinterestConnectionStatus } from "@/lib/adminPinterest";
import type { TumblrConnectionStatus } from "@/lib/adminTumblr";
import {
  buildSocialCoverageRows,
  type SocialCoverageInput,
  type SocialCoverageState,
} from "@/lib/adminSocialCoverage";

async function fetchAdminStatus<T>(url: string, token: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || `Не удалось прочитать ${url}`);
  return payload;
}

function StateBadge({ state, label }: { state: SocialCoverageState; label: string }) {
  const colors = {
    ready: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
    limited: "border-amber-500/30 bg-amber-500/10 text-amber-600",
    missing: "border-red-500/30 bg-red-500/10 text-red-500",
    planned: "border-violet-500/30 bg-violet-500/10 text-violet-500",
    skipped: "border-[var(--border)] bg-[color-mix(in_srgb,var(--text)_5%,transparent)] text-[var(--muted)]",
  }[state];
  const dot = {
    ready: "bg-emerald-500",
    limited: "bg-amber-500",
    missing: "bg-red-500",
    planned: "bg-violet-500",
    skipped: "bg-[var(--muted)]",
  }[state];

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-bold ${colors}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
      {label}
    </span>
  );
}

export default function SocialMapPanel({ user }: { user: User }) {
  const [statuses, setStatuses] = useState<SocialCoverageInput>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const token = await user.getIdToken();
      const [tiktok, meta, threads, bluesky, youtube, pinterest, tumblr] = await Promise.all([
        fetchAdminStatus<TikTokConnectionStatus>("/api/admin/tiktok/status", token),
        fetchAdminStatus<MetaConnectionStatus>("/api/admin/meta/status", token),
        fetchAdminStatus<ThreadsConnectionStatus>("/api/admin/threads/status", token),
        fetchAdminStatus<BlueskyConnectionStatus>("/api/admin/bluesky/status", token),
        fetchAdminStatus<YouTubeConnectionStatus>("/api/admin/youtube/status", token),
        fetchAdminStatus<PinterestConnectionStatus>("/api/admin/pinterest/status", token),
        fetchAdminStatus<TumblrConnectionStatus>("/api/admin/tumblr/status", token),
      ]);
      setStatuses({ tiktok, meta, threads, bluesky, youtube, pinterest, tumblr });
      setUpdatedAt(new Date());
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить карту подключений");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const rows = useMemo(() => buildSocialCoverageRows(statuses), [statuses]);
  const active = rows.filter((entry) => !entry.candidate);
  const connected = active.filter((entry) => entry.connected).length;
  const direct = active.filter((entry) => entry.connected && entry.connectionKind === "direct").length;
  const viaBuffer = active.filter((entry) => entry.connected && entry.connectionKind === "buffer").length;
  const needsAction = active.filter((entry) => entry.state === "limited" || entry.state === "missing").length;
  const waitingForFirstLoad = loading && !updatedAt;

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
      <div className="border-b border-[var(--border)] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-500">Social map</p>
            <h2 className="mt-1 text-2xl font-bold text-[var(--text)]">Карта подключений Dreamly</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Живой статус, способ публикации, аккаунт назначения и оставшиеся действия.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
            {updatedAt ? <span>Обновлено {updatedAt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span> : null}
            <button
              type="button"
              disabled={loading}
              onClick={() => void load()}
              className="font-semibold underline disabled:opacity-50"
            >
              {loading ? "Проверяем…" : "Обновить"}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Подключено", waitingForFirstLoad ? "—" : `${connected} из ${active.length}`],
            ["Напрямую", waitingForFirstLoad ? "—" : String(direct)],
            ["Через Buffer", waitingForFirstLoad ? "—" : String(viaBuffer)],
            ["Нужно действие", waitingForFirstLoad ? "—" : String(needsAction)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--text)_4%,transparent)] px-4 py-3">
              <p className="text-xs font-semibold text-[var(--muted)]">{label}</p>
              <p className="mt-1 text-xl font-bold text-[var(--text)]">{value}</p>
            </div>
          ))}
        </div>

        {error ? (
          <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-500" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--text)_3%,transparent)] text-xs uppercase tracking-[0.08em] text-[var(--muted)]">
              <th className="px-5 py-3 font-bold">Площадка</th>
              <th className="px-5 py-3 font-bold">Статус</th>
              <th className="px-5 py-3 font-bold">Как подключено</th>
              <th className="px-5 py-3 font-bold">Аккаунт / назначение</th>
              <th className="px-5 py-3 font-bold">Что осталось</th>
            </tr>
          </thead>
          <tbody>
            {!updatedAt ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-[var(--muted)]">
                  {loading ? "Проверяем фактические подключения…" : "Статусы пока недоступны"}
                </td>
              </tr>
            ) : rows.map((entry, index) => (
              <Fragment key={entry.id}>
                {entry.candidate && rows[index - 1]?.candidate === false ? (
                  <tr className="border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--text)_3%,transparent)]">
                    <td colSpan={5} className="px-5 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                      Осталось по исходной таблице
                    </td>
                  </tr>
                ) : null}
                <tr className="border-b border-[var(--border)] last:border-b-0">
                  <td className="px-5 py-4 font-bold text-[var(--text)]">{entry.platform}</td>
                  <td className="px-5 py-4">
                    <StateBadge state={entry.state} label={entry.stateLabel} />
                  </td>
                  <td className="px-5 py-4 text-[var(--text)]">{entry.connection}</td>
                  <td className="px-5 py-4 text-[var(--muted)]">{entry.account}</td>
                  <td className="px-5 py-4 text-[var(--muted)]">{entry.remaining}</td>
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
