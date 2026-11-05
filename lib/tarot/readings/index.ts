import type { Locale } from "@/lib/i18n/config";
import type { MajorArcanaId } from "../deck";
import { ar } from "./ar";
import { de } from "./de";
import { en } from "./en";
import { es } from "./es";
import { pt } from "./pt";
import { ru } from "./ru";
import type { TarotReading } from "./types";

export const tarotReadings: Record<Locale, Record<MajorArcanaId, TarotReading>> = { en, es, ar, pt, de, ru };
