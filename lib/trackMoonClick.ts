"use client";

import { auth } from "@/lib/firebase";
import type { MoonClickSource } from "@/lib/moonClicks";

export async function trackMoonClick(source: MoonClickSource) {
  try {
    // Wait for persisted sign-in before deciding that a visitor is a guest.
    await auth.authStateReady();
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : null;
    await fetch("/api/moon/click", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ source }),
      keepalive: true,
    });
  } catch {
    // Tracking must not block opening the Moon. Never retry a token failure as a guest.
  }
}
