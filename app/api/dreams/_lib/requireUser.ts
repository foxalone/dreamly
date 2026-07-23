import { NextResponse } from "next/server";
import { adminAuth } from "../../admin/_lib/firebaseAdmin";

/**
 * Require a valid Firebase ID token before spending OpenAI.
 * Accepts `idToken` from the JSON body (same pattern as quick-symbol).
 */
export async function requireSignedInUid(
  idToken: unknown
): Promise<{ uid: string } | { error: NextResponse }> {
  const token = String(idToken ?? "").trim();
  if (!token) {
    return {
      error: NextResponse.json(
        { error: "Sign in required.", code: "AUTH_REQUIRED" },
        { status: 401 }
      ),
    };
  }

  try {
    const decoded = await adminAuth().verifyIdToken(token);
    const uid = decoded?.uid ?? null;
    if (!uid) {
      return {
        error: NextResponse.json(
          { error: "Sign in required.", code: "AUTH_REQUIRED" },
          { status: 401 }
        ),
      };
    }
    return { uid };
  } catch {
    return {
      error: NextResponse.json(
        { error: "Sign in required.", code: "AUTH_REQUIRED" },
        { status: 401 }
      ),
    };
  }
}
