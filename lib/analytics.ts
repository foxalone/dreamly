"use client";

import type { Analytics } from "firebase/analytics";
import app from "@/lib/firebase";

type AnalyticsParams = Record<string, unknown>;

let analyticsPromise: Promise<Analytics | null> | null = null;

export function getClientAnalytics(): Promise<Analytics | null> {
  if (typeof window === "undefined" || !process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID) {
    return Promise.resolve(null);
  }

  if (!analyticsPromise) {
    analyticsPromise = import("firebase/analytics")
      .then(async ({ initializeAnalytics, isSupported }) => {
        if (!(await isSupported())) return null;
        return initializeAnalytics(app, {
          config: { send_page_view: false },
        });
      })
      .catch((error) => {
        console.warn("Firebase Analytics is unavailable:", error);
        return null;
      });
  }

  return analyticsPromise;
}

export function trackEvent(name: string, params?: AnalyticsParams) {
  void getClientAnalytics().then(async (analytics) => {
    if (!analytics) return;
    const { logEvent } = await import("firebase/analytics");
    logEvent(analytics, name, params as never);
  });
}

export function trackAuth(isNewUser: boolean) {
  trackEvent(isNewUser ? "sign_up" : "login", { method: "google" });
}

export function subscriptionItem(planId: string, price: string) {
  return {
    item_id: planId,
    item_name: planId === "yearly" ? "Dreamly Yearly" : "Dreamly Monthly",
    item_category: "subscription",
    price: Number(price),
    quantity: 1,
  };
}
