"use client";

import { localePath } from "@/lib/i18n/path";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";

import { auth } from "@/lib/firebase";
import { InviteActionButton } from "../components/InviteActionButton";
import {
  copyInviteLink,
  getChatInviteUrl,
  getInviteMessage,
  getSmsShareUrl,
  getTelegramShareUrl,
  getWhatsAppShareUrl,
} from "../lib/invite";

export default function AddFriendPage() {
  const locale = useLocale();
  const japanese = locale === "ja";
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    setCanNativeShare(
      typeof navigator !== "undefined" &&
        typeof navigator.share === "function"
    );
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(timer);
  }, [copied]);

  const inviteUrl = useMemo(() => {
    if (typeof window === "undefined" || !user?.uid) return "";
    const link = new URL(getChatInviteUrl(window.location.origin, user.uid));
    link.pathname = localePath(link.pathname, locale);
    return link.toString();
  }, [locale, user?.uid]);

  const inviteMessage = useMemo(() => japanese ? "Dreamlyで、見た夢や日々の出来事について話しませんか？" : getInviteMessage(), [japanese]);

  const actionsDisabled = !authReady || !user?.uid || !inviteUrl;

  const onCopy = async () => {
    if (actionsDisabled) return;
    const ok = await copyInviteLink(inviteUrl);
    if (ok) setCopied(true);
  };

  const onWhatsApp = () => {
    if (actionsDisabled) return;
    window.open(
      getWhatsAppShareUrl(inviteUrl, inviteMessage),
      "_blank",
      "noopener,noreferrer"
    );
  };

  const onTelegram = () => {
    if (actionsDisabled) return;
    window.open(
      getTelegramShareUrl(inviteUrl, inviteMessage),
      "_blank",
      "noopener,noreferrer"
    );
  };

  const onGmail = () => {
  if (actionsDisabled) return;

  const subject = encodeURIComponent((japanese ? "Dreamlyチャットへの招待" : "Join me on Dreamly Chat"));
  const body = encodeURIComponent(`${inviteMessage}\n\n${inviteUrl}`);

  window.location.href = `mailto:?subject=${subject}&body=${body}`;
};

  const onSms = () => {
    if (actionsDisabled) return;
    window.location.href = getSmsShareUrl(inviteUrl, inviteMessage);
  };

  const onNativeShare = async () => {
    if (!canNativeShare || sharing || actionsDisabled) return;

    setSharing(true);
    try {
      await navigator.share({
        title: (japanese ? "Dreamlyチャット" : "Dreamly Chat"),
        text: inviteMessage,
        url: inviteUrl,
      });
    } catch {
      // silent fail
    } finally {
      setSharing(false);
    }
  };

  return (
    <main className="mx-auto min-h-[calc(100dvh-var(--app-nav-height,4rem))] w-full max-w-3xl px-4 py-4 sm:px-6 sm:py-6">
      <section
        className="mx-auto flex w-full flex-col gap-4 rounded-3xl border p-4 sm:gap-5 sm:p-5"
        style={{
          borderColor: "var(--border)",
          background: "color-mix(in srgb, var(--card) 94%, transparent)",
        }}
      >
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(localePath("/app/chat", locale))}
            className="rounded-full border px-3 py-1.5 text-xs font-medium transition"
            style={{
              borderColor: "var(--border)",
              background: "color-mix(in srgb, var(--text) 4%, transparent)",
              color: "var(--text)",
            }}
          >
            {(japanese ? "← 戻る" : "← Back")}</button>

          <h1
            className="text-xl font-semibold sm:text-2xl"
            style={{ color: "var(--text)" }}
          >
            {(japanese ? "友だちを招待" : "Add friend")}</h1>
        </header>

        <p className="text-sm" style={{ color: "var(--muted)" }}>
          {(japanese ? "友だちを招待して、見た夢や日々の出来事について話しましょう。" : "Invite a friend to chat about dreams and stories.")}</p>

        <div
          className="rounded-2xl border p-3 sm:p-4"
          style={{
            borderColor: "var(--border)",
            background: "color-mix(in srgb, var(--text) 4%, var(--card))",
          }}
        >
          <label
            className="mb-2 block text-xs font-medium"
            style={{ color: "var(--muted)" }}
          >
            {(japanese ? "招待リンク" : "Invite link")}</label>

          <div className="flex gap-2">
            <input
              readOnly
              value={
                inviteUrl ||
                (authReady ? (japanese ? "招待リンクを作成するにはログインが必要です" : "Sign in required to create invite link") : (japanese ? "読み込んでいます…" : "Loading..."))
              }
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
              style={{
                borderColor: "var(--border)",
                background: "color-mix(in srgb, var(--bg) 82%, var(--card))",
                color: inviteUrl ? "var(--text)" : "var(--muted)",
              }}
            />

            <button
              type="button"
              onClick={() => void onCopy()}
              disabled={actionsDisabled}
              className="rounded-xl border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                borderColor: "color-mix(in srgb, #22d3ee 40%, var(--border))",
                background: "color-mix(in srgb, #22d3ee 12%, var(--card))",
                color: "color-mix(in srgb, #22d3ee 78%, var(--text))",
              }}
            >
              {copied ? (japanese ? "コピーしました" : "Copied") : "Copy"}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <InviteActionButton
            title={(japanese ? "WhatsAppで共有" : "Share via WhatsApp")}
            subtitle={(japanese ? "招待文を入力した状態でWhatsAppを開きます" : "Open WhatsApp with your invite prefilled")}
            onClick={onWhatsApp}
            icon={<span className="text-lg leading-none">🟢</span>}
            disabled={actionsDisabled}
          />

          <InviteActionButton
            title={(japanese ? "Telegramで共有" : "Share via Telegram")}
            subtitle={(japanese ? "Telegramの共有画面を開きます" : "Open Telegram share composer")}
            onClick={onTelegram}
            icon={<span className="text-lg leading-none">✈️</span>}
            disabled={actionsDisabled}
          />

<InviteActionButton
  title={(japanese ? "メールで共有" : "Share via Gmail")}
  subtitle={(japanese ? "メールで招待を送ります" : "Send invite via email")}
  onClick={onGmail}
  icon={<span className="text-lg leading-none">📧</span>}
  disabled={actionsDisabled}
/>

          <InviteActionButton
            title={(japanese ? "SMSで共有" : "Share via SMS")}
            subtitle={(japanese ? "既定のSMSアプリで招待を送ります" : "Send invite message with your default SMS app")}
            onClick={onSms}
            icon={<span className="text-lg leading-none">💬</span>}
            disabled={actionsDisabled}
          />

          <InviteActionButton
            title={copied ? (japanese ? "コピーしました" : "Copied") : (japanese ? "リンクをコピー" : "Copy link")}
            subtitle={(japanese ? "招待リンクをクリップボードにコピーします" : "Copy invite URL to clipboard")}
            onClick={() => void onCopy()}
            icon={<span className="text-lg leading-none">📋</span>}
            disabled={actionsDisabled}
          />

          {canNativeShare ? (
            <InviteActionButton
              title={sharing ? (japanese ? "共有しています…" : "Sharing...") : (japanese ? "共有メニューを開く" : "Native Share")}
              subtitle={(japanese ? "端末の共有メニューを使います" : "Use your device share sheet")}
              onClick={() => void onNativeShare()}
              icon={<span className="text-lg leading-none">📤</span>}
              disabled={actionsDisabled || sharing}
            />
          ) : null}
        </div>
      </section>
    </main>
  );
}