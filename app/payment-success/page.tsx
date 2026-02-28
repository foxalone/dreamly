"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";

export default function PaymentSuccessPage() {
  const [msg, setMsg] = useState("Проверяем оплату…");

  useEffect(() => {
    (async () => {
      const url = new URL(window.location.href);
      const token = url.searchParams.get("token"); // PayPal обычно так
      const packId = url.searchParams.get("pack") ?? "pack_20"; // ты добавишь pack в ссылку
      const orderId = token; // в payment links часто token = orderId

      if (!orderId) {
        setMsg("Не найден orderId/token в URL.");
        return;
      }

      const user = auth.currentUser;
      if (!user) {
        setMsg("Нужно войти в аккаунт, чтобы начислить кредиты.");
        return;
      }

      const idToken = await user.getIdToken();

      const r = await fetch("/api/paypal/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, packId, idToken }),
      });

      const j = await r.json();
      if (!r.ok) {
        setMsg(`Ошибка: ${j?.error ?? "verify failed"}`);
        return;
      }

      setMsg(`Готово! Начислено кредитов: ${j.creditsAdded}`);
    })();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>Оплата</h1>
      <p>{msg}</p>
    </div>
  );
}