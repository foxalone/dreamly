import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans, Noto_Sans_Arabic } from "next/font/google";
import "./globals.css";
import InstallPwaBanner from "./components/InstallPwaBanner";
import FirebaseAnalytics from "./components/FirebaseAnalytics";
import GoogleRedirectHandler from "@/lib/auth/GoogleRedirectHandler";
import AppI18n from "@/lib/i18n/AppI18n";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["400", "500", "600", "700"],
});

const notoArabic = Noto_Sans_Arabic({
  variable: "--font-noto-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://dreamly.art"),
  title: "Dreamly — AI Dream Interpreter & Dream Journal",
  description:
    "Interpret your dreams with AI, keep a private dream journal, and explore an anonymous world map of what people are dreaming. Free dream dictionary included.",
  openGraph: {
    siteName: "Dreamly",
    type: "website",
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
  other: {
    "p:domain_verify": "9742dd8c951e12bbbb912951e1f057b9",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${notoSans.variable} ${notoArabic.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");var c=document.documentElement.classList;c.remove("light","dark");if(t==="light"||t==="dark")c.add(t);var p=location.pathname||"/";var m=p.match(/^\\/(es|ar|pt|de|ru)(?=\\/|$)/);var loc=m?m[1]:"en";document.documentElement.lang=loc;document.documentElement.dir=loc==="ar"?"rtl":"ltr";if(loc==="ar")c.add("locale-ar");else c.remove("locale-ar");}catch(e){}})();`,
          }}
        />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2484539106050736"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-screen bg-[var(--bg)] text-[var(--text)] antialiased">
        <FirebaseAnalytics />
        <GoogleRedirectHandler />
        <AppI18n>
          {children}
          <InstallPwaBanner />
        </AppI18n>
      </body>
    </html>
  );
}
