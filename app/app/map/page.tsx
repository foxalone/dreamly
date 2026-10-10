"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import { collection, getDocs, limit, query } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { localePath, stripLocalePrefix } from "@/lib/i18n/path";
import { BUILDINGS } from "@/lib/game/buildings";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

type MapFilter = "all" | "dreams" | "stories" | "kingdoms";

/** A placed Dream Kingdoms building (from /api/game/kingdoms). */
type KingdomRow = { id: string; buildingId: string; cityId: string; place: string; lat: number; lng: number };

type CityEmojiDoc = {
  cityId?: string;
  city?: string;
  country?: string;
  admin1?: string;
  lat?: number;
  lng?: number;
  totalDreams?: number;
  totalStories?: number;
};

type EmojiItem = { emoji: string; count: number; rank: number };

type CityRow = {
  cityId: string;
  city?: string;
  admin1?: string;
  country?: string;
  lat: number;
  lng: number;
  totalDreams?: number;
  totalStories?: number;
  dreamItems: EmojiItem[];
  storyItems: EmojiItem[];
};

const DEFAULT_CENTER: [number, number] = [-77.0369, 38.9072];

// ---------- utils ----------
function safeNum(n: any): number | null {
  if (n == null) return null;
  const s = String(n).trim().replace(",", ".");
  const x = Number(s);
  return Number.isFinite(x) ? x : null;
}

/** Support flat "emojis.🍃" keys and nested { emojis: { "🍃": n } }. */
function extractEmojisFromDoc(
  raw: any,
  prefix: "emojis" | "storyEmojis"
): Record<string, number> {
  const out: Record<string, number> = {};
  if (!raw || typeof raw !== "object") return out;

  const dotted = `${prefix}.`;
  for (const [key, value] of Object.entries(raw)) {
    if (!key.startsWith(dotted)) continue;
    const emoji = key.slice(dotted.length);
    const num = Number(value);
    if (emoji && Number.isFinite(num) && num > 0) out[emoji] = num;
  }

  const nested = raw[prefix];
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    for (const [emoji, value] of Object.entries(nested)) {
      const num = Number(value);
      if (emoji && Number.isFinite(num) && num > 0) {
        out[emoji] = (out[emoji] ?? 0) + num;
      }
    }
  }

  return out;
}

