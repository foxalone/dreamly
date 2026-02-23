"use client";

import { useEffect, useMemo, useState } from "react";
import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";

function initialsFromUser(u: User) {
  const name = (u.displayName ?? "").trim();
  const email = (u.email ?? "").trim();
  const src = name || email || "U";
  const parts = src.split(/[\s._-]+/).filter(Boolean);
  const a = (parts[0]?.[0] ?? "U").toUpperCase();
  const b = (parts[1]?.[0] ?? parts[0]?.[1] ?? "").toUpperCase();
  return (a + b).slice(0, 2);
}

function shortUid(uid?: string | null) {
  if (!uid) return "";
  if (uid.length <= 10) return uid;
  return `${uid.slice(0, 5)}…${uid.slice(-5)}`;
}

export default function ProfilePage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "dark" | "light" | null;
    const t = saved ?? "dark";
    setTheme(t);
    if (t === "light") document.documentElement.classList.add("light");
    else document.documentElement.classList.remove("light");
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    if (next === "light") document.documentElement.classList.add("light");
    else document.documentElement.classList.remove("light");
  }

  async function doSignOut() {
    try {
      setBusy(true);
      await signOut(auth);
    } finally {
      setBusy(false);
    }
  }

  async function copyUid() {
    if (!user?.uid) return;
    try {
      await navigator.clipboard.writeText(user.uid);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = user.uid;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  const displayName = useMemo(() => {
    if (!user) return "";
    return user.displayName || user.email || "User";
  }, [user]);

  // ✅ theme-aware styles via CSS variables (works in light + dark)
  const card =
    "rounded-2xl bg-[var(--card)] border border-[var(--border)]";
  const titleText = "text-[var(--text)]";
  const mutedText = "text-[var(--muted)]";

  const pillBase =
    "h-11 px-5 rounded-full font-semibold transition border";
  const pillSurface =
    "bg-[var(--card)] text-[var(--text)] border-[var(--border)] hover:opacity-90";
  const pillDisabled = "disabled:opacity-50 disabled:cursor-not-allowed";

  const ADMIN_UIDS = new Set<string>([
  // ✅ добавь сюда свои UID админов
   "sGbA77TlcsatEMrgEvCv7Shjrj32",
]);

const isAdmin = !!user?.uid && ADMIN_UIDS.has(user.uid);

  return (
    <main className="px-6 py-10 max-w-3xl mx-auto">
      <h1 className={`text-3xl font-semibold ${titleText}`}>Profile</h1>

      {/* TOP BUTTONS */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          onClick={toggleTheme}
          className={`${pillBase} ${pillSurface}`}
        >
          <span className="mr-2">{theme === "dark" ? "☀️" : "🌙"}</span>
          {theme === "dark" ? "Light" : "Dark"}
        </button>

        <button
          onClick={copyUid}
          disabled={!user}
          className={`${pillBase} ${pillSurface} ${pillDisabled}`}
          title={user?.uid ?? ""}
        >
          {user ? (copied ? "Copied!" : "Copy UUID") : "Copy UUID"}
        </button>

        <button
          onClick={doSignOut}
          disabled={!user || busy}
          className={`${pillBase} bg-red-600 text-white border-transparent hover:bg-red-500 ${pillDisabled}`}
        >
          {busy ? "..." : "Sign out"}
        </button>

       {isAdmin ? (
  <Link
    href="/app/profile/admin-dashboard"
    className={`${pillBase} ${pillSurface} inline-flex items-center justify-center no-underline`}
  >
    Admin dashboard
  </Link>
) : null}
      </div>

      {/* PROFILE CARD */}
      <div className="mt-8">
        <div className={`${card} p-5`}>
          <div className="flex items-center gap-4">
            {user?.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoURL}
                alt="Profile"
                width={56}
                height={56}
                className="rounded-full object-cover ring-1 ring-[var(--border)]"
                referrerPolicy="no-referrer"
              />
            ) : user ? (
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-semibold
                           bg-[rgba(127,127,127,0.18)] text-[var(--text)] ring-1 ring-[var(--border)]"
              >
                {initialsFromUser(user)}
              </div>
            ) : (
              <div className="w-14 h-14 rounded-full bg-[rgba(127,127,127,0.12)] ring-1 ring-[var(--border)]" />
            )}

            <div className="min-w-0">
              <div className={`font-semibold text-lg truncate ${titleText}`}>
                {user ? displayName : "Not signed in"}
              </div>
              <div className={`text-sm truncate ${mutedText}`}>
                {user?.email ? user.email : "Sign in from the bottom bar"}
              </div>

              {user?.uid ? (
                <div className={`mt-2 text-xs ${mutedText}`}>
                  UID: <span className="font-mono">{shortUid(user.uid)}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}