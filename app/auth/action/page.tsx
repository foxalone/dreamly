import { Suspense } from "react";
import AppHeader from "@/app/app/AppHeader";
import AuthActionClient from "./AuthActionClient";

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
