import { TarotGuideHub, tarotHubMetadata } from "./TarotGuide";

export const metadata = tarotHubMetadata("en");

export default function Page() {
  return <TarotGuideHub locale="en" />;
}
