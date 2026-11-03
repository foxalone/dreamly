"use client";

import { auth } from "@/lib/firebase";
import type { TranslationClickSource } from "@/lib/translationClicks";

export async function trackTranslationClick(source: TranslationClickSource) {
  try {
    await auth.authStateReady();
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : null;
    await fetch("/api/translation/click", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ source }),
      keepalive: true,
    });
  } catch {
    // A tracking failure must not block translation or be retried as a guest.
  }
}
