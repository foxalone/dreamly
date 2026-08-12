import Link from "next/link";
import type { ReactNode } from "react";

export default function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <header className="border-b border-[var(--border)]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="text-sm font-semibold tracking-wide text-[var(--text)]">
            Dreamly
          </Link>
          <nav className="flex items-center gap-4 text-sm text-[var(--muted)]">
            <Link href="/privacy" className="hover:text-[var(--text)]">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-[var(--text)]">
              Terms
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Legal</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text)] sm:text-4xl">{title}</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">Last updated: {updated}</p>
        <div className="prose-legal mt-10 space-y-8 text-[15px] leading-7 text-[var(--muted)] [&_a]:text-[var(--text)] [&_a]:underline [&_a]:underline-offset-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-[var(--text)] [&_li]:mt-1 [&_strong]:font-semibold [&_strong]:text-[var(--text)] [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          {children}
        </div>
      </main>

      <footer className="border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-5 py-8 text-sm text-[var(--muted)] sm:px-8">
          <Link href="/" className="hover:text-[var(--text)]">
            ← Back to Dreamly
          </Link>
          <p>© {new Date().getFullYear()} Dreamly</p>
        </div>
      </footer>
    </div>
  );
}
