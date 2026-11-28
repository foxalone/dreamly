import { createHash } from "node:crypto";
import { offerwallEntitlement } from "@/lib/offerwallSession";

/** Key the viewer's receipt by the browser entitlement so retries cannot award it twice. */
export function offerwallAnalysisReceiptId(request: Request): string | null {
  const entitlement = offerwallEntitlement(request.headers.get("cookie") ?? "");
  return entitlement ? `offerwall_${createHash("sha256").update(entitlement).digest("hex")}` : null;
}
