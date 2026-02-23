"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import BottomNav from "./BottomNav";

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
        {/* контент с запасом снизу под navbar */}
        <div className={navHidden ? "" : "pb-24"}>{children}</div>

        {/* сам navbar */}
        <BottomNav hidden={navHidden} />
      </div>
    </NavVisibilityContext.Provider>
  );
}