import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { DreamGuide } from "@/lib/dream-guides";

export default function GuideLinkCards({
  guides,
  compact = false,
}: {
  guides: DreamGuide[];
  compact?: boolean;
}) {
  if (guides.length === 0) return null;

  return (
    <div className={`grid gap-3 ${compact ? "sm:grid-cols-1" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
      {guides.map((guide) => (
        <Link
          key={guide.slug}
          href={`/dreams/${guide.slug}`}
          className="group flex items-start gap-4 rounded-2xl border border-[var(--dd-border)] bg-[var(--dd-surface)] p-5 transition hover:-translate-y-0.5 hover:border-[var(--dd-border-strong)]"
        >
          <span className="text-3xl" aria-hidden="true">
            {guide.icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-3">
              <span className="font-semibold text-[var(--dd-text)]">{guide.name}</span>
              <ArrowRight
                size={15}
                className="shrink-0 text-[var(--dd-faint)] transition group-hover:translate-x-1 group-hover:text-[var(--dd-text)]"
                aria-hidden="true"
              />
            </span>
            <span className="mt-2 block text-sm leading-6 text-[var(--dd-muted)]">{guide.summary}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
