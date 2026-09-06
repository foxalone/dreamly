import type { Metadata } from "next";
import type { ReactNode } from "react";
import DreamDictionaryHeader from "./DreamDictionaryHeader";
import DictionaryFooter from "./DictionaryFooter";
import ScrollDepthTracker from "./ScrollDepthTracker";

export const metadata: Metadata = {
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
  },
};

export default function DreamDictionaryLayout({ children }: { children: ReactNode }) {
  return (
    <div className="dream-dictionary min-h-screen bg-[var(--dd-bg)] text-[var(--dd-text)]">
      <ScrollDepthTracker />
      <DreamDictionaryHeader />
      <div>{children}</div>
      <DictionaryFooter />
    </div>
  );
}
