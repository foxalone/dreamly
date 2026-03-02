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