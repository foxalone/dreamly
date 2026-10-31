import { analysisDiagnosis } from "./analysisDiagnosis";

type Attempt = Record<string, unknown> & {
  id: string;
  status: string;
  reason: string;
  updatedAtMs: number;
  events?: { event: string; atMs: number; source?: string; httpStatus?: number }[];
};

export const ATTEMPT_CSV_COLUMNS = [
  "id", "uid", "guestId", "lang", "lens", "source", "dreamId", "text",
  "status", "reason", "diagnosisKind", "diagnosisCode", "diagnosisEvidenceEvent",
  "diagnosisEvidenceHttpStatus", "authEvent", "lastEvent", "clientReported",
  "requestCount", "httpStatus", "durationMs", "createdAtMs", "startedAtMs",
  "updatedAtMs", "displayedAtMs", "createdAtIso", "startedAtIso", "updatedAtIso",
  "displayedAtIso", "wordCount", "charCount", "city", "admin1", "country",
  "cityId", "citySource", "geoProvider", "userAgent", "model", "emojiModel",
  "emojisJson", "analysis", "eventsJson",
] as const;

function iso(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? new Date(value).toISOString() : "";
}

function cell(value: unknown) {
  let text = value == null ? "" : String(value);
  // Spreadsheet programs can execute formulas embedded in user-submitted dreams.
  if (/^[\s\u0000-\u001f]*[=+\-@]/u.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function analysisAttemptsCsv(attempts: Attempt[], now = Date.now()) {
  const rows = attempts.map((attempt) => {
    const diagnosis = analysisDiagnosis(attempt, now);
    const events = Array.isArray(attempt.events) ? attempt.events : [];
    const authEvent = [...events].reverse().find((event) => event.event.startsWith("auth_"))?.event
      ?? (typeof attempt.lastEvent === "string" && attempt.lastEvent.startsWith("auth_") ? attempt.lastEvent : "");
    const row: Record<string, unknown> = {
      ...attempt,
      diagnosisKind: diagnosis.kind,
      diagnosisCode: diagnosis.code,
      diagnosisEvidenceEvent: diagnosis.evidence?.event,
      diagnosisEvidenceHttpStatus: diagnosis.evidence?.httpStatus,
      authEvent,
      createdAtIso: iso(attempt.createdAtMs),
      startedAtIso: iso(attempt.startedAtMs),
      updatedAtIso: iso(attempt.updatedAtMs),
      displayedAtIso: iso(attempt.displayedAtMs),
      emojisJson: JSON.stringify(attempt.emojis ?? []),
      eventsJson: JSON.stringify(events),
    };
    return ATTEMPT_CSV_COLUMNS.map((column) => cell(row[column]));
  });
  return `\uFEFF${[ATTEMPT_CSV_COLUMNS.map(cell), ...rows].map((row) => row.join(",")).join("\r\n")}\r\n`;
}
