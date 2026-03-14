"use client";

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
    return getChatInviteUrl(window.location.origin, user.uid);
  }, [user?.uid]);

  const inviteMessage = useMemo(() => getInviteMessage(), []);

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

  const subject = encodeURIComponent("Join me on Dreamly Chat");
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
        title: "Dreamly Chat",
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
    <main className="mx-auto min-h-[calc(100dvh-92px)] w-full max-w-3xl px-4 py-4 sm:px-6 sm:py-6">
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
            onClick={() => router.push("/app/chat")}
            className="rounded-full border px-3 py-1.5 text-xs font-medium transition"
            style={{
              borderColor: "var(--border)",
              background: "color-mix(in srgb, var(--text) 4%, transparent)",
              color: "var(--text)",
            }}
          >
            ← Back
          </button>

          <h1
            className="text-xl font-semibold sm:text-2xl"
            style={{ color: "var(--text)" }}
          >
            Add friend
          </h1>
        </header>

        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Invite a friend to chat about dreams and stories.
        </p>

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
            Invite link
          </label>

          <div className="flex gap-2">
            <input
              readOnly
              value={
                inviteUrl ||
                (authReady ? "Sign in required to create invite link" : "Loading...")
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
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <InviteActionButton
            title="Share via WhatsApp"
            subtitle="Open WhatsApp with your invite prefilled"
            onClick={onWhatsApp}
            icon={<span className="text-lg leading-none">🟢</span>}
            disabled={actionsDisabled}
          />

          <InviteActionButton
            title="Share via Telegram"
            subtitle="Open Telegram share composer"
            onClick={onTelegram}
            icon={<span className="text-lg leading-none">✈️</span>}
            disabled={actionsDisabled}
          />

<InviteActionButton
  title="Share via Gmail"
  subtitle="Send invite via email"
  onClick={onGmail}
  icon={<span className="text-lg leading-none">📧</span>}
  disabled={actionsDisabled}
/>

          <InviteActionButton
            title="Share via SMS"
            subtitle="Send invite message with your default SMS app"
            onClick={onSms}
            icon={<span className="text-lg leading-none">💬</span>}
            disabled={actionsDisabled}
          />

          <InviteActionButton
            title={copied ? "Copied" : "Copy link"}
            subtitle="Copy invite URL to clipboard"
            onClick={() => void onCopy()}
            icon={<span className="text-lg leading-none">📋</span>}
            disabled={actionsDisabled}
          />

          {canNativeShare ? (
            <InviteActionButton
              title={sharing ? "Sharing..." : "Native Share"}
              subtitle="Use your device share sheet"
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