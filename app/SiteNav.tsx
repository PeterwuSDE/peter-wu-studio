"use client";

import { usePathname } from "next/navigation";

const links = [
  { href: "/websites", label: "Websites" },
  { href: "/seo", label: "SEO" },
  { href: "/care", label: "Care" },
  { href: "/contact", label: "Contact" },
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
