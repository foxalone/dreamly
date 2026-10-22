"use client";
import type { Locale } from "@/lib/i18n/config";
import MoonGate from "@/app/components/moon/MoonGate";
import AppHeader from "@/app/app/AppHeader";
import MoonGlobe from "./MoonGlobe";
export default function MoonExperience({ locale }: { locale: Locale }) {
  return <><AppHeader /><MoonGate>{access => <MoonGlobe locale={locale} pins={access.pins} />}</MoonGate></>;
}
