"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { adminChartsCopy } from "@/lib/i18n/adminCharts";
import { adminMoonClicksCopy } from "@/lib/i18n/adminMoonClicks";
import { CHART_HIDDEN_KEY, parseHiddenMetrics } from "@/lib/chartPrefs";
import { METRIC_KEYS, type MetricDay, type MetricKey } from "@/lib/metricSeries";

const COLORS: Record<MetricKey, string> = {
  moon: "#f5d76e",
  earth: "#7ec8e3",
  translation: "#c4b5fd",
  horoscopeMore: "#fb7185",
  tarotMore: "#f59e0b",
  dreams: "#34d399",
  stories: "#60a5fa",
  journal: "#a78bfa",
  shared: "#f472b6",
  comments: "#cbd5e1",
  xp: "#4ade80",
};

function readHidden(): MetricKey[] {
  try {
    return parseHiddenMetrics(localStorage.getItem(CHART_HIDDEN_KEY));
  } catch {
    return [];
  }
}

function writeHidden(hidden: MetricKey[]) {
  try {
    localStorage.setItem(CHART_HIDDEN_KEY, JSON.stringify(hidden));
  } catch {
    /* private mode */
  }
}

function formatDay(date: string, locale: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(locale, { month: "short", day: "numeric", timeZone: "UTC" });
}

