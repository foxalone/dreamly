"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { collection, getDocs } from "firebase/firestore";
import { firestore } from "@/lib/firebase";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

type CityStats = {
  cityId?: string;
  city?: string;
  country?: string;
  admin1?: string;
  lat?: number;
  lng?: number;
  totalDreams?: number;
  emojis?: Record<string, number>;
};

function calculateSize(count: number) {
  const base = 14;
  const multiplier = 8;
  return base + Math.log(count + 1) * multiplier;
}

const WASHINGTON: [number, number] = [-77.0369, 38.9072];

// 🔥 универсальный парсер emojis (работает и для nested и для flat)
function extractEmojis(raw: any): [string, number][] {
  if (!raw || typeof raw !== "object") return [];

  // 1) normal nested object: { emojis: { "🍄": 2 } }
  if (raw.emojis && typeof raw.emojis === "object") {
    return Object.entries(raw.emojis)
      .map(([k, v]) => [k, Number(v)] as [string, number])
      .filter(([, v]) => Number.isFinite(v) && v > 0);
  }

  // 2) flat keys: { "emojis.🍄": 2 }
  const out: [string, number][] = [];
  for (const key of Object.keys(raw)) {
    if (!key.startsWith("emojis.")) continue;
    const emoji = key.slice("emojis.".length);
    const val = Number((raw as any)[key]);
    if (Number.isFinite(val) && val > 0) out.push([emoji, val]);
  }
  return out;
}

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: WASHINGTON,
      zoom: 9,
    });

    mapInstance.current = map;
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-left");

    map.on("load", async () => {
     

      await loadCities(map);
    });

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  async function loadCities(map: mapboxgl.Map) {
    const snapshot = await getDocs(collection(firestore, "city_emoji_stats"));

    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as CityStats;

      console.log("CITY RAW:", docSnap.data());

      const lat = Number((data as any)?.lat);
      const lng = Number((data as any)?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const entries = extractEmojis(data);
      if (entries.length === 0) return;

const baseRadius = 28;
const extraRadius = Math.min(entries.length * 4, 40);
const R = baseRadius + extraRadius;


      entries
        .sort((a, b) => b[1] - a[1]) // bigger first
        .slice(0, 12)
        .forEach(([emoji, count], index) => {
          const size = calculateSize(Number(count));

          const el = document.createElement("div");
          el.textContent = emoji;
          el.style.fontSize = `${size}px`;
          el.style.lineHeight = `${size}px`;
          el.style.userSelect = "none";
          el.style.cursor = "default";
          el.style.textShadow = "0 2px 10px rgba(0,0,0,.9)";
          el.style.filter = "drop-shadow(0 4px 8px rgba(0,0,0,.6))";
          el.style.zIndex = "10";

          const angle = (index / Math.max(1, Math.min(entries.length, 12))) * Math.PI * 2;
          const dx = Math.round(Math.cos(angle) * R);
          const dy = Math.round(Math.sin(angle) * R);

          new mapboxgl.Marker({ element: el, offset: [dx, dy] })
            .setLngLat([lng, lat])
            .addTo(map);
        });
    });
  }

  const bottomSpace = 96;

  return (
    <div className="w-full">
      <div className="px-4 pt-6 pb-3">
        <h1 className="text-xl font-semibold">Global Dream Map</h1>
      </div>

      <div
        ref={mapRef}
        className="w-full"
        style={{ height: `calc(100dvh - ${bottomSpace + 64}px)` }}
      />
    </div>
  );
}