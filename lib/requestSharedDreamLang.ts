import type { User } from "firebase/auth";

/**
 * Fire-and-forget: ask the server to detect and store the language of a
 * freshly shared dream (shared_dreams.<id>.lang). Failures are only logged —
 * the feed falls back to a script-based guess when `lang` is missing.
 */
export function requestSharedDreamLang(user: User, sharedDreamId: string) {
  void (async () => {
    try {
      const idToken = await user.getIdToken();
      await fetch("/api/dreams/detect-lang", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sharedDreamId, idToken }),
      });
    } catch (e) {
      console.warn("detect-lang request failed:", e);
    }
  })();
}
