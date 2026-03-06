"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import { collection, getDocs, limit, query } from "firebase/firestore";
import { firestore } from "@/lib/firebase";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

type CityEmojiDoc = {
  cityId?: string;
  city?: string;
  country?: string;
  admin1?: string;
  lat?: number;
  lng?: number;
  totalDreams?: number;
};

type EmojiItem = { emoji: string; count: number; rank: number };

const DEFAULT_CENTER: [number, number] = [-77.0369, 38.9072];

// ---------- utils ----------
function safeNum(n: any): number | null {
  if (n == null) return null;
  const s = String(n).trim().replace(",", ".");
  const x = Number(s);
  return Number.isFinite(x) ? x : null;
}

// вытаскиваем эмодзи из "плоских" полей вида "emojis.🍃": 100
function extractEmojisFromDoc(raw: any): Record<string, number> {
  const out: Record<string, number> = {};
  if (!raw || typeof raw !== "object") return out;

  for (const [key, value] of Object.entries(raw)) {
    if (!key.startsWith("emojis.")) continue;
    const emoji = key.slice("emojis.".length);
    const num = Number(value);
    if (emoji && Number.isFinite(num) && num > 0) out[emoji] = num;
  }
  return out;
}

function toTopItems(map: Record<string, number>, max: number): EmojiItem[] {
  return Object.entries(map)
    .map(([emoji, count]) => ({ emoji, count: Number(count), rank: 0 }))
    .filter((x) => x.emoji && Number.isFinite(x.count) && x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, max)
    .map((x, idx) => ({ ...x, rank: idx }));
}

// равномерно по окружности
function offsetForIndex(i: number, n: number) {
  if (n <= 1) return { ox: 0, oy: 0 };
  const angle = (Math.PI * 2 * i) / n;
  return { ox: Math.cos(angle), oy: Math.sin(angle) };
}

// смещение (в метрах) -> (dLng, dLat) с поправкой на широту
function metersToLngLatOffset(meters: number, latDeg: number, ox: number, oy: number) {
  const latRad = (latDeg * Math.PI) / 180;
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos(latRad);

  const dLat = (meters * oy) / metersPerDegLat;
  const dLng = (meters * ox) / metersPerDegLng;
  return { dLat, dLng };
}

// zoom -> сколько top показываем
function maxRankByZoom(z: number) {
  if (z < 4) return 0; // top1
  if (z < 6) return 2; // top3
  if (z < 8) return 4; // top5
  return Number.POSITIVE_INFINITY; // на большом зуме все
}

// базовый размер от zoom
function baseSizeByZoom(z: number) {
  if (z <= 1) return 7;
  if (z <= 3) return 10;
  if (z <= 6) return 16;
  return 28;
}

// множитель от count (чтобы 100 было заметно больше 1)
function weightByCount(count: number) {
  // log(2)=0.69, log(101)=4.61 → нормальный диапазон
  return 0.85 + Math.log(count + 1) * 0.22;
}

// ---------- theme helpers (как у тебя: dark по умолчанию, light если html.light) ----------
type ThemeMode = "light" | "dark";

