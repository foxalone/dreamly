"use client";

import { useEffect } from "react";
import { getAdditionalUserInfo, getRedirectResult } from "firebase/auth";
import { ensureUserProfileOnSignIn } from "@/lib/auth/ensureUserProfile";
import { isDreamlyAndroidApp } from "@/lib/auth/isDreamlyAndroidApp";
import { auth } from "@/lib/firebase";
import { trackAuth } from "@/lib/analytics";

export default function GoogleRedirectHandler() {
  useEffect(() => {
    if (!isDreamlyAndroidApp()) return;

    getRedirectResult(auth)
      .then(async (cred) => {
        if (!cred) return;
        await ensureUserProfileOnSignIn(cred.user);
        trackAuth(!!getAdditionalUserInfo(cred)?.isNewUser);
      })
      .catch((error) => {
        console.warn("Google redirect sign-in failed:", error);
      });
  }, []);

  return null;
}
