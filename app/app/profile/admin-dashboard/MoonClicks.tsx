"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { adminMoonClicksCopy } from "@/lib/i18n/adminMoonClicks";

export default function MoonClicks({ user }: { user: User }) {
  const locale = useLocale();
  const copy = adminMoonClicksCopy[locale];
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(false);
      try {
        const response = await fetch("/api/admin/moon-clicks", {
          headers: { Authorization: `Bearer ${await user.getIdToken()}` },
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("COUNT_FAILED");
        const data = await response.json();
        if (!controller.signal.aborted) setTotal(data.total);
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [user, revision]);

  return <section className="mt-5 rounded-2xl border border-[var(--border)] p-4" aria-label={copy.title} dir={locale === "ar" ? "rtl" : undefined}>
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-semibold">🌙 {copy.title}</h2>
      <button type="button" onClick={() => setRevision(value => value + 1)} disabled={loading} className="rounded-full border border-[var(--border)] px-3 py-1 text-sm disabled:opacity-50">{copy.refresh}</button>
    </div>
    <p className="mt-2 text-3xl font-semibold" role="status">{loading ? copy.loading : error ? "—" : total?.toLocaleString(locale)}</p>
    {error ? <p role="alert" className="mt-2 text-sm">{copy.error}</p> : null}
    <p className="mt-2 text-sm text-[var(--muted)]">{copy.note}</p>
  </section>;
}
