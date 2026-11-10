// app/signin/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import AppHeader from "@/app/app/AppHeader";
import SignInClient from "./SignInClient";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return (
    <>
      <AppHeader />
      <Suspense fallback={null}>
        <SignInClient />
      </Suspense>
    </>
  );
}