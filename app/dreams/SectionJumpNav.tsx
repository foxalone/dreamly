import type { LucideIcon } from "lucide-react";
import {
  BookOpenText,
  Brain,
  CircleHelp,
  Compass,
  LibraryBig,
  MoonStar,
  Sparkles,
} from "lucide-react";

const sections: Array<{ id: string; label: string; icon: LucideIcon }> = [
  { id: "meaning", label: "Meaning", icon: BookOpenText },
  { id: "psychology", label: "Psychology", icon: Brain },
  { id: "spiritual", label: "Spiritual", icon: Sparkles },
  { id: "islamic", label: "Islamic", icon: MoonStar },
  { id: "biblical", label: "Biblical", icon: LibraryBig },
  { id: "questions", label: "Questions", icon: CircleHelp },
  { id: "related", label: "Related", icon: Compass },
];

export default function SectionJumpNav({ accent }: { accent: string }) {
  return (
    <nav aria-label="On this page" className="mt-9">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Explore this symbol</p>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {sections.map(({ id, label, icon: Icon }) => (
          <a
            key={id}
            href={`#${id}`}
            className="group flex min-w-0 flex-col items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.035] px-1 py-3 text-center transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07]"
          >
            <span
              className="grid size-9 place-items-center rounded-xl transition group-hover:scale-105"
              style={{ backgroundColor: `${accent}18`, color: accent }}
            >
              <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <span className="max-w-full truncate text-[10px] font-medium text-zinc-400 group-hover:text-zinc-100 sm:text-[11px]">
              {label}
            </span>
          </a>
        ))}
      </div>
    </nav>
  );
}
