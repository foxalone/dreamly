import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function loadDotEnvLocal() {
  const filePath = path.join(process.cwd(), ".env.local");
  if (!existsSync(filePath)) return;
  const source = readFileSync(filePath, "utf8");
  for (const line of source.split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    const key = match[1];
    const raw = match[2] ?? "";
    if (process.env[key] != null) continue;
    if (key === "FIREBASE_SERVICE_ACCOUNT_JSON" && raw.trim().startsWith("{") && !raw.trim().endsWith("}")) {
      process.env[key] = raw.trim();
      continue;
    }
    process.env[key] = raw.replace(/^["']|["']$/g, "").trim();
  }
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) process.env.FIREBASE_SERVICE_ACCOUNT_JSON = "{";
}

loadDotEnvLocal();

async function main() {
  const { ensureNotionPublishWorkspace } = await import("../app/api/admin/_lib/notionPublishLog");
  await ensureNotionPublishWorkspace();
  console.log("Notion schema and views are ready");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
