import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteFooter, SiteHeader } from "./Chrome";
import { siteOrigin } from "./site";
import { studioJsonLd } from "./structured-data";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jsonLd = JSON.stringify(studioJsonLd).replace(/</g, "\\u003c");

const hashForwardScript = `(function () {
  var path = location.pathname.replace(/\\/index\\.html$/, "").replace(/\\/$/, "") || "/";
  if (path !== "/") return;
  var map = {
    seo: "/seo",
    care: "/care",
    pricing: "/websites#pricing",
    contact: "/contact",
    process: "/websites#process"
  };
  var hash = location.hash.replace(/^#/, "").toLowerCase();
  var dest = map[hash];
  if (dest) location.replace(dest);
})();`;

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  icons: {
    icon: [{ url: "/favicon.png", sizes: "512x512", type: "image/png" }],
    shortcut: "/favicon.png",
    apple: [{ url: "/favicon.png", sizes: "512x512", type: "image/png" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <script dangerouslySetInnerHTML={{ __html: hashForwardScript }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
