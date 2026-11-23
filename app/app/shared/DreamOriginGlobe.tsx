"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { doc, getDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import LocaleLink from "@/lib/i18n/LocaleLink";
import styles from "./DreamOriginGlobe.module.css";

type Coordinates = { lat: number; lng: number };
const cityCoordinates = new Map<string, Promise<Coordinates | null>>();

function coordinatesFor(cityId: string) {
  let pending = cityCoordinates.get(cityId);
  if (!pending) {
    pending = (async () => {
      for (const collectionName of ["city_emoji_stats", "cities"]) {
        const snapshot = await getDoc(doc(firestore, collectionName, cityId));
        const lat = Number(snapshot.data()?.lat);
        const lng = Number(snapshot.data()?.lng);
        if (snapshot.exists() && Number.isFinite(lat) && Number.isFinite(lng) &&
            Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
      }
      return null;
    })().catch(() => null);
    cityCoordinates.set(cityId, pending);
  }
  return pending;
}

export default function DreamOriginGlobe({ cityId, city, country, mapLabel, coordinates }: {
  cityId?: string;
  city?: string;
  country?: string;
  mapLabel: string;
  coordinates?: Coordinates | null;
}) {
  const [resolved, setResolved] = useState<{ cityId: string; coordinates: Coordinates | null } | null>(null);

  useEffect(() => {
    if (!cityId || coordinates !== undefined) return;
    let active = true;
    void coordinatesFor(cityId).then((value) => { if (active) setResolved({ cityId, coordinates: value }); });
    return () => { active = false; };
  }, [cityId, coordinates]);

  const location = [city, country].filter(Boolean).join(", ");
  const label = location ? `${mapLabel} · ${location}` : mapLabel;
  const origin = coordinates === undefined ? (resolved?.cityId === cityId ? resolved?.coordinates : null) : coordinates;
  const position = origin ? {
    "--origin-x": `${80 + ((origin.lng + 180) / 360) * 80}px`,
    "--origin-y": `${((90 - origin.lat) / 180) * 40}px`,
  } as CSSProperties : undefined;

  return (
    <LocaleLink
      href={cityId ? `/app/map?city=${encodeURIComponent(cityId)}` : "/app/map"}
      className={styles.link}
      aria-label={label}
      title={label}
    >
      <span className={styles.orb} aria-hidden="true">
        <span className={styles.surface} style={position}>
          {origin ? <><span className={styles.marker} /><span className={styles.marker} /><span className={styles.marker} /></> : null}
        </span>
      </span>
    </LocaleLink>
  );
}
