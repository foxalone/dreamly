"use client";

import { useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { passwordNeedsEmailVerification, unverifiedSessionHeld } from "@/lib/auth/emailVerification";

/** A password account cannot stay signed in until the confirmation link is opened. */
export default function UnverifiedEmailGate() {
  useEffect(() => onAuthStateChanged(auth, (user) => {
    if (!passwordNeedsEmailVerification(user) || unverifiedSessionHeld()) return;
    void signOut(auth);
  }), []);
  return null;
}
