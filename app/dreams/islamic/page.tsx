import type { Metadata } from "next";
import FaithHub from "../FaithHub";
import { PARENT_DREAMS } from "@/lib/dream-dictionary";

export const metadata: Metadata = {
  title: `Islamic Dream Meanings: ${PARENT_DREAMS.length} Symbols Explained | Dreamly`,
  description:
    "Islamic dream interpretation for snakes, water, teeth, fire, marriage, and more — approached with the tradition's distinction between true dreams, ordinary dreams, and distressing ones.",
  alternates: { canonical: "/dreams/islamic" },
  openGraph: {
    title: "Islamic Dream Meanings",
    description: "Common dream symbols considered through the Islamic dream tradition.",
    url: "/dreams/islamic",
    type: "website",
  },
};

export default function IslamicDreamMeaningsPage() {
  return (
    <FaithHub
      config={{
        slug: "islamic",
        heading: "Islamic Dream Meanings",
        anchor: "islamic",
        perspectiveLabel: "Islamic meaning",
        intro: [
          "The Islamic tradition distinguishes between three kinds of dreams: truthful dreams regarded as glad tidings, dreams that arise from the self and its daily concerns, and distressing dreams. Interpretation is approached with humility — a dream is never treated as certain knowledge of the unseen, is not evidence against another person, and should be shared only with someone trustworthy.",
          "Each symbol below links to a full Islamic reflection presented alongside psychological, spiritual, and biblical readings, so interpretation stays grounded rather than fearful.",
        ],
      }}
    />
  );
}
