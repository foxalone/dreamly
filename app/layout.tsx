import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import InstallPwaBanner from "./components/InstallPwaBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");var c=document.documentElement.classList;c.remove("light","dark");if(t==="light"||t==="dark")c.add(t);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-[var(--bg)] text-[var(--text)] antialiased">
        {children}
        <InstallPwaBanner />
      </body>
    </html>
  );
}
