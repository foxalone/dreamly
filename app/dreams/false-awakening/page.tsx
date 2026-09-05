import type { Metadata } from "next";
import DreamGuidePage from "../DreamGuidePage";
import { getDreamGuide } from "@/lib/dream-guides";

const GUIDE = getDreamGuide("false-awakening")!;

export const metadata: Metadata = {
  title: GUIDE.seoTitle,
  description: GUIDE.seoDescription,
  alternates: { canonical: `/dreams/${GUIDE.slug}` },
  openGraph: {
    title: GUIDE.seoTitle,
    description: GUIDE.seoDescription,
    url: `/dreams/${GUIDE.slug}`,
    type: "article",
  },
};

export default function FalseAwakeningPage() {
  return <DreamGuidePage guide={GUIDE} />;
}
