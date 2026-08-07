"use client";

import { useState } from "react";
import { Download } from "lucide-react";

import { auth } from "@/lib/firebase";

function filenameFromHeader(header: string | null) {
  const match = header?.match(/filename="([^"]+)"/i);
  return match?.[1] || `dreamly-query-logs-${new Date().toISOString().slice(0, 10)}.csv`;
}

export default function QueriesCsvDownload() {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function downloadCsv() {
    setDownloading(true);
    setError(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Sign in required");

      const response = await fetch("/api/admin/query-logs-export", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to export queries");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filenameFromHeader(response.headers.get("content-disposition"));
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(
        downloadError instanceof Error ? downloadError.message : "Failed to export queries",
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={downloadCsv}
        disabled={downloading}
        className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[color-mix(in_srgb,var(--text)_8%,transparent)] disabled:opacity-50"
      >
        <Download size={16} aria-hidden="true" />
        {downloading ? "Preparing CSV…" : "Download all as CSV"}
      </button>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
