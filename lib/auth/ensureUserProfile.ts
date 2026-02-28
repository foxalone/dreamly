import type { User } from "firebase/auth";

import { ensureUser } from "@/lib/auth/ensureUser";

export async function ensureUserProfileOnSignIn(user: User): Promise<void> {
  try {
    await ensureUser(user);
  } catch (e) {
    console.warn("ensureUserProfileOnSignIn failed:", e);
  }
}

