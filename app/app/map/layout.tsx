import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MapShell, mapMetadata } from "./mapSeo";

export const metadata: Metadata = mapMetadata("en");

export default function MapLayout({ children }: { children: ReactNode }) {
  return <MapShell locale="en">{children}</MapShell>;
}
