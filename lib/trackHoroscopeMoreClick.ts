"use client";

import { auth } from "@/lib/firebase";
import type { Sign } from "@/lib/horoscope/model";

export async function trackHoroscopeMoreClick(sign: Sign) {
  try {
    await auth.authStateReady();
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : null;
    await fetch("/api/horoscope/more-click", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ sign }),
      keepalive: true,
    });
  } catch {
    // A tracking failure must not block the access dialog or retry as a guest.
  }
}
