import { headers } from "next/headers";
import { acceptLanguageLocale } from "@/lib/i18n/acceptLanguage";
import MoonNotFound from "./components/MoonNotFound";

export default async function NotFound() {
  const locale = acceptLanguageLocale((await headers()).get("accept-language"));
  return <MoonNotFound locale={locale} />;
}