function getAppTheme(): ThemeMode {
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

function styleUrlForTheme(t: ThemeMode) {
  return t === "dark"
    ? "mapbox://styles/mapbox/dark-v11"
    : "mapbox://styles/mapbox/light-v11";
}

function applyFog(map: mapboxgl.Map, t: ThemeMode) {
  try {
    if (t === "dark") {
      map.setFog({
        color: "rgb(15, 15, 20)",
        "high-color": "rgb(25, 25, 35)",
        "horizon-blend": 0.08,
      } as any);
    } else {
      map.setFog({
        color: "rgb(245, 246, 250)",
        "high-color": "rgb(220, 230, 255)",
        "horizon-blend": 0.12,
      } as any);
    }
  } catch {}
}

// ---------- component ----------
export default function MapPage() {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const dataRef = useRef<
    Array<{
      cityId: string;
      city?: string;
      admin1?: string;
      country?: string;
      lat: number;
      lng: number;
      totalDreams?: number;
      items: EmojiItem[];
    }>
  >([]);

  async function loadData() {
    const q = query(collection(firestore, "city_emoji_stats"), limit(5000));
    const snap = await getDocs(q);

    const rows: typeof dataRef.current = [];
    let missingCoords = 0;
    let emptyCityId = 0;
    let emptyEmojis = 0;

    snap.forEach((docSnap) => {
      const raw = docSnap.data() as any;
      const d = raw as CityEmojiDoc;

      const cityId = String(raw.cityId ?? docSnap.id ?? "").trim();
      if (!cityId) {
        emptyCityId += 1;
        return;
      }

      const lat = safeNum(raw.lat);
      const lng = safeNum(raw.lng);
      if (lat == null || lng == null) {
        missingCoords += 1;
        if (cityId === "France|Paris") {
          console.log("[map/debug] France|Paris skipped: missing lat/lng", {
            cityId,
            lat: raw.lat ?? null,
            lng: raw.lng ?? null,
          });
        }
        return;
      }

      const emojiMap = extractEmojisFromDoc(raw);
      const items = toTopItems(emojiMap, 999999999);
      if (items.length === 0) {
        emptyEmojis += 1;
        if (cityId === "France|Paris") {
          console.log("[map/debug] France|Paris skipped: no emojis", { cityId });
        }
        return;
      }

      const row = {
        cityId,
        city: raw.city ?? d.city,
        admin1: raw.admin1 ?? d.admin1,
        country: raw.country ?? d.country,
        lat,
        lng,
        totalDreams: safeNum(raw.totalDreams) ?? undefined,
        items,
      };

      rows.push(row);

      if (cityId === "France|Paris") {
        console.log("[map/debug] France|Paris loaded into marker source", {
          cityId,
          lat,
          lng,
          emojis: items.length,
          totalDreams: row.totalDreams ?? null,
        });
      }
    });

    dataRef.current = rows;
    console.log("[map/debug] loaded city_emoji_stats", {
      fetchedDocs: snap.size,
      markerRows: rows.length,
      missingCoords,
      emptyCityId,
      emptyEmojis,
      hasFranceParis: rows.some((r) => r.cityId === "France|Paris"),
    });
  }

  function clearMarkers() {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
  }

  function renderMarkers(map: mapboxgl.Map) {
    clearMarkers();

    const z = map.getZoom();
    const maxRank = maxRankByZoom(z);
    const base = baseSizeByZoom(z);

    for (const city of dataRef.current) {
      const visible = city.items.filter((it) => it.rank <= maxRank);
      if (visible.length === 0) continue;

      const n = visible.length;

      visible.forEach((it, idx) => {
        if (city.cityId === "France|Paris") {
          console.log("[map/debug] France|Paris marker candidate", {
            rank: it.rank,
            emoji: it.emoji,
            count: it.count,
            zoom: z,
          });
        }
        // rank 0 в центре, остальные вокруг (смещение в метрах)
        const { ox, oy } = offsetForIndex(idx, n);
        const rMeters = it.rank === 0 ? 0 : 1200 + it.rank * 260;
        const { dLat, dLng } = metersToLngLatOffset(rMeters, city.lat, ox, oy);

        const size = base * weightByCount(it.count);

        const el = document.createElement("div");
        el.textContent = it.emoji;
        el.style.fontSize = `${size}px`;
        el.style.lineHeight = "1";
        el.style.userSelect = "none";
        el.style.cursor = "pointer";
        el.style.transform = "translate(-50%, -50%)";

        const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
          .setLngLat([city.lng + dLng, city.lat + dLat])
          .addTo(map);

        el.addEventListener("click", (ev) => {
          ev.stopPropagation();

          const html = `
            <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; font-size: 13px;">
              <div style="font-size: 18px; line-height: 1.2;">
                ${it.emoji} <b>${it.count}</b>
              </div>
              <div style="opacity: .85; margin-top: 6px;">
                ${[city.city, city.admin1, city.country].filter(Boolean).join(", ")}
              </div>
            </div>
          `;

          if (!popupRef.current) {
            popupRef.current = new mapboxgl.Popup({
              closeButton: true,
              closeOnClick: true,
              maxWidth: "240px",
            });
          }

          popupRef.current
            .setLngLat([city.lng + dLng, city.lat + dLat])
            .setHTML(html)
            .addTo(map);
        });

        markersRef.current.push(marker);
      });
    }
  }

  useEffect(() => {
    if (!mapElRef.current) return;
    if (mapRef.current) return;

    const initialTheme = getAppTheme();

    const map = new mapboxgl.Map({
      container: mapElRef.current,
      style: styleUrlForTheme(initialTheme),
      center: DEFAULT_CENTER,
      zoom: 3.2,
      projection: { name: "globe" },
      antialias: true,
    });

    mapRef.current = map;

    // fog после каждой загрузки стиля
    map.on("style.load", () => {
      applyFog(map, getAppTheme());
    });

    map.on("load", async () => {
      await loadData();
      renderMarkers(map);
      map.on("zoomend", () => renderMarkers(map));
    });

    // ✅ слушаем переключение темы приложения (html.classList: light добавляется/убирается)
    const root = document.documentElement;
    let lastTheme: ThemeMode = initialTheme;

    const obs = new MutationObserver(() => {
      const nextTheme = getAppTheme();
      if (nextTheme === lastTheme) return;
      lastTheme = nextTheme;

      map.setStyle(styleUrlForTheme(nextTheme));

      // если вдруг в будущем будут слои/источники — можно перерендерить после смены стиля:
      // map.once("style.load", () => renderMarkers(map));
    });

    obs.observe(root, { attributes: true, attributeFilter: ["class"] });

    return () => {
      obs.disconnect();
      try {
        popupRef.current?.remove();
      } catch {}
      clearMarkers();
      try {
        map.remove();
      } catch {}
      mapRef.current = null;
    };
  }, []);

  return (
    <div style={{ height: "100vh", width: "100%", position: "relative" }}>
      <div
        ref={mapElRef}
        style={{ height: "100%", width: "100%", borderRadius: 16, overflow: "hidden" }}
      />
    </div>
  );
}