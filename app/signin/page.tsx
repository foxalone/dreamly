// app/signin/page.tsx
import { Suspense } from "react";
import AppHeader from "@/app/app/AppHeader";
import SignInClient from "./SignInClient";

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