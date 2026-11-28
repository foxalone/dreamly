"use client";

import { useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { ANALYSIS_PROMO_VIDEO } from "@/lib/analysisPromo";

type Phase = "ready" | "loading" | "playing" | "complete" | "confirming";

export default function AnalysisPromoVideo({
  user, sessionId, attemptId, title, watch, proceed, cancel, error, waiting, onPlay, onEarned, onCancel,
}: {
  user: User | null; sessionId: string; attemptId?: string;
  title: string; watch: string; proceed: string; cancel: string; error: string; waiting: string;
  onPlay: () => void; onEarned: () => void; onCancel: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const started = useRef(false);
  const pending = useRef(false);
  const [phase, setPhase] = useState<Phase>("ready");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) video.current?.pause();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  async function requestReward(action: "start" | "complete") {
    const idToken = await user?.getIdToken();
    return fetch("/api/dreams/analysis-promo", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: "web", sessionId, action, idToken, attemptId }),
      signal: AbortSignal.timeout(15_000),
    });
  }

  async function play() {
    const element = video.current;
    if (!element || pending.current) return;
    pending.current = true;
    setPhase("loading");
    setFailed(false);
    try {
      if (!started.current) {
        const response = await requestReward("start");
        if (!response.ok) throw new Error("PROMO_UNAVAILABLE");
        started.current = true;
      }
      if (document.hidden || video.current !== element) { setPhase("ready"); return; }
      await element.play();
    } catch {
      setFailed(true);
      setPhase("ready");
    } finally {
      pending.current = false;
    }
  }

  async function confirm() {
    if (!video.current?.ended || pending.current) return;
    pending.current = true;
    setPhase("confirming");
    setFailed(false);
    try {
      const response = await requestReward("complete");
      if (!response.ok) throw new Error("PROMO_REWARD_FAILED");
      onEarned();
    } catch {
      setFailed(true);
      setPhase("complete");
    } finally {
      pending.current = false;
    }
  }

  return <main className="flex min-h-screen items-center justify-center px-6">
    <section className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-center">
      <h1 className="text-lg font-semibold">{title}</h1>
      <video ref={video} src={ANALYSIS_PROMO_VIDEO} aria-label={title} muted playsInline
        disablePictureInPicture disableRemotePlayback preload="metadata"
        className="mx-auto mt-3 max-h-[60dvh] w-full rounded-xl bg-black object-contain"
        onPlaying={() => { setPhase("playing"); onPlay(); }}
        onPause={() => setPhase((before) => before === "playing" ? "ready" : before)}
        onEnded={() => { void confirm(); }}
        onError={() => { setFailed(true); setPhase("ready"); }}
      />
      {failed ? <p role="alert" className="mt-3 text-sm text-red-500">{error}</p> : null}
      {phase === "loading" || phase === "confirming" ? <p role="status" className="mt-3 text-sm">{waiting}</p> : null}
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {phase === "ready" || phase === "complete" ? (
          <button type="button" className="dream-primary-btn px-4 py-2" onClick={() => { void (phase === "complete" ? confirm() : play()); }}>
            {phase === "complete" ? proceed : watch}
          </button>
        ) : null}
        <button type="button" className="dream-btn dream-btn--neutral px-4 py-2" onClick={onCancel}>{cancel}</button>
      </div>
    </section>
  </main>;
}
