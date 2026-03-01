"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

type Status = "idle" | "waiting_auth" | "verifying" | "ok" | "need_login" | "error";

const LS_KEY = "dreamly_pending_paypal_tx";

export default function PaymentSuccessPage() {
  const router = useRouter();

  const [status, setStatus] = useState<Status>("idle");
  const [msg, setMsg] = useState("Проверяем платёж…");
  const [tx, setTx] = useState<string | null>(null);

  const ranRef = useRef(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const txFromUrl = url.searchParams.get("tx");
    const txFromLs = localStorage.getItem(LS_KEY);

    const realTx = txFromUrl || txFromLs;

    if (!realTx) {
      setStatus("error");
      setMsg("Не найден параметр tx в URL. PayPal не передал идентификатор транзакции.");
      return;
    }

    // если пришёл свежий tx — сохраним, чтобы не потерять при логине
    if (txFromUrl) localStorage.setItem(LS_KEY, txFromUrl);

    setTx(realTx);
    setStatus("waiting_auth");
    setMsg("Готово. Ждём вход в аккаунт…");

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!realTx) return;

      // если уже пытались верифицировать в этом заходе — не дублим
      if (ranRef.current) return;

      if (!user) {
        setStatus("need_login");
        setMsg("Войди в аккаунт в Dreamly, чтобы начислить кредиты (платёж уже в PayPal).");
        return;
      }

      ranRef.current = true;

      try {
        setStatus("verifying");
        setMsg("Начисляем кредиты…");

        const idToken = await user.getIdToken(true);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const r = await fetch("/api/paypal/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tx: realTx, idToken }),
          signal: controller.signal,
        }).finally(() => clearTimeout(timeout));

        const j = await r.json().catch(() => ({}));

        if (!r.ok) {
          setStatus("error");
          setMsg(`Ошибка начисления: ${j?.error ?? "verify failed"}`);
          ranRef.current = false; // дадим повторить
          return;
        }

        // успех: tx больше не нужен
        localStorage.removeItem(LS_KEY);

        setStatus("ok");
        setMsg(`✅ Готово! Начислено: ${j.creditsAdded} кредитов.`);

        // небольшая пауза и уводим в профиль (там onSnapshot обновит credits)
        setTimeout(() => router.replace("/app/profile"), 900);
      } catch (e: any) {
        setStatus("error");
        setMsg(`Ошибка сети/таймаут: ${e?.message ?? "unknown error"}`);
        ranRef.current = false;
      }
    });

    return () => unsub();
  }, [router]);

  function retry() {
    if (!tx) return;
    ranRef.current = false;
    // просто “перезапустим” логику через reload
    window.location.reload();
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Оплата</h1>
      <p>{msg}</p>

      {status === "need_login" ? (
        <p style={{ opacity: 0.8, marginTop: 12 }}>
          Открой Dreamly, залогинься, и вернись на эту вкладку — начисление продолжится автоматически.
        </p>
      ) : null}

      {status === "error" ? (
        <button
          onClick={retry}
          style={{
            marginTop: 16,
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.15)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            cursor: "pointer",
          }}
        >
          Повторить
        </button>
      ) : null}
    </main>
  );
}