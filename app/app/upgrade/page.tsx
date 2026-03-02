// app/app/upgrade/page.tsx
export const dynamic = "force-dynamic";

import UpgradeClient from "./UpgradeClient";

type SP = Record<string, string | string[] | undefined>;

// Next (в некоторых версиях) даёт searchParams как Promise — поддержим оба варианта
export default async function Page({
  searchParams,
}: {
  searchParams?: SP | Promise<SP>;
}) {
  const sp = searchParams ? await Promise.resolve(searchParams) : undefined;

  const pkgRaw = sp?.pkg;
  const pkg = Array.isArray(pkgRaw) ? pkgRaw[0] : pkgRaw;

  return <UpgradeClient initialPkg={pkg ?? null} />;
}