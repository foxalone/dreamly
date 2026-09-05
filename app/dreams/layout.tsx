import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import BottomNav from "@/app/app/BottomNav";
import { DREAM_CATEGORIES, type DreamCategory } from "@/lib/dream-categories";
import DreamDictionaryHeader from "./DreamDictionaryHeader";
import ScrollDepthTracker from "./ScrollDepthTracker";

export const metadata: Metadata = {
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
  },
};

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
      <ScrollDepthTracker />
      <DreamDictionaryHeader />
      <div>{children}</div>
      <footer className="border-t border-[var(--dd-border)] pb-32">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-8">
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
          <nav aria-label="Legal">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dd-subtle)]">Legal</p>
            <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
              <li>
                <Link href="/privacy" className="text-sm text-[var(--dd-muted)] transition hover:text-[var(--dd-text)]">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-[var(--dd-muted)] transition hover:text-[var(--dd-text)]">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </footer>
      <BottomNav />
    </div>
  );
}
