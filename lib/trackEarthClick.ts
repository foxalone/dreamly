"use client";

import { auth } from "@/lib/firebase";
import type { EarthClickSource } from "@/lib/earthClicks";

export async function trackEarthClick(source: EarthClickSource) {
  try {
    await auth.authStateReady();
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : null;
    await fetch("/api/earth/click", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ source }),
      keepalive: true,
    });
  } catch {
    // Tracking must not block opening the map.
  }
}
