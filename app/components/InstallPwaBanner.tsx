"use client";

import React, { useEffect, useMemo, useState } from "react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isIOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua);
}

function isInStandaloneMode() {
  if (typeof window === "undefined") return false;

  // iOS Safari
  // @ts-ignore
  const iosStandalone = window.navigator?.standalone === true;

  // Android / Chrome
  const displayModeStandalone =
    window.matchMedia &&
    window.matchMedia("(display-mode: standalone)").matches;

  return iosStandalone || displayModeStandalone;
}

function isMobile() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 768px)").matches;
}

export default function InstallPwaBanner() {
  const [bip, setBip] = useState<BIPEvent | null>(null);
  const [open, setOpen] = useState(false);

  const ios = useMemo(() => isIOS(), []);
  const standalone = useMemo(() => isInStandaloneMode(), []);

  useEffect(() => {
    if (!isMobile()) return;
    if (standalone) return;

    const dismissedAt = Number(
      localStorage.getItem("pwa_install_dismissed_at") || "0"
    );

    const weekMs = 7 * 24 * 60 * 60 * 1000;

    if (dismissedAt && Date.now() - dismissedAt < weekMs) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setBip(e as BIPEvent);
      setOpen(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    const t = window.setTimeout(() => {
      if (!bip && ios) setOpen(true);
    }, 800);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.clearTimeout(t);
    };
  }, [ios, standalone, bip]);

  async function onInstall() {
    if (!bip) return;

    try {
      await bip.prompt();
      const choice = await bip.userChoice;

      if (choice.outcome === "accepted") {
        setOpen(false);
      } else {
        dismiss();
      }
    } catch {
      dismiss();
    }
  }

  function dismiss() {
    localStorage.setItem(
      "pwa_install_dismissed_at",
      String(Date.now())
    );
    setOpen(false);
  }

  if (!open) return null;
  if (standalone) return null;
  if (!isMobile()) return null;

  const title = "Install App";
  const subtitleAndroid =
    "Add to home screen for faster access and full app experience.";
  const subtitleIOS =
    "Tap Share → Add to Home Screen.";

  return (
    <div
      style={{
        position: "fixed",
        left: 12,
        right: 12,
        bottom: 84,
        zIndex: 50,
      }}
    >
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: 14,
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
          color: "var(--text)",
        }}
      >
        <div
          style={{
            fontWeight: 800,
            fontSize: 14,
            marginBottom: 6,
          }}
        >
          {title}
        </div>

        <div
          style={{
            fontSize: 13,
            opacity: 0.85,
            lineHeight: 1.4,
          }}
        >
          {bip ? subtitleAndroid : ios ? subtitleIOS : subtitleAndroid}
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 12,
          }}
        >
          {bip && (
            <button
              onClick={onInstall}
              style={{
                flex: 1,
                borderRadius: 12,
                padding: "10px 12px",
                fontWeight: 800,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text)",
                cursor: "pointer",
              }}
            >
              Install
            </button>
          )}

          <button
            onClick={dismiss}
            style={{
              flex: 1,
              borderRadius: 12,
              padding: "10px 12px",
              fontWeight: 700,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text)",
              cursor: "pointer",
              opacity: 0.7,
            }}
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}