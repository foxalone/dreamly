import type { Metadata } from "next";
import FaithHub from "../FaithHub";
import { PARENT_DREAMS } from "@/lib/dream-dictionary";

export const metadata: Metadata = {
  title: `Spiritual Dream Meanings: ${PARENT_DREAMS.length} Symbols Explained | Dreamly`,
  description:
    "Spiritual dream interpretation for snakes, water, angels, fire, death, and more — dreams read as invitations to reflection, growth, and honest attention rather than predictions.",
  alternates: { canonical: "/dreams/spiritual" },
  openGraph: {
    title: "Spiritual Dream Meanings",
    description: "What common dream symbols can mean as spiritual invitations to reflect and grow.",
    url: "/dreams/spiritual",
    type: "website",
  },
};

export default function SpiritualDreamMeaningsPage() {
  return (
    <FaithHub
      config={{
        slug: "spiritual",
        heading: "Spiritual Dream Meanings",
        anchor: "spiritual",
        perspectiveLabel: "Spiritual meaning",
        intro: [
          "A spiritual reading of a dream asks a different question than prediction: not \"what will happen?\" but \"what quality is this season of life asking me to practice?\" Patience, courage, release, protection, gratitude, discernment — a vivid symbol often marks the place where one of these is needed.",
          "Each symbol below links to a full spiritual reflection alongside its psychological, Islamic, and biblical readings, so the interpretation deepens awareness instead of creating fear.",
        ],
      }}
    />
  );
}
