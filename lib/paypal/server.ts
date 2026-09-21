// app/src/lib/paypal/server.ts
function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export function paypalBaseUrl() {
  return process.env.PAYPAL_ENV === "sandbox"
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";
}

export async function getPaypalAccessToken() {
  const clientId = mustEnv("PAYPAL_CLIENT_ID");
  const secret = mustEnv("PAYPAL_CLIENT_SECRET");

  const basic = Buffer.from(`${clientId}:${secret}`).toString("base64");

  const r = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  const j = await r.json();
  if (!r.ok) throw new Error(`PayPal token error: ${j?.error_description || j?.error || "unknown"}`);
  return j.access_token as string;
}

export function getSiteBaseUrl(req?: Request) {
  const env = (process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || "").trim().replace(/\/+$/, "");
  if (env) return env;
  const origin = req?.headers.get("origin")?.trim().replace(/\/+$/, "");
  if (origin) return origin;
  return "http://localhost:3000";
}

export async function paypalFetch(path: string, init?: RequestInit) {
  const token = await getPaypalAccessToken();
  const headers = new Headers(init?.headers);
  if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && init?.body) headers.set("Content-Type", "application/json");
  const r = await fetch(`${paypalBaseUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  const json = await r.json().catch(() => ({} as Record<string, unknown>));
  return { ok: r.ok, status: r.status, json };
}

/** First 6 chars of an id, enough to tell two PayPal apps apart in logs without leaking the id. */
export function fingerprint(v: string | undefined | null) {
  const s = String(v ?? "").trim();
  return s ? `${s.slice(0, 6)}…(${s.length})` : "(empty)";
}

/**
 * Server-side sanity check of the PayPal configuration. The JS SDK in the
 * browser is loaded with NEXT_PUBLIC_PAYPAL_CLIENT_ID, while subscriptions
 * are created with PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET. When those belong
 * to different PayPal apps (or one is sandbox and the other live) PayPal's
 * checkout shows only a generic "something went wrong" page, so we refuse to
 * start a checkout that cannot succeed and say why in the server log.
 */
export function paypalConfigProblems(): string[] {
  const problems: string[] = [];
  const serverId = (process.env.PAYPAL_CLIENT_ID || "").trim();
  const publicId = (process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "").trim();
  const secret = (process.env.PAYPAL_CLIENT_SECRET || "").trim();
  const env = (process.env.PAYPAL_ENV || "").trim();

  if (!serverId) problems.push("PAYPAL_CLIENT_ID is empty");
  if (!secret) problems.push("PAYPAL_CLIENT_SECRET is empty");
  if (!publicId) problems.push("NEXT_PUBLIC_PAYPAL_CLIENT_ID is empty");
  if (serverId && publicId && serverId !== publicId) {
    problems.push(
      `PAYPAL_CLIENT_ID (${fingerprint(serverId)}) and NEXT_PUBLIC_PAYPAL_CLIENT_ID (${fingerprint(
        publicId
      )}) are different PayPal apps`
    );
  }
  if (env && env !== "live" && env !== "sandbox") {
    problems.push(`PAYPAL_ENV must be "live" or "sandbox", got "${env}"`);
  }
  return problems;
}

/**
 * Structured server log for the PayPal flow. Never pass tokens, secrets or
 * full PayPal payloads — ids, statuses and PayPal's `debug_id` are enough to
 * look an incident up in the PayPal dashboard.
 */
export function logPaypal(
  level: "info" | "warn" | "error",
  step: string,
  fields: Record<string, unknown>
) {
  const line = `[paypal] ${step} ${JSON.stringify({ env: process.env.PAYPAL_ENV || "live", ...fields })}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

/** Pull the fields worth logging out of a PayPal error response. */
export function paypalErrorSummary(json: unknown) {
  const j = (json && typeof json === "object" ? json : {}) as Record<string, unknown>;
  const details = Array.isArray(j.details)
    ? (j.details as Array<Record<string, unknown>>).map((d) => ({
        issue: d.issue,
        field: d.field,
        description: d.description,
      }))
    : undefined;
  return {
    name: j.name ?? j.error ?? null,
    message: j.message ?? j.error_description ?? null,
    debug_id: j.debug_id ?? null,
    details,
  };
}
