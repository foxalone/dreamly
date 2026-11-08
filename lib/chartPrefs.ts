import { METRIC_KEYS, type MetricKey } from "./metricSeries";

export const CHART_HIDDEN_KEY = "dreamly-admin-chart-hidden";

const known = new Set<string>(METRIC_KEYS);

/** Metrics the admin turned off. Unknown values are ignored. */
export function parseHiddenMetrics(raw: string | null): MetricKey[] {
  try {
    const parsed = JSON.parse(raw ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((key): key is MetricKey => typeof key === "string" && known.has(key));
  } catch {
    return [];
  }
}
