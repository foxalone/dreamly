"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";

export default function PaymentSuccessPage() {
  const [msg, setMsg] = useState("Проверяем платёж…");

  useEffect(() => {
    (async () => {
      const url = new URL(window.location.href);
      const tx = url.searchParams.get("tx"); // PayPal PDT tx

      if (!tx) {
        setMsg("Не найден tx в URL (PayPal не передал идентификатор транзакции).");
        return;
      }

      const user = auth.currentUser;
      if (!user) {
        setMsg("Войди в аккаунт в Dreamly, чтобы начислить кредиты (платёж уже в PayPal).");
        return;
      }

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

      setMsg(`✅ Готово! Начислено: ${j.creditsAdded} кредитов (pack: ${j.packId}).`);
    })();
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1>Оплата</h1>
      <p>{msg}</p>
    </main>
  );
}