function mergeEmojiMaps(
  a: Record<string, number>,
  b: Record<string, number>
): Record<string, number> {
  const out: Record<string, number> = { ...a };
  for (const [emoji, count] of Object.entries(b)) {
    out[emoji] = (out[emoji] ?? 0) + count;
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

function itemsForFilter(city: CityRow, filter: MapFilter): EmojiItem[] {
  if (filter === "kingdoms") return [];
  if (filter === "dreams") return city.dreamItems;
  if (filter === "stories") return city.storyItems;
  return toTopItems(
    mergeEmojiMaps(
      Object.fromEntries(city.dreamItems.map((x) => [x.emoji, x.count])),
      Object.fromEntries(city.storyItems.map((x) => [x.emoji, x.count]))
    ),
    999999999
  );
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
  return 0.85 + Math.log(count + 1) * 0.22;
}

// Маркер на обратной стороне глобуса? Публичного API у Mapbox нет, поэтому
// делаем round-trip: точка за горизонтом проецируется на экран, но unproject
// этого пикселя возвращает ближнюю поверхность — далеко от исходной точки.
// Нужно только для стартовой прозрачности нового маркера: сам Mapbox
// проверяет окклюзию лишь через ~60 мс после addTo, и до этого маркер
// с той стороны Земли успевает мелькнуть.
function isBehindGlobe(map: mapboxgl.Map, lng: number, lat: number) {
  const ll = new mapboxgl.LngLat(lng, lat);
  const p = map.project(ll);
  const { width, height } = map.getCanvas().getBoundingClientRect();
  if (p.x < 0 || p.y < 0 || p.x > width || p.y > height) return false;
  const back = map.unproject(p);
  const metersPerPx =
    (40075016 * Math.cos((lat * Math.PI) / 180)) / (512 * Math.pow(2, map.getZoom()));
  return back.distanceTo(ll) > Math.max(metersPerPx * 6, 2000);
}

type MarkerEntry = {
  marker: mapboxgl.Marker;
  el: HTMLDivElement;
  // данные для попапа — обновляются при повторном использовании маркера
  info: { emoji: string; count: number; filter: MapFilter; place: string; lngLat: [number, number]; label?: string };
};

// ---------- theme helpers ----------
type ThemeMode = "light" | "dark";

function getAppTheme(): ThemeMode {
  const root = document.documentElement;
  if (root.classList.contains("light")) return "light";
  if (root.classList.contains("dark")) return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
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

const FILTERS: { key: MapFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "dreams", label: "Dreams" },
  { key: "stories", label: "Stories" },
  { key: "kingdoms", label: "Kingdoms" },
];

// ---------- component ----------
export default function MapPage() {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  const markersRef = useRef<Map<string, MarkerEntry>>(new Map());
  const dataRef = useRef<CityRow[]>([]);
  const filterRef = useRef<MapFilter>("all");
  const kingdomsRef = useRef<KingdomRow[] | null>(null);
  const [filter, setFilter] = useState<MapFilter>("all");

  async function loadData() {
    const q = query(collection(firestore, "city_emoji_stats"), limit(5000));
    const snap = await getDocs(q);

    const rows: CityRow[] = [];
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
        return;
      }

      const dreamMap = extractEmojisFromDoc(raw, "emojis");
      const storyMap = extractEmojisFromDoc(raw, "storyEmojis");
      const dreamItems = toTopItems(dreamMap, 999999999);
      const storyItems = toTopItems(storyMap, 999999999);

      if (dreamItems.length === 0 && storyItems.length === 0) {
        emptyEmojis += 1;
        return;
      }

      rows.push({
        cityId,
        city: raw.city ?? d.city,
        admin1: raw.admin1 ?? d.admin1,
        country: raw.country ?? d.country,
        lat,
        lng,
        totalDreams: safeNum(raw.totalDreams) ?? undefined,
        totalStories: safeNum(raw.totalStories) ?? undefined,
        dreamItems,
        storyItems,
      });
    });

    dataRef.current = rows;
    console.log("[map/debug] loaded city_emoji_stats", {
      fetchedDocs: snap.size,
      markerRows: rows.length,
      missingCoords,
      emptyCityId,
      emptyEmojis,
    });
  }

  function clearMarkers() {
    markersRef.current.forEach((m) => m.marker.remove());
    markersRef.current.clear();
  }

  function openPopup(map: mapboxgl.Map, info: MarkerEntry["info"]) {
    if (info.filter === "kingdoms") {
      const locale = stripLocalePrefix(window.location.pathname).locale;
      const html = `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; font-size: 13px;">
        <div style="font-size: 18px; line-height: 1.2;">${info.emoji} <b>${info.label ?? ""}</b></div>
        <div style="opacity: .85; margin-top: 6px;">${info.place}</div>
        <a href="${localePath("/app/game", locale)}" style="display:inline-block; margin-top: 8px; font-weight: 600; color: #7c3aed; text-decoration: none;">
          Build your own kingdom →
        </a>
      </div>`;
      if (!popupRef.current) {
        popupRef.current = new mapboxgl.Popup({ closeButton: true, closeOnClick: true, maxWidth: "240px" });
      }
      popupRef.current.setLngLat(info.lngLat).setHTML(html).addTo(map);
      return;
    }
    const kindLabel =
      info.filter === "dreams" ? "Dreams" : info.filter === "stories" ? "Stories" : "All";

    const html = `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; font-size: 13px;">
        <div style="font-size: 18px; line-height: 1.2;">
          ${info.emoji} <b>${info.count}</b>
        </div>
        <div style="opacity: .7; margin-top: 4px; font-size: 11px;">
          ${kindLabel}
        </div>
        <div style="opacity: .85; margin-top: 6px;">
          ${info.place}
        </div>
        <a data-dream-meaning style="display:inline-block; margin-top: 8px; font-weight: 600; color: #7c3aed; text-decoration: none;">
          ${info.emoji} Dream meaning →
        </a>
        <div data-emoji-dreams></div>
      </div>
    `;

    if (!popupRef.current) {
      popupRef.current = new mapboxgl.Popup({
        closeButton: true,
        closeOnClick: true,
        maxWidth: "240px",
      });
    }

    popupRef.current.setLngLat(info.lngLat).setHTML(html).addTo(map);

    // Link the emoji to its dictionary meaning (independent of the filter / game).
    const link = popupRef.current.getElement()?.querySelector<HTMLAnchorElement>("a[data-dream-meaning]");
    if (link) {
      const locale = stripLocalePrefix(window.location.pathname).locale;
      link.href = localePath(`/dreams?q=${encodeURIComponent(info.emoji)}`, locale);
      fetch(`/api/map/emoji-symbol?e=${encodeURIComponent(info.emoji)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((res: { slug: string | null; query: string } | null) => {
          if (!res) return;
          const target = res.slug
            ? `/dreams/${res.slug}`
            : `/dreams?q=${encodeURIComponent(res.query || info.emoji)}`;
          link.href = localePath(target, locale);
        })
        .catch(() => {});
    }

    // Rows below: the latest feed dreams that got this icon, deep-linked into the feed.
    const list = popupRef.current.getElement()?.querySelector<HTMLDivElement>("div[data-emoji-dreams]");
    if (list) {
      const locale = stripLocalePrefix(window.location.pathname).locale;
      const esc = (x: string) => x.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
      fetch(`/api/map/emoji-dreams?e=${encodeURIComponent(info.emoji)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((res: { dreams?: { id: string; snippet: string }[] } | null) => {
          const dreams = res?.dreams ?? [];
          if (!dreams.length) return;
          list.innerHTML = dreams
            .map(
              (d) => `
            <a href="${localePath(`/app/shared?dream=${encodeURIComponent(d.id)}`, locale)}"
               style="display:block; margin-top: 7px; padding-top: 7px; border-top: 1px solid rgba(0,0,0,.08); color: inherit; text-decoration: none; opacity: .85;">
              ${info.emoji} “${esc(d.snippet)}” →
            </a>`
            )
            .join("");
        })
        .catch(() => {});
    }
  }

  // Диффим маркеры вместо пересоздания: те, что уже на карте, только меняют
  // размер, новые добавляются, лишние удаляются. Пересоздание всех маркеров
  // на каждом zoomend и было причиной мелькания эмодзи с другой стороны Земли.
  function renderMarkers(map: mapboxgl.Map) {
    const z = map.getZoom();
    const maxRank = maxRankByZoom(z);
    const base = baseSizeByZoom(z);
    const activeFilter = filterRef.current;

    const existing = markersRef.current;
    const next = new Map<string, MarkerEntry>();

    // Kingdom buildings show on "All" and on "Kingdoms".
    if (activeFilter === "kingdoms" || activeFilter === "all") {
      const rows = kingdomsRef.current ?? [];
      // Zoomed out: only the biggest building of each city; zoomed in: every building.
      let shown = rows;
      if (z < 6) {
        const best = new Map<string, KingdomRow>();
        const rank = (r: KingdomRow) => BUILDINGS.findIndex((b) => b.id === r.buildingId);
        for (const r of rows) {
          const cur = best.get(r.cityId);
          if (!cur || rank(r) > rank(cur)) best.set(r.cityId, r);
        }
        shown = [...best.values()];
      }
      for (const r of shown) {
        const b = BUILDINGS.find((x) => x.id === r.buildingId);
        if (!b) continue;
        const lngLat: [number, number] = [r.lng, r.lat];
        const size = base * 1.5;
        const info = { emoji: b.emoji, count: 0, filter: "kingdoms" as MapFilter, place: r.place, lngLat, label: b.name };
        const key = `k|${r.id}`;
        const prev = existing.get(key);
        if (prev) {
          existing.delete(key);
          prev.el.style.fontSize = `${size}px`;
          prev.info = info;
          next.set(key, prev);
          continue;
        }
        const el = document.createElement("div");
        el.textContent = b.emoji;
        el.style.fontSize = `${size}px`;
        el.style.lineHeight = "1";
        el.style.userSelect = "none";
        el.style.cursor = "pointer";
        el.style.filter = "drop-shadow(0 0 6px rgba(245,158,11,.6))";
        if (isBehindGlobe(map, lngLat[0], lngLat[1])) {
          el.style.opacity = "0";
          el.style.pointerEvents = "none";
        }
        const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" }).setLngLat(lngLat).addTo(map);
        const entry: MarkerEntry = { marker, el, info };
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          openPopup(map, entry.info);
        });
        next.set(key, entry);
      }
    }

    for (const city of dataRef.current) {
      const items = itemsForFilter(city, activeFilter);
      const visible = items.filter((it) => it.rank <= maxRank);
      if (visible.length === 0) continue;

      const n = visible.length;
      const place = [city.city, city.admin1, city.country].filter(Boolean).join(", ");

      visible.forEach((it, idx) => {
        const { ox, oy } = offsetForIndex(idx, n);
        const rMeters = it.rank === 0 ? 0 : 1200 + it.rank * 260;
        const { dLat, dLng } = metersToLngLatOffset(rMeters, city.lat, ox, oy);
        const lngLat: [number, number] = [city.lng + dLng, city.lat + dLat];

        const size = base * weightByCount(it.count);
        const info = { emoji: it.emoji, count: it.count, filter: activeFilter, place, lngLat };
        const key = `${city.cityId}|${it.emoji}`;

        const prev = existing.get(key);
        if (prev) {
          existing.delete(key);
          prev.el.style.fontSize = `${size}px`;
          prev.info = info;
          const cur = prev.marker.getLngLat();
          if (cur.lng !== lngLat[0] || cur.lat !== lngLat[1]) prev.marker.setLngLat(lngLat);
          next.set(key, prev);
          return;
        }

        const el = document.createElement("div");
        el.textContent = it.emoji;
        el.style.fontSize = `${size}px`;
        el.style.lineHeight = "1";
        el.style.userSelect = "none";
        el.style.cursor = "pointer";
        // Стартовая прозрачность выставляется до addTo — без этого маркер
        // за глобусом виден, пока Mapbox не проверит окклюзию.
        if (isBehindGlobe(map, lngLat[0], lngLat[1])) {
          el.style.opacity = "0";
          el.style.pointerEvents = "none";
        }

        const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
          .setLngLat(lngLat)
          .addTo(map);

        const entry: MarkerEntry = { marker, el, info };
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          openPopup(map, entry.info);
        });

        next.set(key, entry);
      });
    }

    existing.forEach((m) => m.marker.remove());
    markersRef.current = next;
  }

  useEffect(() => {
    filterRef.current = filter;
    const map = mapRef.current;
    if (map) renderMarkers(map);
    if ((filter === "kingdoms" || filter === "all") && kingdomsRef.current === null) {
      kingdomsRef.current = [];
      fetch("/api/game/kingdoms")
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((data: { items?: KingdomRow[] }) => {
          kingdomsRef.current = data.items ?? [];
          const m = mapRef.current;
          if (m && (filterRef.current === "kingdoms" || filterRef.current === "all")) renderMarkers(m);
        })
        .catch(() => {});
    }
  }, [filter]);

  // /app/map?layer=kingdoms (from the game) opens straight on the Kingdoms layer.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("layer") === "kingdoms") {
      const t = window.setTimeout(() => setFilter("kingdoms"), 0);
      return () => window.clearTimeout(t);
    }
  }, []);

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

    map.addControl(
      new mapboxgl.NavigationControl({
        showCompass: false,
        visualizePitch: false,
      }),
      "top-right"
    );

    mapRef.current = map;

    map.on("style.load", () => {
      applyFog(map, getAppTheme());
    });

    map.on("load", async () => {
      await loadData();
      renderMarkers(map);
      map.on("zoomend", () => renderMarkers(map));
    });

    const root = document.documentElement;
    let lastTheme: ThemeMode = initialTheme;

    const obs = new MutationObserver(() => {
      const nextTheme = getAppTheme();
      if (nextTheme === lastTheme) return;
      lastTheme = nextTheme;

      map.setStyle(styleUrlForTheme(nextTheme));
    });

    obs.observe(root, { attributes: true, attributeFilter: ["class"] });

    const systemTheme = window.matchMedia("(prefers-color-scheme: light)");
    const onSystemThemeChange = () => {
      if (root.classList.contains("light") || root.classList.contains("dark")) return;

      const nextTheme = getAppTheme();
      if (nextTheme === lastTheme) return;
      lastTheme = nextTheme;
      map.setStyle(styleUrlForTheme(nextTheme));
    };

    systemTheme.addEventListener("change", onSystemThemeChange);

    return () => {
      obs.disconnect();
      systemTheme.removeEventListener("change", onSystemThemeChange);
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
    <div style={{ height: "calc(100dvh - var(--app-nav-height, 4rem))", width: "100%", position: "relative" }}>
      <div
        ref={mapElRef}
        style={{ height: "100%", width: "100%", borderRadius: 16, overflow: "hidden" }}
      />

      <div
        className="absolute top-3 left-3 z-10 inline-flex rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_88%,transparent)] p-1 gap-1 backdrop-blur-sm shadow-sm"
      >
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={[
              "px-3 py-1.5 rounded-full text-xs font-semibold transition",
              filter === f.key
                ? "bg-[var(--text)] text-[var(--bg)]"
                : "text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--text)_10%,transparent)]",
            ].join(" ")}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}
