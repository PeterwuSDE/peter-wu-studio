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

export const metadata: Metadata = {
  title: "Northline Studio | Websites for Small Businesses",
  description: "Custom website design, development, hosting, and ongoing support for small businesses that care about their work.",
  metadataBase: new URL("https://peterwusde.github.io/peter-wu-studio/"),
  openGraph: {
    title: "Northline Studio | Websites for Small Businesses",
    description: "Custom website design, reliable hosting, and ongoing support—all handled for you.",
    type: "website",
    images: [{ url: "/peter-wu-studio/og.png", width: 1658, height: 949, alt: "Northline Studio — websites for small businesses" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Northline Studio | Websites for Small Businesses",
    description: "Custom website design, reliable hosting, and ongoing support—all handled for you.",
    images: ["/peter-wu-studio/og.png"],
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
