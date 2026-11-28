"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { adUnlockUrl, navigateToAd, peekAdUnlockPending, setAdUnlockPending, takeAdUnlockPending } from "@/lib/adUnlock";
import { trackEvent } from "@/lib/analytics";
import { DREAM_MAX_CHARS, isDreamTooLong } from "@/lib/dreamLength";
import { auth } from "@/lib/firebase";
import type { JaWebDreamSlug } from "@/lib/jaPilotPaths";
import styles from "../pilot.module.css";

type Feedback = { text: string; offerAd?: boolean };
type Reading = { text: string; lang?: string };
type AnalysisResponse = {
  analysis?: string;
  analysisLang?: string;
  code?: string;
  guest?: boolean;
};

const requestFailed = "夢を読み解けませんでした。時間をおいて、もう一度お試しください。";

export default function JapaneseDreamForm({ returnTo, symbol }: { returnTo: string; symbol?: JaWebDreamSlug }) {
  const [text, setText] = useState("");
  const [reading, setReading] = useState<Reading | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const active = useRef<AbortController | null>(null);
  const attempt = useRef<{ text: string; id?: string } | null>(null);
  const storageKey = `dreamly.jaDraft:${returnTo}`;
  const source = symbol ? "symbol_inline" : "home_ask";

  const analyze = useCallback(async (dream: string, attemptId?: string) => {
    if (active.current) return;
    if (!dream) {
      setFeedback({ text: "覚えている夢の内容を入力してください。" });
      return;
    }
    if (isDreamTooLong(dream)) {
      setFeedback({ text: "夢の内容を短くしてから、もう一度お試しください。" });
      return;
    }

    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setFeedback(null);
    setReading(null);
    try {
      await auth.authStateReady();
      const idToken = await auth.currentUser?.getIdToken();
      if (controller.signal.aborted) return;
      const response = await fetch("/api/dreams/analyze", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ text: dream, lang: "ja", lens: "psychological", source, attemptId, idToken }),
      });
      const data: AnalysisResponse = await response.json();
      if (controller.signal.aborted) return;
      attempt.current = { text: dream, id: response.headers.get("X-Dreamly-Attempt") ?? attemptId };

      if (response.ok && typeof data.analysis === "string" && data.analysis.trim()) {
        setReading({ text: data.analysis, lang: data.analysisLang });
        try { sessionStorage.removeItem(storageKey); } catch { /* Storage can be disabled. */ }
        trackEvent(symbol ? "symbol_dream_interpreted" : "home_dream_interpreted", {
          locale: "ja", source, guest: data.guest === true, ...(symbol ? { symbol } : {}),
        });
        return;
      }

      if (data.code === "GUEST_LIMIT_REACHED" || data.code === "SUBSCRIPTION_REQUIRED") {
        setFeedback({ text: "短い広告を最後まで見ると、夢を読み解けます。", offerAd: true });
        trackEvent(data.code === "GUEST_LIMIT_REACHED" ? "guest_limit_reached" : "upgrade_prompt", { locale: "ja", source });
      } else {
        setFeedback({ text: requestFailed });
      }
    } catch {
      if (!controller.signal.aborted) setFeedback({ text: requestFailed });
    } finally {
      if (active.current === controller) {
        active.current = null;
        setBusy(false);
      }
    }
  }, [source, storageKey, symbol]);

  useEffect(() => {
    if (reading) resultRef.current?.scrollIntoView({ block: "nearest" });
  }, [reading]);

  useEffect(() => {
    function restore() {
      if (active.current) return;
      const pending = peekAdUnlockPending("analysis");
      if (pending?.returnTo === returnTo && pending.dreamText &&
        takeAdUnlockPending("analysis", pending.dreamText, returnTo)) {
        setText(pending.dreamText);
        void analyze(pending.dreamText, pending.attemptId);
      } else {
        try {
          const draft = sessionStorage.getItem(storageKey);
          if (draft) setText((current) => current || draft);
        } catch { /* Storage can be disabled. */ }
      }
    }
    // Defer the initial check so a Strict Mode remount cannot consume and abort the same retry.
    const timer = window.setTimeout(restore, 0);
    window.addEventListener("pageshow", restore);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pageshow", restore);
      active.current?.abort();
      active.current = null;
    };
  }, [analyze, returnTo, storageKey]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const dream = text.trim();
    trackEvent("ja_dream_analysis_started", { locale: "ja", source, ...(symbol ? { symbol } : {}) });
    void analyze(dream, attempt.current?.text === dream ? attempt.current.id : undefined);
  }

  function openAd() {
    const dream = text.trim();
    try {
      sessionStorage.setItem(storageKey, dream);
      setAdUnlockPending({ kind: "analysis", dreamText: dream, returnTo, attemptId: attempt.current?.id });
    } catch {
      setFeedback({ text: "広告のあとに夢の内容を復元できません。ブラウザの設定をご確認ください。" });
      return;
    }
    if (peekAdUnlockPending("analysis")?.returnTo !== returnTo) {
      setFeedback({ text: "広告を開けませんでした。もう一度お試しください。" });
      return;
    }
    navigateToAd(adUnlockUrl("analysis", returnTo));
  }

  return (
    <section id="dream-form" className={styles.formCard} aria-labelledby="japanese-dream-form-title">
      <h2 id="japanese-dream-form-title">AIで夢を読み解く</h2>
      <form onSubmit={submit} aria-busy={busy}>
        <label htmlFor="japanese-dream-text">どんな夢を見ましたか？</label>
        <textarea
          id="japanese-dream-text"
          placeholder="例：夜の駅で電車を待っていたら、白い蛇が足元を通り過ぎた。不思議と怖くなかった。"
          required
          maxLength={DREAM_MAX_CHARS}
          readOnly={busy}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setFeedback(null);
            setReading(null);
          }}
          aria-describedby="japanese-dream-hint"
        />
        <div className={styles.formActions}>
          <button type="submit" disabled={busy}>
            {busy ? "夢を読み解いています…" : "夢を読み解く"} <ArrowRight size={17} aria-hidden="true" />
          </button>
          <p id="japanese-dream-hint" className={styles.hint}>登録不要。短い広告が表示される場合があります。</p>
        </div>
      </form>
      <div aria-live="polite" aria-atomic="true">
        {busy ? <p className="sr-only">夢を読み解いています。</p> : null}
        {feedback ? <p className={styles.feedback}>{feedback.text}</p> : null}
        {reading ? (
          <div ref={resultRef} className={styles.result}>
            <h3>あなたの夢の読み解き</h3>
            <p lang={reading.lang}>{reading.text}</p>
          </div>
        ) : null}
      </div>
      {feedback?.offerAd ? (
        <div className={styles.formActions}>
          <button type="button" onClick={openAd}>広告を見て続ける</button>
        </div>
      ) : null}
    </section>
  );
}
