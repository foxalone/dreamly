"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function PaymentSuccessPage() {
  const [msg, setMsg] = useState("Проверяем платёж…");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const txFromUrl = url.searchParams.get("tx");

    // если PayPal передал tx — сохраняем его
    if (txFromUrl) {
      localStorage.setItem("pending_tx", txFromUrl);
    }

    const unsub = onAuthStateChanged(auth, async (user) => {
      const tx = localStorage.getItem("pending_tx");

      if (!tx) {
        setMsg("Транзакция не найдена.");
        return;
      }

      if (!user) {
        setMsg(
          "Платёж получен ✅\n\nВойди в аккаунт Dreamly, чтобы начислить кредиты."
        );
        return;
      }

      if (processing) return;

      try {
        setProcessing(true);
        setMsg("Начисляем кредиты…");

        const idToken = await user.getIdToken();

        const r = await fetch("/api/paypal/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tx, idToken }),
        });

        const j = await r.json();

        if (!r.ok) {
          setMsg(`Ошибка начисления: ${j?.error ?? "verify failed"}`);
          return;
        }

        localStorage.removeItem("pending_tx");

        setMsg(
          `✅ Готово! Начислено ${j.creditsAdded} кредитов.\n\nТеперь можешь вернуться в профиль.`
        );
      } catch (e: any) {
        setMsg(`Ошибка: ${e?.message ?? "unknown error"}`);
      } finally {
        setProcessing(false);
      }
    });

    return () => unsub();
  }, [processing]);

  return (
    <main style={{ padding: 24 }}>
      <h1>Оплата</h1>
      <p style={{ whiteSpace: "pre-line" }}>{msg}</p>
    </main>
  );
}