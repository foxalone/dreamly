import { Suspense } from "react";
import { localeMetadata, localeFromParams } from "@/lib/i18n/page-locale";
import PurchaseReturnClient from "@/app/purchase/return/PurchaseReturnClient";
import { actionPurchaseCopy } from "@/lib/i18n/action-purchase";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const locale = await localeFromParams(params);
  return { title: `Dreamly — ${actionPurchaseCopy[locale].returnTitle}`, robots: { index: false, follow: false }, ...localeMetadata("/purchase/return", locale) };
}

export default function Page() { return <Suspense fallback={null}><PurchaseReturnClient /></Suspense>; }
