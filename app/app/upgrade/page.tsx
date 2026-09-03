// app/app/upgrade/page.tsx
export const dynamic = "force-dynamic";

import UpgradeClient from "./UpgradeClient";

type SP = Record<string, string | string[] | undefined>;

// Next 16 всегда передаёт searchParams промисом (await undefined → undefined,
// так что необязательность сохраняется).
export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<SP>;
}) {
  const sp = await searchParams;

  const pkgRaw = sp?.pkg;
  const pkg = Array.isArray(pkgRaw) ? pkgRaw[0] : pkgRaw;

  return <UpgradeClient initialPkg={pkg ?? null} />;
}