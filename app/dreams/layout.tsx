import type { ReactNode } from "react";
import Link from "next/link";
import { MoonStar } from "lucide-react";
import BottomNav from "@/app/app/BottomNav";
import { DREAM_CATEGORIES, type DreamCategory } from "@/lib/dream-dictionary";
import QuickSymbolFab from "./QuickSymbolFab";

const HUB_LINKS: { href: string; label: string }[] = [
  { href: "/dreams", label: "Dream Dictionary" },
  { href: "/dreams/a-z", label: "A–Z Index" },
  { href: "/dreams/most-common", label: "Most Common Dreams" },
  { href: "/dreams/nightmares", label: "Nightmares" },
  { href: "/dreams/biblical", label: "Biblical Meanings" },
  { href: "/dreams/islamic", label: "Islamic Meanings" },
  { href: "/dreams/spiritual", label: "Spiritual Meanings" },
];

export default function DreamDictionaryLayout({ children }: { children: ReactNode }) {
  return (
    <div className="dream-dictionary min-h-screen bg-[var(--dd-bg)] text-[var(--dd-text)]">
      <header className="sticky top-0 z-40 border-b border-[var(--dd-border)] bg-[var(--dd-header)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 sm:px-8">
          <Link href="/dreams" className="flex items-center gap-2.5 text-sm font-semibold tracking-wide text-[var(--dd-text)]">
            <span className="grid size-8 place-items-center rounded-xl bg-violet-500/15 text-[var(--dd-accent-text)] ring-1 ring-violet-400/20">
              <MoonStar size={17} aria-hidden="true" />
            </span>
            <span>Dreamly Dictionary</span>
          </Link>
          <Link
            href="/app/dreams"
            className="rounded-full border border-[var(--dd-border)] px-3.5 py-2 text-xs font-medium text-[var(--dd-text-soft)] transition hover:border-violet-400/30 hover:bg-violet-400/10 hover:text-[var(--dd-text)]"
          >
            Open journal
          </Link>
        </div>
      </header>
      <div>{children}</div>
      <footer className="border-t border-[var(--dd-border)] pb-32">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:grid-cols-2 sm:px-8">
          <nav aria-label="Dictionary hubs">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dd-subtle)]">Explore</p>
            <ul className="mt-4 space-y-2">
              {HUB_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-[var(--dd-muted)] transition hover:text-[var(--dd-text)]">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Dream categories">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dd-subtle)]">Categories</p>
            <ul className="mt-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
              {(Object.keys(DREAM_CATEGORIES) as DreamCategory[]).map((category) => (
                <li key={category}>
                  <Link href={`/dreams/categories/${category}`} className="text-sm text-[var(--dd-muted)] transition hover:text-[var(--dd-text)]">
                    {DREAM_CATEGORIES[category].label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </footer>
      <QuickSymbolFab />
      <BottomNav />
    </div>
  );
}
