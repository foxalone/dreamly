"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun, type LucideIcon } from "lucide-react";
import { useMessages } from "@/lib/i18n/LocaleProvider";
import { formatMessage } from "@/lib/i18n/messages";

type Weather = { city: string; tempC: number; code: number };

function iconFor(code: number): LucideIcon {
  if (code === 0) return Sun;
  if (code === 1 || code === 2) return CloudSun;
  if (code === 3) return Cloud;
  if (code === 45 || code === 48) return CloudFog;
  if (code >= 51 && code <= 57) return CloudDrizzle;
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return CloudRain;
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return CloudSnow;
  if (code >= 95) return CloudLightning;
  return Cloud;
}

/** Compact current weather for the visitor's IP, sitting on the diary tab row. */
export default function IpWeatherChip() {
  const t = useMessages();
  const [weather, setWeather] = useState<Weather | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/geo/weather", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.ok || typeof data.city !== "string" || !Number.isFinite(data.tempC)) return;
        setWeather({ city: data.city, tempC: data.tempC, code: Number(data.code) });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!weather) return null;
  const Icon = iconFor(weather.code);
  const label = formatMessage(t.app.weatherHere, { temp: weather.tempC, city: weather.city });

  return (
    <span
      title={label}
      aria-label={label}
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_70%,transparent)] px-2.5 py-2 text-sm font-semibold text-[var(--text)]"
    >
      <Icon size={16} aria-hidden />
      <span className="tabular-nums">{weather.tempC}°</span>
    </span>
  );
}
