import { accountDeletion } from "@/lib/i18n/account-deletion";
import { isLocale, LOCALES, SUPPORT_EMAIL } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/path";

const languageNames = { en: "English", es: "Español", ar: "العربية", pt: "Português", de: "Deutsch", ru: "Русский", ja: "日本語" };
const privacyLabels = { en: "Privacy policy", es: "Política de privacidad", ar: "سياسة الخصوصية", pt: "Política de privacidade", de: "Datenschutzerklärung", ru: "Политика конфиденциальности", ja: "プライバシーポリシー" };

export function GET(req: Request) {
  const language = new URL(req.url).searchParams.get("lang") ?? "";
  const locale = isLocale(language) ? language : "en";
  const [title, instructions, retention, action] = accountDeletion[locale];
  const policy = localePath("/privacy", locale);
  const languages = LOCALES.map((lang) => `<a href="?lang=${lang}" lang="${lang}"${lang === locale ? ' aria-current="page"' : ""}>${languageNames[lang]}</a>`).join(" ");
  const subject = encodeURIComponent("Dreamly account deletion request");
  const html = `<!doctype html>
<html lang="${locale}" dir="${locale === "ar" ? "rtl" : "ltr"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
body { font: 1rem/1.55 system-ui, sans-serif; margin: 2rem auto; max-width: 41rem; padding: 0 1rem; }
nav { display: flex; flex-wrap: wrap; gap: .5rem 1rem; }
[aria-current="page"] { font-weight: 700; }
</style>
</head>
<body>
<nav>${languages}</nav>
<main>
<h1>${title}</h1>
<p>${instructions}</p>
<p><a href="mailto:${SUPPORT_EMAIL}?subject=${subject}">${action} · ${SUPPORT_EMAIL}</a></p>
<p>${retention}</p>
<p><a href="${policy}">${privacyLabels[locale]}</a></p>
</main>
</body>
</html>`;
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
    },
  });
}
