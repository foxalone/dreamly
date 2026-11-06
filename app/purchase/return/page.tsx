import { Suspense } from "react";
import { localeMetadata } from "@/lib/i18n/page-locale";
import PurchaseReturnClient from "./PurchaseReturnClient";
import { actionPurchaseCopy } from "@/lib/i18n/action-purchase";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `Dreamly — ${actionPurchaseCopy.en.returnTitle}`,
  robots: { index: false, follow: false },
  ...localeMetadata("/purchase/return", "en"),
};

export default function Page() { return <Suspense fallback={null}><PurchaseReturnClient /></Suspense>; }
