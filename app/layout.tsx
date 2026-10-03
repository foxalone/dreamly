import type { Metadata, Viewport } from "next";
import "./fonts.css";
import "./globals.css";
import InstallPwaBanner from "./components/InstallPwaBanner";
import DreamCatcherFab from "./components/DreamCatcherFab";
import FirebaseAnalytics from "./components/FirebaseAnalytics";
import SymbolClickTracker from "./components/SymbolClickTracker";
import GoogleRedirectHandler from "@/lib/auth/GoogleRedirectHandler";
import AppI18n from "@/lib/i18n/AppI18n";

// Fonts are self-hosted in public/fonts (see app/fonts.css). next/font/google was removed
// because Google started returning extensionless /l/font?kit= URLs that break the Turbopack
// build ("next/font/google queries have exactly one entry", next.js issue #99114).

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
      suppressHydrationWarning
    >
      <head>
        <link
          rel="preload"
          href="/fonts/geist-latin-wght-normal.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");var c=document.documentElement.classList;c.remove("light","dark");if(t==="light"||t==="dark")c.add(t);var p=location.pathname||"/";var m=p.match(/^\\/(es|ar|pt|de|ru)(?=\\/|$)/);var loc=m?m[1]:"en";document.documentElement.lang=loc;document.documentElement.dir=loc==="ar"?"rtl":"ltr";["ar","ru"].forEach(function(l){c.toggle("locale-"+l,loc===l)});}catch(e){}})();`,
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
        <SymbolClickTracker />
        <GoogleRedirectHandler />
        <AppI18n>
          {children}
          <DreamCatcherFab />
          <InstallPwaBanner />
        </AppI18n>
      </body>
    </html>
  );
}
