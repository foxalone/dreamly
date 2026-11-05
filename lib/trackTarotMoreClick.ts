"use client";

import { auth } from "@/lib/firebase";
import type { MajorArcanaId } from "@/lib/tarot/deck";

export async function trackTarotMoreClick(day: string, cardId: MajorArcanaId) {
  try {
    await auth.authStateReady();
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : null;
    await fetch("/api/tarot/more-click", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      credentials: "same-origin",
      body: JSON.stringify({ day, cardId }),
      keepalive: true,
    });
  } catch {
    // Tracking must never delay the reading or turn an admin click into a guest click.
  }
}
