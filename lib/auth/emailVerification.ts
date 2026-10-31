import { sendEmailVerification, type User } from "firebase/auth";
import type { Locale } from "@/lib/i18n/config";

type PasswordIdentity = {
  emailVerified: boolean;
  providerData: ReadonlyArray<{ providerId: string }>;
};

let holds = 0;

/** Password accounts stay signed out until the inbox link is opened. Google already verifies its own email. */
export function passwordNeedsEmailVerification(user: PasswordIdentity | null): boolean {
  if (!user || user.emailVerified) return false;
  return user.providerData.some((entry) => entry.providerId === "password");
}

/** Keep the unverified session only while the confirmation email is being sent. */
export function holdUnverifiedSession(): () => void {
  holds += 1;
  return () => {
    holds = Math.max(0, holds - 1);
  };
}

export function unverifiedSessionHeld(): boolean {
  return holds > 0;
}

export async function sendAccountVerification(user: User, locale: Locale): Promise<void> {
  const origin = window.location.origin;
  const settings = {
    url: `${origin}/auth/action?verified=1&lang=${locale}`,
    handleCodeInApp: false,
  };
  try {
    await sendEmailVerification(user, settings);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "auth/unauthorized-continue-uri" || code === "auth/invalid-continue-uri") {
      await sendEmailVerification(user);
      return;
    }
    throw error;
  }
}
