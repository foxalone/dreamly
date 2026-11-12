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

export default function DreamOriginGlobe({ cityId, city, country, mapLabel }: {
  cityId?: string;
  city?: string;
  country?: string;
  mapLabel: string;
}) {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);

  useEffect(() => {
    if (!cityId) return;
    let active = true;
    void coordinatesFor(cityId).then((value) => { if (active) setCoordinates(value); });
    return () => { active = false; };
  }, [cityId]);

  const location = [city, country].filter(Boolean).join(", ");
  const label = location ? `${mapLabel} · ${location}` : mapLabel;
  const position = coordinates ? {
    "--origin-x": `${80 + ((coordinates.lng + 180) / 360) * 80}px`,
    "--origin-y": `${((90 - coordinates.lat) / 180) * 40}px`,
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
          {coordinates ? <><span className={styles.marker} /><span className={styles.marker} /><span className={styles.marker} /></> : null}
        </span>
      </span>
    </LocaleLink>
  );
}
