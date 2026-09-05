import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
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
  { href: "/dreams/why-we-dream", label: "Why We Dream" },
  { href: "/dreams/types-of-dreams", label: "Types of Dreams" },
  { href: "/dreams/lucid-dreams", label: "Lucid Dreams" },
  { href: "/dreams/remembering-dreams", label: "Remembering Dreams" },
  { href: "/dreams#how-dreaming-works", label: "How dreaming works" },
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
      <footer className="border-t border-[var(--dd-border)]">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-10 sm:grid-cols-2 sm:px-8 sm:py-12 lg:grid-cols-[1.3fr_1.3fr_0.8fr] lg:gap-12">
          <nav aria-label="Dictionary hubs">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dd-subtle)]">Explore</p>
            <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 min-[380px]:grid-cols-2">
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
            <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 min-[380px]:grid-cols-2">
              {(Object.keys(DREAM_CATEGORIES) as DreamCategory[]).map((category) => (
                <li key={category}>
                  <Link href={`/dreams/categories/${category}`} className="text-sm text-[var(--dd-muted)] transition hover:text-[var(--dd-text)]">
                    {DREAM_CATEGORIES[category].label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Legal" className="sm:col-span-2 lg:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dd-subtle)]">Legal</p>
            <ul className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-5 lg:flex-col">
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
    </div>
  );
}
