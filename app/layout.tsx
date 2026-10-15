import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteTitle = "Northline Studio | Design, Commerce & Digital Systems";
const siteDescription = "Northline Studio is a design-led digital partner that designs, builds, launches, and manages websites, commerce experiences, and business systems for ambitious founders and owner-led businesses.";

export const metadata: Metadata = {
  title: siteTitle,
  description: siteDescription,
  metadataBase: new URL("https://peterwusde.github.io/peter-wu-studio/"),
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    type: "website",
    images: [{ url: "/peter-wu-studio/og.png", width: 1658, height: 949, alt: "Northline Studio — design-led websites and digital systems" }],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/peter-wu-studio/og.png"],
  },
  icons: {
    icon: "/peter-wu-studio/favicon.png",
    shortcut: "/peter-wu-studio/favicon.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
