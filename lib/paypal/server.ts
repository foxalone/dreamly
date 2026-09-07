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