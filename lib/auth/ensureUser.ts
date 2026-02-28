import { auth, firestore } from "@/lib/firebase";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";

let lastUpsertAtRef = 0;
let lastCityUpsertAtRef = 0;

async function upsertUserProfile(u: User) {
  const ref = doc(firestore, "users", u.uid);
  const snap = await getDoc(ref);
  const exists = snap.exists();

  const base = {
    uid: u.uid,
    email: u.email ?? null,
    displayName: u.displayName ?? null,
    photoURL: u.photoURL ?? null,

    authCreationTime: u.metadata?.creationTime ?? null,
    authLastSignInTime: u.metadata?.lastSignInTime ?? null,

    lastLoginAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const first = exists
    ? {}
    : {
        firstLoginAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      };

  await setDoc(ref, { ...base, ...first }, { merge: true });
}

function getBrowserPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !navigator?.geolocation) {
      reject(new Error("Geolocation not available"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => reject(err),
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 5 * 60 * 1000,
      }
    );
  });
}

async function reverseCityFromCoords(lat: number, lon: number) {
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(String(lat))}` +
    `&lon=${encodeURIComponent(String(lon))}&zoom=10&addressdetails=1`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Reverse geocoding failed: ${res.status}`);

  const data = (await res.json()) as any;
  const addr = data?.address ?? {};

  const country = String(addr?.country_code ?? "").toUpperCase().trim();
  const admin1 = String(addr?.state ?? addr?.region ?? "").trim();
  const city = String(addr?.city ?? addr?.town ?? addr?.village ?? addr?.municipality ?? "").trim();

  if (!country || !admin1 || !city) return null;
  return { country, admin1, city, cityId: `${country}|${admin1}|${city}` };
}

async function resolveCityCoordsIfNeeded(cityId: string) {
  try {
    await fetch("/api/map/resolve-city", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cityId }),
    });
  } catch {
    // best-effort
  }
}

async function ensureUserCity(u: User) {
  const now = Date.now();
  if (now - lastCityUpsertAtRef < 15000) return;
  lastCityUpsertAtRef = now;

  try {
    const userRef = doc(firestore, "users", u.uid);
    const snap = await getDoc(userRef);
    const data = snap.exists() ? (snap.data() as any) : null;

    if (data?.currentCityId && data?.currentCity && data?.currentCountry && data?.currentAdmin1) {
      await resolveCityCoordsIfNeeded(String(data.currentCityId));
      return;
    }

    const pos = await getBrowserPosition();
    const geo = await reverseCityFromCoords(pos.lat, pos.lng);
    if (!geo) return;

    await setDoc(
      userRef,
      {
        currentCityId: geo.cityId,
        currentCity: geo.city,
        currentCountry: geo.country,
        currentAdmin1: geo.admin1,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    await resolveCityCoordsIfNeeded(geo.cityId);
  } catch (e: any) {
    if (e?.code === 1 || e?.name === "NotAllowedError" || e?.name === "PermissionDeniedError") {
      return;
    }
    console.warn("ensureUserCity failed:", e);
  }
}

export async function ensureUser(user?: User | null): Promise<User> {
  const u = user ?? auth.currentUser;
  if (!u) throw new Error("Not signed in");

  await u.reload().catch(() => {});

  const now = Date.now();
  if (now - lastUpsertAtRef > 5000) {
    lastUpsertAtRef = now;
    await upsertUserProfile(u);
  }

  await ensureUserCity(u);
  return u;
}
