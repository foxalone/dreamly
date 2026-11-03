import type { User } from "firebase/auth";

import { ensureUser } from "@/lib/auth/ensureUser";

const pendingReactionClaims = new Map<string, Promise<void>>();

function claimGuestReactionsOnSignIn(user: User): Promise<void> {
  const pending = pendingReactionClaims.get(user.uid);
  if (pending) return pending;
  const claim = (async () => {
    const idToken = await user.getIdToken();
    const response = await fetch("/api/dreams/claim-guest-reactions", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    if (!response.ok) throw new Error("Could not claim guest reactions.");
  })().finally(() => pendingReactionClaims.delete(user.uid));
  pendingReactionClaims.set(user.uid, claim);
  return claim;
}

export async function ensureUserProfileOnSignIn(user: User): Promise<void> {
  await Promise.all([
    ensureUser(user).catch((error) => console.warn("ensureUserProfileOnSignIn failed:", error)),
    claimGuestReactionsOnSignIn(user).catch((error) => console.warn("claimGuestReactionsOnSignIn failed:", error)),
  ]);
}

