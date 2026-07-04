import type { Metadata } from "next";
import FaithHub from "../FaithHub";
import { PARENT_DREAMS } from "@/lib/dream-dictionary";

export const metadata: Metadata = {
  title: `Biblical Dream Meanings: ${PARENT_DREAMS.length} Symbols Explained | Dreamly`,
  description:
    "Biblical dream interpretation for snakes, water, death, fire, babies, weddings, and more — symbols weighed against scriptural themes of wisdom, stewardship, testing, and hope.",
  alternates: { canonical: "/dreams/biblical" },
  openGraph: {
    title: "Biblical Dream Meanings",
    description: "What common dream symbols can mean when reflected on through scripture.",
    url: "/dreams/biblical",
    type: "website",
  },
};

export default function BiblicalDreamMeaningsPage() {
  return (
    <FaithHub
      config={{
        slug: "biblical",
        heading: "Biblical Dream Meanings",
        anchor: "biblical",
        perspectiveLabel: "Biblical meaning",
        intro: [
          "Scripture treats some dreams as significant — Joseph's sheaves, Pharaoh's cattle, the warnings given to the Magi — while never suggesting that every dream is a message. A biblical approach to a modern dream is therefore careful: it weighs the symbol against scriptural themes, the dreamer's circumstances, prayer, and wise counsel rather than reading it as a private prophecy.",
          "Each symbol below links to a full biblical reflection alongside its psychological, spiritual, and Islamic readings, so the same dream can be considered from several angles before any conclusion is drawn.",
        ],
      }}
    />
  );
}
