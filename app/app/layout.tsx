import type { ReactNode } from "react";
import BottomNav from "./BottomNav";

export default function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="pb-24">{children}</div>
      <BottomNav />
    </div>
  );
}