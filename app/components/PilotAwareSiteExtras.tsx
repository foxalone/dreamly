"use client";

import { Suspense, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AD_UNLOCK_PATH } from "@/lib/adUnlock";
import { isJaDreamFormPath, isJaPilotPath } from "@/lib/jaPilotPaths";

function AdPageExtras({ children }: { children: ReactNode }) {
  const params = useSearchParams();
  const japanese = params.get("kind") === "analysis" && isJaDreamFormPath(params.get("next") ?? "");
  return japanese ? null : children;
}

export default function PilotAwareSiteExtras({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const japanese = isJaPilotPath(pathname);
  if (japanese && pathname !== "/ja") return null;
  if (pathname === AD_UNLOCK_PATH) {
    return <Suspense fallback={null}><AdPageExtras>{children}</AdPageExtras></Suspense>;
  }
  return children;
}
