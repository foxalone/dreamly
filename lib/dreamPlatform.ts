export type DreamPlatform = "web" | "android";

export function dreamPlatform(value: unknown): DreamPlatform | undefined {
  return value === "web" || value === "android" ? value : undefined;
}

export function platformFromAgent(userAgent: string): DreamPlatform {
  return /\bDreamly(?:Native|Android)\b/i.test(userAgent) ? "android" : "web";
}

export function requestDreamPlatform(headers: Headers): DreamPlatform {
  return platformFromAgent(headers.get("user-agent") ?? "");
}

export function savedDreamPlatform(data: { platform?: unknown }, id: string) {
  return dreamPlatform(data.platform) ?? (id.startsWith("android_guest_") ? "android" : undefined);
}
