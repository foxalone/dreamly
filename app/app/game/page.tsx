import type { Metadata } from "next";
import GamePage from "./GamePage";

export const metadata: Metadata = {
  title: "Dream Kingdoms — Dreamly",
};

export default function Page() {
  return <GamePage locale="en" />;
}
