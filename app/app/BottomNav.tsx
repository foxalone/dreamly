"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  GoogleAuthProvider,
  User,
  onAuthStateChanged,
  signInWithPopup,
} from "firebase/auth";

import { auth } from "@/lib/firebase";

type Item = {
  href: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
  activeClass: string;
};

function cls(...s: Array<string | false | undefined>) {
  return s.filter(Boolean).join(" ");
}

function initialsFromUser(u: User) {
  const name = (u.displayName ?? "").trim();
  const email = (u.email ?? "").trim();

  const src = name || email || "U";
  const parts = src.split(/[\s._-]+/).filter(Boolean);

  const a = (parts[0]?.[0] ?? "U").toUpperCase();
  const b = (parts[1]?.[0] ?? parts[0]?.[1] ?? "").toUpperCase();

  return (a + b).slice(0, 2);
}

function IconDreams({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <path
        d="M4 6.5C4 5.12 5.12 4 6.5 4H14c3.314 0 6 2.686 6 6v7.5c0 1.38-1.12 2.5-2.5 2.5H10c-3.314 0-6-2.686-6-6V6.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        opacity={active ? 1 : 0.75}
      />
      <path
        d="M8 9h8M8 12.5h6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity={active ? 1 : 0.75}
      />
    </svg>
  );
}

function IconShared({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <path
        d="M12 21s-7-4.35-7-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 19 10c0 6.65-7 11-7 11Z"
        stroke="currentColor"
        strokeWidth="1.8"
        opacity={active ? 1 : 0.75}
      />
    </svg>
  );
}

function IconSignIn({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <path
        d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity={active ? 1 : 0.75}
      />
      <path
        d="M10 17l5-5-5-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={active ? 1 : 0.75}
      />
      <path
        d="M15 12H3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity={active ? 1 : 0.75}
      />
    </svg>
  );
}

function AvatarIcon({
  user,
  active,
}: {
  user: User;
  active: boolean;
}) {
  const size = 22;
  const ring = active ? "ring-2 ring-green-500" : "ring-1 ring-white/10";
  const photo = user.photoURL?.trim();

  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt="Profile"
        width={size}
        height={size}
        className={cls(
          "shrink-0 rounded-full object-cover",
          ring
        )}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className={cls(
        "shrink-0 rounded-full flex items-center justify-center font-semibold",
        "bg-white/10 text-white",
        ring
      )}
      style={{ width: size, height: size, fontSize: 10, lineHeight: "10px" }}
      aria-label="Profile"
    >
      {initialsFromUser(user)}
    </div>
  );
}

type BottomNavProps = {
  hidden?: boolean;
};

export default function BottomNav({ hidden }: BottomNavProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(href + "/");

  const baseItems: Item[] = useMemo(
    () => [
      {
        href: "/app/dreams",
        label: "Dreams",
        icon: (a) => <IconDreams active={a} />,
        activeClass: "text-blue-500",
      },
      {
        href: "/app/shared",
        label: "Shared",
        icon: (a) => <IconShared active={a} />,
        activeClass: "text-red-500",
      },
    ],
    []
  );

  async function signInGoogle() {
    try {
      setBusy(true);
      const provider = new GoogleAuthProvider();
      // опционально: выбирать аккаунт каждый раз
      // provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
    } finally {
      setBusy(false);
    }
  }

  if (hidden) return null;

  const profileHref = "/app/profile";
  const profileActive = isActive(profileHref);

  return (
    <nav className="bottom-nav fixed bottom-0 left-0 right-0 z-50 transition-all duration-300">
      <div className="mx-auto max-w-3xl px-4 pb-4">
        <div className="bottom-nav-shell rounded-3xl backdrop-blur-md">
          <div className="grid grid-cols-3">
            {baseItems.map((it) => {
              const active = isActive(it.href);

              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={cls(
                    "flex flex-col items-center justify-center gap-1 py-3",
                    "text-sm font-medium transition-colors select-none",
                    active ? it.activeClass : "text-[var(--muted)]"
                  )}
                >
                  {it.icon(active)}
                  <span className="text-xs">{it.label}</span>
                </Link>
              );
            })}

            {/* Slot 3: Sign in OR Profile avatar */}
            {user ? (
              <Link
                href={profileHref}
                className={cls(
                  "flex flex-col items-center justify-center gap-1 py-3",
                  "text-sm font-medium transition-colors select-none",
                  profileActive ? "text-green-500" : "text-[var(--muted)]"
                )}
              >
                <AvatarIcon user={user} active={profileActive} />
                <span className="text-xs">Profile</span>
              </Link>
            ) : (
              <button
                onClick={signInGoogle}
                disabled={busy}
                className={cls(
                  "flex flex-col items-center justify-center gap-1 py-3",
                  "text-sm font-medium transition-colors select-none",
                  "text-[var(--muted)]",
                  busy && "opacity-60 cursor-not-allowed"
                )}
              >
                <IconSignIn active={false} />
                <span className="text-xs">{busy ? "..." : "Sign in"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}