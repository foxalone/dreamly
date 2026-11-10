import { permanentRedirect } from "next/navigation";
import { localeFromParams } from "@/lib/i18n/page-locale";
import { localePath } from "@/lib/i18n/path";

type Props = { params: Promise<{ locale: string }> };

export default async function LocaleAppIndex({ params }: Props) {
  const locale = await localeFromParams(params);
  permanentRedirect(localePath("/app/dreams", locale));
}
