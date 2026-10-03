"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { BUILDINGS, shortNumber } from "@/lib/game/buildings";

/** Admin → Game: status of every Dream Kingdoms player (from /api/admin/game/players). */

type Player = {
  ownerKey: string;
  uid: string | null;
  type: "user" | "guest";
  name: string | null;
  email: string | null;
  creatures: number;
  lifetime: number;
  kinds: number;
  taps: number;
  buildings: string[];
  city: string | null;
  rate: number;
  storage: number;
  lastRank: number | null;
  createdAt: number | null;
  updatedAt: number | null;
};

function ago(ms: number | null): string {
  if (!ms) return "—";
  const m = Math.round((Date.now() - ms) / 60_000);
  if (m < 60) return `${m} мин`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} ч`;
  return `${Math.round(h / 24)} дн`;
}

export default function GamePlayersPanel() {
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [onlyUsers, setOnlyUsers] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  /** Wipe MY game progress (server + this browser) to test the game from scratch. */
  async function resetMine() {
    if (resetting) return;
    if (!confirm("Сбросить ТВОЙ прогресс в Dream Kingdoms?\nСущества, коллекция и здания на карте будут удалены. Других игроков это не трогает.")) return;
    setResetting(true);
    setResetMsg(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/game/reset", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = (await res.json()) as { ok?: boolean; buildingsRemoved?: number; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      for (const key of ["dreamly_game_v1", "dreamly_game_pending_v2", "dreamly_game_hint"]) {
        try {
          localStorage.removeItem(key);
        } catch {
          /* ignore */
        }
      }
      setResetMsg(`Готово: прогресс сброшен, зданий удалено с карты — ${data.buildingsRemoved ?? 0}. Открой /app/game.`);
      void load();
    } catch (e) {
      setResetMsg(e instanceof Error ? `Ошибка: ${e.message}` : "Ошибка");
    } finally {
      setResetting(false);
    }
  }

  async function load() {
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/game/players", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      });
      const data = (await res.json()) as { players?: Player[]; error?: string };
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setPlayers(data.players ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    }
  }

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, []);

  const list = (players ?? []).filter((p) => !onlyUsers || p.type === "user");
  const users = (players ?? []).filter((p) => p.type === "user").length;

  return (
    <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Игроки Dream Kingdoms</h2>
          <p className="text-xs text-[var(--muted)]">
            {players ? `${players.length} игроков · ${users} с аккаунтом · ${players.length - users} гостей` : "Загрузка…"} · Firestore:{" "}
            <span className="font-mono">kingdom_players</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOnlyUsers((v) => !v)}
            className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold"
          >
            {onlyUsers ? "Только с аккаунтом: ON" : "Только с аккаунтом: OFF"}
          </button>
          <button type="button" onClick={() => void load()} className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold">
            Обновить
          </button>
          <button
            type="button"
            onClick={() => void resetMine()}
            disabled={resetting}
            className="rounded-full border border-rose-400/60 bg-[color-mix(in_srgb,#f43f5e_10%,var(--card))] px-3 py-1.5 text-xs font-semibold text-rose-500 disabled:opacity-60"
          >
            {resetting ? "Сбрасываю…" : "↺ Сбросить мою игру"}
          </button>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-rose-500">{error}</p> : null}
      {resetMsg ? <p className="mt-3 text-sm font-semibold">{resetMsg}</p> : null}

      <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--text)_6%,transparent)] text-left">
              <th className="p-2.5 font-semibold">Игрок</th>
              <th className="p-2.5 font-semibold">Существ</th>
              <th className="p-2.5 font-semibold">Поймано всего</th>
              <th className="p-2.5 font-semibold">Видов</th>
              <th className="p-2.5 font-semibold">Здания</th>
              <th className="p-2.5 font-semibold">/мин</th>
              <th className="p-2.5 font-semibold">В хранилище</th>
              <th className="p-2.5 font-semibold">Город · место</th>
              <th className="p-2.5 font-semibold">Тапов</th>
              <th className="p-2.5 font-semibold">Активность</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.ownerKey} className="border-b border-[var(--border)] last:border-0 align-top">
                <td className="p-2.5">
                  {p.type === "user" ? (
                    <>
                      <div className="font-semibold">{p.name || p.email || p.uid}</div>
                      {p.email && p.name ? <div className="text-xs text-[var(--muted)]">{p.email}</div> : null}
                    </>
                  ) : (
                    <span className="text-[var(--muted)]">
                      Гость <span className="font-mono text-xs">{p.ownerKey.slice(2, 10)}</span>
                    </span>
                  )}
                </td>
                <td className="p-2.5 font-semibold tabular-nums">{p.creatures.toLocaleString()}</td>
                <td className="p-2.5 tabular-nums">{p.lifetime.toLocaleString()}</td>
                <td className="p-2.5 tabular-nums">{p.kinds}</td>
                <td className="p-2.5 text-lg leading-none" title={p.buildings.join(", ")}>
                  {p.buildings.length
                    ? BUILDINGS.filter((b) => p.buildings.includes(b.id)).map((b) => b.emoji).join(" ")
                    : <span className="text-sm text-[var(--muted)]">—</span>}
                </td>
                <td className="p-2.5 tabular-nums">{p.rate || "—"}</td>
                <td className="p-2.5 tabular-nums">{p.storage ? shortNumber(p.storage) : "—"}</td>
                <td className="p-2.5">
                  {p.city ?? "—"}
                  {p.lastRank ? <span className="text-[var(--muted)]"> · #{p.lastRank}</span> : null}
                </td>
                <td className="p-2.5 tabular-nums">{p.taps.toLocaleString()}</td>
                <td className="p-2.5 text-xs text-[var(--muted)]">
                  {ago(p.updatedAt)} назад
                  <div>с {p.createdAt ? new Date(p.createdAt).toLocaleDateString("ru-RU") : "—"}</div>
                </td>
              </tr>
            ))}
            {players && !list.length ? (
              <tr>
                <td colSpan={10} className="p-4 text-center text-[var(--muted)]">
                  Пока никого
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