export default function MetricCharts({ user }: { user: User }) {
  const locale = useLocale();
  const copy = adminChartsCopy[locale];
  const labels = adminMoonClicksCopy[locale];
  const names: Record<MetricKey, string> = {
    moon: labels.title,
    earth: labels.earth,
    translation: labels.translation,
    horoscopeMore: labels.horoscopeMore,
    tarotMore: labels.tarotMore,
    dreams: labels.dreams,
    stories: labels.stories,
    journal: labels.journal,
    shared: labels.shared,
    comments: labels.comments,
    xp: labels.xp,
  };
  const [days, setDays] = useState<MetricDay[] | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [hidden, setHidden] = useState<MetricKey[] | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    setHidden(readHidden());
  }, []);

  useEffect(() => {
    if (hidden == null) return;
    writeHidden(hidden);
  }, [hidden]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(false);
      try {
        const response = await fetch(`/api/admin/metric-series?tzOffsetMin=${new Date().getTimezoneOffset()}`, {
          headers: { Authorization: `Bearer ${await user.getIdToken()}` },
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("SERIES_FAILED");
        const data = await response.json();
        if (controller.signal.aborted) return;
        setDays(Array.isArray(data.days) ? data.days : []);
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [user, revision]);

  const visible = hidden == null ? [] : METRIC_KEYS.filter((key) => !hidden.includes(key));
  const chart = useMemo(() => buildChart(days ?? [], visible), [days, visible]);
  const focus = hover != null && days ? days[hover] : days?.at(-1) ?? null;

  function toggle(key: MetricKey) {
    setHidden((current) => {
      const base = current ?? readHidden();
      return base.includes(key) ? base.filter((item) => item !== key) : [...base, key];
    });
  }

  return (
    <section className="mt-6 rounded-2xl border border-[var(--border)] p-4" aria-label={copy.title} dir={locale === "ar" ? "rtl" : undefined}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">{copy.title}</h2>
        <button type="button" onClick={() => setRevision((value) => value + 1)} disabled={loading} className="rounded-full border border-[var(--border)] px-3 py-1 text-sm disabled:opacity-50">
          {copy.refresh}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2" style={{ visibility: hidden == null ? "hidden" : "visible" }}>
        {METRIC_KEYS.map((key) => {
          const on = hidden != null && !hidden.includes(key);
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(key)}
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition"
              style={on
                ? { background: COLORS[key], borderColor: COLORS[key], color: "#111111" }
                : { borderColor: "var(--border)", color: "var(--muted)" }}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: on ? "#111111" : COLORS[key] }} />
              {names[key]}
            </button>
          );
        })}
      </div>
      {error ? <p role="alert" className="mt-4 text-sm">{copy.error}</p> : null}
      {!error && loading && !days ? <p className="mt-4 text-sm text-[var(--muted)]">{copy.loading}</p> : null}
      {!error && days && hidden != null && visible.length === 0 ? <p className="mt-4 text-sm text-[var(--muted)]">{copy.empty}</p> : null}
      {!error && days && hidden != null && visible.length > 0 ? (
        <div className="mt-4" dir="ltr">
          <svg
            viewBox={`0 0 ${chart.w} ${chart.h}`}
            className="h-72 w-full"
            role="img"
            aria-label={copy.title}
            onMouseLeave={() => setHover(null)}
          >
            {chart.grid.map((y) => (
              <line key={y} x1={chart.padL} x2={chart.w - chart.padR} y1={y} y2={y} stroke="var(--border)" strokeWidth="1" />
            ))}
            <text x={chart.padL - 8} y={chart.padT + 4} textAnchor="end" fill="var(--muted)" fontSize="11">{chart.max}</text>
            <text x={chart.padL - 8} y={chart.zeroY} textAnchor="end" fill="var(--muted)" fontSize="11">0</text>
            {chart.lines.map((line) => (
              <g key={line.key}>
                {line.paths.map((d) => (
                  <path key={d} d={d} fill="none" stroke={COLORS[line.key]} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                ))}
                {line.dots.map((dot) => (
                  <circle key={`${line.key}-${dot.i}`} cx={dot.x} cy={dot.y} r={days.length > 40 ? 2 : 3} fill={COLORS[line.key]} />
                ))}
              </g>
            ))}
            {hover != null && chart.xAt(hover) != null ? (
              <line x1={chart.xAt(hover)!} x2={chart.xAt(hover)!} y1={chart.padT} y2={chart.base} stroke="var(--text)" strokeOpacity="0.35" />
            ) : null}
            {days.map((day, index) => (
              <rect
                key={day.date}
                x={chart.bandX(index)}
                y={chart.padT}
                width={chart.band}
                height={chart.base - chart.padT}
                fill="transparent"
                onMouseEnter={() => setHover(index)}
                onClick={() => setHover(index)}
              />
            ))}
            {chart.labels.map((label) => (
              <text key={label.date} x={label.x} y={chart.h - 8} textAnchor="middle" fill="var(--muted)" fontSize="11">
                {formatDay(label.date, locale)}
              </text>
            ))}
          </svg>
          {focus ? (
            <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
              <div className="font-medium text-[var(--text)]">{formatDay(focus.date, locale)}</div>
              {visible.map((key) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: COLORS[key] }} />
                  <dt className="text-[var(--muted)]">{names[key]}</dt>
                  <dd className="font-medium tabular-nums" style={{ color: COLORS[key] }}>
                    {focus[key] == null ? copy.unknown : focus[key].toLocaleString(locale)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      ) : null}
      <p className="mt-3 text-sm text-[var(--muted)]">{copy.note}</p>
    </section>
  );
}

function buildChart(days: MetricDay[], visible: MetricKey[]) {
  const w = 800;
  const h = 300;
  const padL = 40;
  const padR = 12;
  const padT = 16;
  const padB = 28;
  const base = h - padB;
  const innerW = w - padL - padR;
  const innerH = base - padT;
  const values = days.flatMap((day) => visible.map((key) => day[key])).filter((value): value is number => typeof value === "number");
  const max = Math.max(1, ...values, 0);
  const min = Math.min(0, ...values, 0);
  const span = max - min || 1;
  const n = days.length;
  const xAt = (index: number) => (n <= 1 ? padL + innerW / 2 : padL + (index / (n - 1)) * innerW);
  const yAt = (value: number) => padT + ((max - value) / span) * innerH;
  const band = n <= 1 ? innerW : innerW / (n - 1);
  const lines = visible.map((key) => {
    const paths: string[] = [];
    const dots: { i: number; x: number; y: number }[] = [];
    let run: string[] = [];
    days.forEach((day, index) => {
      const value = day[key];
      if (typeof value !== "number") {
        if (run.length > 1) paths.push(`M${run.join("L")}`);
        run = [];
        return;
      }
      const x = xAt(index);
      const y = yAt(value);
      dots.push({ i: index, x, y });
      run.push(`${x},${y}`);
    });
    if (run.length > 1) paths.push(`M${run.join("L")}`);
    return { key, paths, dots: n > 60 ? dots.filter((dot) => days[dot.i][key] !== 0) : dots };
  });
  const step = Math.max(1, Math.round(n / 6));
  const labels = days
    .map((day, index) => ({ date: day.date, x: xAt(index), index }))
    .filter((label, index, all) => index === 0 || index === all.length - 1 || (index % step === 0 && index < all.length - 1));
  return {
    w,
    h,
    padL,
    padR,
    padT,
    base,
    max,
    zeroY: yAt(0),
    grid: [padT, padT + innerH / 2, base],
    lines,
    labels,
    xAt,
    band,
    bandX: (index: number) => xAt(index) - band / 2,
  };
}
