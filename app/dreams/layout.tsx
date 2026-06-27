import type { ReactNode } from "react";
import Link from "next/link";
import { MoonStar } from "lucide-react";
import BottomNav from "@/app/app/BottomNav";

export default function DreamDictionaryLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#09090d] text-white">
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#09090d]/86 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 sm:px-8">
          <Link href="/dreams" className="flex items-center gap-2.5 text-sm font-semibold tracking-wide text-white">
            <span className="grid size-8 place-items-center rounded-xl bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/20">
              <MoonStar size={17} aria-hidden="true" />
            </span>
            <span>Dreamly Dictionary</span>
          </Link>
          <Link
            href="/app/dreams"
            className="rounded-full border border-white/10 px-3.5 py-2 text-xs font-medium text-zinc-300 transition hover:border-violet-400/30 hover:bg-violet-400/10 hover:text-white"
          >
            Open journal
          </Link>
        </div>
      </header>
      <div className="pb-28">{children}</div>
      <BottomNav />
    </div>
  );
}
