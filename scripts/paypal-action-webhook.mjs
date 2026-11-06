#!/usr/bin/env node
/** Add the one-time checkout completion event to the existing Dreamly webhook. */
import { readFileSync } from "node:fs";

function env(name) {
  if (process.env[name]?.trim()) return process.env[name].trim();
  const source = readFileSync(".env.local", "utf8");
  const line = source.match(new RegExp(`^${name}=(.*)$`, "m"));
  return line?.[1]?.trim().replace(/^["']|["']$/g, "") ?? "";
}

const base = env("PAYPAL_ENV") === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
const id = env("PAYPAL_WEBHOOK_ID");
if (!id) throw new Error("PAYPAL_WEBHOOK_ID is missing");
const basic = Buffer.from(`${env("PAYPAL_CLIENT_ID")}:${env("PAYPAL_CLIENT_SECRET")}`).toString("base64");
const tokenResponse = await fetch(`${base}/v1/oauth2/token`, {
  method: "POST", headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials",
});
if (!tokenResponse.ok) throw new Error(`PayPal authentication failed (${tokenResponse.status})`);
const token = (await tokenResponse.json()).access_token;
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
const response = await fetch(`${base}/v1/notifications/webhooks/${encodeURIComponent(id)}`, { headers });
if (!response.ok) throw new Error(`Could not read PayPal webhook (${response.status})`);
const hook = await response.json();
if (hook.url !== "https://dreamly.art/api/paypal/webhook") throw new Error("Webhook URL does not match Dreamly");
const events = new Set((hook.event_types ?? []).map(event => event.name));
if (events.has("*") || events.has("PAYMENT.CAPTURE.COMPLETED")) {
  console.log("PayPal webhook already handles one-time captures.");
  process.exit(0);
}
events.add("PAYMENT.CAPTURE.COMPLETED");
if (!process.argv.includes("--apply")) {
  console.log("PayPal webhook needs PAYMENT.CAPTURE.COMPLETED. Run with --apply to add it.");
  process.exit(0);
}
const updated = await fetch(`${base}/v1/notifications/webhooks/${encodeURIComponent(id)}`, {
  method: "PATCH", headers,
  body: JSON.stringify([{ op: "replace", path: "/event_types", value: [...events].map(name => ({ name })) }]),
});
if (!updated.ok) throw new Error(`Could not update PayPal webhook (${updated.status})`);
console.log("Added PAYMENT.CAPTURE.COMPLETED to the existing PayPal webhook.");
