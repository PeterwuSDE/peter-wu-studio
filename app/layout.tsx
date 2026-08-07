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
  title: "Northline Studio | Design-Led Websites & Digital Systems",
  description: "Elevated website design, precise development, secure hosting, and managed care for brands that need to look exceptional and perform reliably.",
  metadataBase: new URL("https://peterwusde.github.io/peter-wu-studio/"),
  openGraph: {
    title: "Northline Studio | Design-Led Websites & Digital Systems",
    description: "Elevated website design, precise development, secure hosting, and managed care for brands with high standards.",
    type: "website",
    images: [{ url: "/peter-wu-studio/og.png", width: 1658, height: 949, alt: "Northline Studio — design-led websites and digital systems" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Northline Studio | Design-Led Websites & Digital Systems",
    description: "Elevated website design, precise development, secure hosting, and managed care for brands with high standards.",
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
