import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  type UserCredential,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { isDreamlyAndroidApp } from "@/lib/auth/isDreamlyAndroidApp";

export async function signInWithGoogle(): Promise<UserCredential | null> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  if (isDreamlyAndroidApp()) {
    await signInWithRedirect(auth, provider);
    return null;
  }

  return signInWithPopup(auth, provider);
}
