import { auth, firestore } from "@/lib/firebase";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import {
  GoogleAuthProvider,
  signInWithPopup,
  type User,
} from "firebase/auth";

async function upsertUserProfile(u: User) {
  const ref = doc(firestore, "users", u.uid);

  const snap = await getDoc(ref);
  const exists = snap.exists();

  const base = {
    uid: u.uid,
    email: u.email ?? null,
    displayName: u.displayName ?? null,
    photoURL: u.photoURL ?? null,

    authCreationTime: u.metadata?.creationTime ?? null,
    authLastSignInTime: u.metadata?.lastSignInTime ?? null,

    lastLoginAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const first = exists
    ? {}
    : {
        firstLoginAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      };

  await setDoc(ref, { ...base, ...first }, { merge: true });
}

let lastUpsertAt = 0;

export async function ensureSignedIn(): Promise<User> {
  let u = auth.currentUser;

  if (!u) {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    u = auth.currentUser;
  }

  if (!u) throw new Error("Not signed in");

  // ✅ иногда metadata прилетает не сразу
  await u.reload().catch(() => {});

  // ✅ не спамим апдейтом при рефреше токена/рендерах
  const now = Date.now();
  if (now - lastUpsertAt > 5000) {
    lastUpsertAt = now;
    await upsertUserProfile(u);
  }

  return u;
}