"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useMessages } from "@/lib/i18n/LocaleProvider";
import HomeDreamAsk from "./HomeDreamAsk";

export default function HomeHero() {
  const t = useMessages();
  const [hasResult, setHasResult] = useState(false);

  return (
    <section
      className={
        hasResult
          ? "relative flex flex-col items-center pb-10 pt-6"
          : "relative flex min-h-[88svh] flex-col"
      }
    >
      <div className={hasResult ? "w-full max-w-2xl text-center" : "flex flex-1 items-center justify-center"}>
        <div className="w-full max-w-2xl text-center">
          <p
            className="mb-8 bg-clip-text text-4xl font-semibold tracking-wide text-transparent sm:text-6xl"
            style={{
              backgroundImage:
                "linear-gradient(90deg, #ff4d6d 0%, #ff9e00 18%, #ffd60a 36%, #38d39f 54%, #4dabf7 72%, #9775fa 100%)",
            }}
          >
            Dreamly
          </p>
          <h1 className="text-xl font-medium sm:text-2xl">{t.home.h1}</h1>
          <p className="mt-6 text-base text-[var(--muted)] sm:text-lg">{t.home.lead}</p>
          <HomeDreamAsk onResultChange={setHasResult} />
        </div>
      </div>
      {hasResult ? null : (
        <a
          href="#features"
          className="flex flex-col items-center gap-1.5 pb-5 text-[var(--muted)] transition-colors hover:text-[var(--text)]"
        >
          <span className="text-sm font-medium">{t.home.discover}</span>
          <ChevronDown size={20} className="animate-bounce" aria-hidden="true" />
        </a>
      )}
    </section>
  );
}
