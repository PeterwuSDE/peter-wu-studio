"use client";

import { usePathname } from "next/navigation";

const links = [
  { href: "/websites", label: "Websites" },
  { href: "/tools", label: "Business tools" },
  { href: "/shopify", label: "Shopify" },
  { href: "/seo", label: "SEO" },
  { href: "/care", label: "Care" },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="desktop-nav" aria-label="Primary navigation">
      {links.map((link) => (
        <a key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined}>
          {link.label}
        </a>
      ))}
    </nav>
  );
}
