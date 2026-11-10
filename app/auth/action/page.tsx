import type { Metadata } from "next";
import { Suspense } from "react";
import AppHeader from "@/app/app/AppHeader";
import AuthActionClient from "./AuthActionClient";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthActionPage() {
  return (
    <>
      <AppHeader />
      <Suspense fallback={null}>
        <AuthActionClient />
      </Suspense>
    </>
  );
}
