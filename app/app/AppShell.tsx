"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import AppHeader from "./AppHeader";

type NavCtx = {
  navHidden: boolean;
  setNavHidden: (v: boolean) => void;
};

const NavVisibilityContext = createContext<NavCtx | null>(null);

export function useNavVisibility() {
  const ctx = useContext(NavVisibilityContext);
  if (!ctx) throw new Error("useNavVisibility must be used inside <AppShell />");
  return ctx;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [navHidden, setNavHidden] = useState(false);

  const value = useMemo(() => ({ navHidden, setNavHidden }), [navHidden]);

  return (
    <NavVisibilityContext.Provider value={value}>
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
        <AppHeader hidden={navHidden} />
        <div>{children}</div>
      </div>
    </NavVisibilityContext.Provider>
  );
}