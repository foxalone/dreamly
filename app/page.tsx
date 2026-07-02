import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { DREAM_DICTIONARY, POPULAR_DREAM_SLUGS } from "@/lib/dream-dictionary";

export default function HomePage() {
  const popularDreams = POPULAR_DREAM_SLUGS.map((slug) => DREAM_DICTIONARY[slug]).filter(Boolean);

  return (
    <main className="min-h-screen bg-black text-white px-6">
      <section className="relative min-h-[92svh] flex items-center justify-center">
        <div className="text-center max-w-2xl">
          <h1
            className="text-4xl sm:text-6xl font-semibold tracking-wide mb-8 bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(90deg, #ff4d6d 0%, #ff9e00 18%, #ffd60a 36%, #38d39f 54%, #4dabf7 72%, #9775fa 100%)",
            }}
          >
            Dreamly
          </h1>

          <h2 className="text-xl sm:text-2xl font-medium">
            AI Dream Journal & Anonymous Dream Map
          </h2>

          <p className="mt-6 text-neutral-400 text-base sm:text-lg">
            Capture your dreams. Discover shared symbols.
            See what the world is dreaming.
          </p>

          <Link
            href="/app"
            className="mt-10 inline-block bg-purple-600 hover:bg-purple-500
                       text-white text-lg font-semibold
                       px-10 py-4 rounded-2xl
                       transition-all duration-200
                       hover:scale-105 active:scale-95"
          >
            Start Free
          </Link>
        </div>

        <a
          href="#popular-dreams"
          className="absolute bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-neutral-400 transition-colors hover:text-white"
        >
          <span className="text-sm font-medium">Popular dream meanings</span>
          <ChevronDown size={20} className="animate-bounce" aria-hidden="true" />
        </a>
      </section>

      <section id="popular-dreams" aria-labelledby="popular-dreams-title" className="mx-auto max-w-4xl scroll-mt-8 pb-24 pt-6">
        <div className="text-center">
          <h2 id="popular-dreams-title" className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Popular dream meanings
          </h2>
          <p className="mt-4 text-neutral-400 text-base sm:text-lg">
            Explore the dream dictionary — psychological, spiritual, Islamic, and
            biblical interpretations of the symbols people dream about most.
          </p>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {popularDreams.map((entry) => (
            <Link
              key={entry.slug}
              href={`/dreams/${entry.slug}`}
              className="group flex items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 transition hover:-translate-y-0.5 hover:border-neutral-600 hover:bg-neutral-900"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-neutral-900 text-2xl" aria-hidden="true">
                {entry.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{entry.title}</span>
                <span className="mt-0.5 block truncate text-xs text-neutral-500">{entry.shortMeaning}</span>
              </span>
              <ArrowRight size={15} className="shrink-0 text-neutral-600 transition group-hover:translate-x-0.5 group-hover:text-white" aria-hidden="true" />
            </Link>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/dreams"
            className="inline-flex items-center gap-2 rounded-2xl border border-neutral-700 px-8 py-3.5 text-base font-semibold transition-all duration-200 hover:border-neutral-500 hover:bg-neutral-900"
          >
            Browse the full dream dictionary
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
