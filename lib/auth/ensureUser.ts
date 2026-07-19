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

async function lookupCityByIp(): Promise<{
  cityId: string;
  city: string;
  country: string;
  admin1: string;
} | null> {
  const res = await fetch("/api/geo/ip-city", {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) return null;

  const cityId = String(data?.cityId ?? "").trim();
  const city = String(data?.city ?? "").trim();
  const country = String(data?.country ?? "").trim();
  const admin1 = String(data?.admin1 ?? "").trim();

  if (!cityId || !city || !country) return null;
  return { cityId, city, country, admin1 };
}

async function ensureUserCity(u: User) {
  const now = Date.now();
  if (now - lastCityUpsertAtRef < 15000) return;
  lastCityUpsertAtRef = now;

  try {
    const geo = await lookupCityByIp();
    if (!geo) return;

    const userRef = doc(firestore, "users", u.uid);
    await setDoc(
      userRef,
      {
        currentCityId: geo.cityId,
        currentCity: geo.city,
        currentCountry: geo.country,
        currentAdmin1: geo.admin1 || null,
        citySource: "ip",
        cityUpdatedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    await resolveCityCoordsIfNeeded(geo.cityId);
  } catch (e) {
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
