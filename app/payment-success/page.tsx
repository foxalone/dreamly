// app/payment-success/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { auth } from "@/lib/firebase";

type Status = "idle" | "need_login" | "verifying" | "success" | "error";

function getOrderIdFromUrl(url: URL) {
  // PayPal Orders return обычно даёт token=<ORDER_ID>
  // Иногда могут прокинуть orderId / token / PayerID — берём самое вероятное.
  return (
    url.searchParams.get("token") ||
    url.searchParams.get("orderId") ||
    url.searchParams.get("order_id") ||
    ""
  ).trim();
}

export default function PaymentSuccessPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [msg, setMsg] = useState("Проверяем платёж…");
  const [details, setDetails] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string>("");

  const canRetry = useMemo(() => status === "error", [status]);

  async function runCapture(oid: string) {
    setStatus("verifying");
    setMsg("Начисляем кредиты…");
    setDetails(null);

    const user = auth.currentUser;
    if (!user) {
      setStatus("need_login");
      setMsg("Войди в аккаунт в Dreamly, чтобы начислить кредиты.");
      return;
    }

    const idToken = await user.getIdToken();

    const r = await fetch("/api/paypal/capture-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: oid, idToken }),
    });

    const j = await r.json().catch(() => ({}));

    if (!r.ok) {
      setStatus("error");
      setMsg(`Ошибка начисления: ${j?.error ?? "capture failed"}`);
      // полезно видеть что пришло
      if (j) setDetails(JSON.stringify(j, null, 2));
      return;
    }

    setStatus("success");
    setMsg(`✅ Готово! Начислено: ${j.creditsAdded ?? "?"} кредитов.`);
    setDetails(
      JSON.stringify(
        {
          packId: j.packId,
          creditsAdded: j.creditsAdded,
          captureId: j.captureId,
          orderId: j.orderId,
        },
        null,
        2
      )
    );

    // Авто-редирект на профиль через 1.2с
    setTimeout(() => {
      window.location.href = "/app/profile";
    }, 1200);
  }

  useEffect(() => {
    const url = new URL(window.location.href);
    const oid = getOrderIdFromUrl(url);

    setOrderId(oid);

    if (!oid) {
      setStatus("error");
      setMsg("Не найден token/orderId в URL (PayPal не передал идентификатор заказа).");
      return;
    }

    runCapture(oid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)] px-6 py-10">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold">Оплата</h1>
        <p className="mt-3 text-[var(--muted)]">{msg}</p>

        {status === "need_login" ? (
          <div className="mt-6 rounded-2xl bg-[var(--card)] border border-[var(--border)] p-5">
            <div className="text-sm text-[var(--muted)]">
              После входа обнови эту страницу — мы повторим начисление по orderId.
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/signin?next=/payment-success"
                className="h-11 px-5 rounded-full font-semibold border border-[var(--border)] bg-[var(--card)] hover:opacity-90 transition no-underline inline-flex items-center"
              >
                Войти
              </Link>

              {orderId ? (
                <button
                  onClick={() => runCapture(orderId)}
                  className="h-11 px-5 rounded-full font-semibold border border-[var(--border)] bg-[var(--card)] hover:opacity-90 transition"
                >
                  Повторить
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {canRetry && orderId ? (
          <div className="mt-6">
            <button
              onClick={() => runCapture(orderId)}
              className="h-11 px-5 rounded-full font-semibold border border-[var(--border)] bg-[var(--card)] hover:opacity-90 transition"
            >
              Повторить
            </button>
          </div>
        ) : null}

        {details ? (
          <pre className="mt-6 text-xs overflow-auto rounded-2xl bg-[var(--card)] border border-[var(--border)] p-4 whitespace-pre-wrap">
            {details}
          </pre>
        ) : null}

        {status === "success" ? (
          <div className="mt-6 text-sm text-[var(--muted)]">
            Перенаправляем в профиль…
          </div>
        ) : null}
      </div>
    </main>
  );
}