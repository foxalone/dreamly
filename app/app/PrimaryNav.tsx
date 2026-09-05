"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  GoogleAuthProvider,
  User,
  getAdditionalUserInfo,
  onAuthStateChanged,
  signInWithPopup,
} from "firebase/auth";

import { ensureUserProfileOnSignIn } from "@/lib/auth/ensureUserProfile";
import { auth } from "@/lib/firebase";
import { trackAuth } from "@/lib/analytics";

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
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0">
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

function IconDictionary({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <path
        d="M4.5 5.5A2.5 2.5 0 0 1 7 3h5v17H7a2.5 2.5 0 0 0-2.5 1V5.5ZM19.5 5.5A2.5 2.5 0 0 0 17 3h-5v17h5a2.5 2.5 0 0 1 2.5 1V5.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        opacity={active ? 1 : 0.75}
      />
      <path
        d="M7.5 7H9M15 7h1.5"
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
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0">
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
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0">
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

function IconMap({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <path
        d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        opacity={active ? 1 : 0.75}
      />
      <path
        d="M9 4v14M15 6v14"
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
  const size = 20;
  const ring = active ? "ring-2 ring-green-500" : "ring-1 ring-[var(--border)]";
  const photo = user.photoURL?.trim();

  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt="Profile"
        width={size}
        height={size}
        className={cls("shrink-0 rounded-full object-cover", ring)}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className={cls(
        "shrink-0 rounded-full flex items-center justify-center font-semibold",
        "bg-[rgba(127,127,127,0.18)] text-current",
        ring
      )}
      style={{ width: size, height: size, fontSize: 9, lineHeight: "9px" }}
      aria-label="Profile"
    >
      {initialsFromUser(user)}
    </div>
  );
}

type PrimaryNavProps = {
  tone?: "app" | "dictionary";
  hidden?: boolean;
};

export default function PrimaryNav({ tone = "app", hidden }: PrimaryNavProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [signinNext, setSigninNext] = useState<string | null>(null);

  useEffect(() =>
    onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) return;
      ensureUserProfileOnSignIn(u);
    }),
  []);

  // On /signin, read ?next= from window.location to mirror the active tab.
  // Done in an effect (not useSearchParams) so pages that include this nav
  // can still be statically generated.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname !== "/signin") {
      setSigninNext(null);
      return;
    }
    const n = new URLSearchParams(window.location.search).get("next");
    setSigninNext(n && n.startsWith("/") ? n : null);
  }, [pathname]);

  const effectivePath = useMemo(() => {
    if (pathname === "/signin" && signinNext) return signinNext;
    return pathname ?? "";
  }, [pathname, signinNext]);

  const isActive = (href: string) =>
    effectivePath === href || effectivePath.startsWith(href + "/");

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
        label: "Feed",
        icon: (a) => <IconShared active={a} />,
        activeClass: "text-red-500",
      },
      {
        href: "/dreams",
        label: "Dictionary",
        icon: (a) => <IconDictionary active={a} />,
        activeClass: "text-amber-400",
      },
      {
        href: "/app/map",
        label: "Map",
        icon: (a) => <IconMap active={a} />,
        activeClass: "text-purple-500",
      },
    ],
    []
  );

  async function signInGoogle() {
    try {
      setBusy(true);
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      await ensureUserProfileOnSignIn(cred.user);
      trackAuth(!!getAdditionalUserInfo(cred)?.isNewUser);
    } finally {
      setBusy(false);
    }
  }

  if (hidden) return null;

  const profileHref = "/app/profile";
  const profileActive = isActive(profileHref);
  const idleClass = tone === "dictionary" ? "text-[var(--dd-muted)]" : "text-[var(--muted)]";
  const itemClass =
    "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 md:flex-none md:px-2.5 md:py-1";

  return (
    <nav
      aria-label="Primary"
      className="primary-nav grid min-w-0 w-full grid-cols-5 md:flex md:w-auto md:items-center md:justify-center md:gap-0.5"
    >
      {baseItems.map((it) => {
        const active = isActive(it.href);

        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={cls(
              itemClass,
              "text-sm font-medium transition-colors select-none",
              active ? it.activeClass : idleClass
            )}
          >
            {it.icon(active)}
            <span className="max-w-full truncate text-[10px] md:text-xs">{it.label}</span>
          </Link>
        );
      })}

      {user ? (
        <Link
          href={profileHref}
          aria-current={profileActive ? "page" : undefined}
          className={cls(
            itemClass,
            "text-sm font-medium transition-colors select-none",
            profileActive ? "text-green-500" : idleClass
          )}
        >
          <AvatarIcon user={user} active={profileActive} />
          <span className="max-w-full truncate text-[10px] md:text-xs">Profile</span>
        </Link>
      ) : (
        <button
          type="button"
          onClick={signInGoogle}
          disabled={busy}
          className={cls(
            itemClass,
            "text-sm font-medium transition-colors select-none",
            idleClass,
            busy && "opacity-60 cursor-not-allowed"
          )}
        >
          <IconSignIn active={false} />
          <span className="max-w-full truncate text-[10px] md:text-xs">{busy ? "..." : "Sign in"}</span>
        </button>
      )}
    </nav>
  );
}
