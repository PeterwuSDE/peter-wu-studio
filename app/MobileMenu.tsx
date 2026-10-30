"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const mobileLinks = [
  { href: "/websites", label: "Websites" },
  { href: "/tools", label: "Business tools" },
  { href: "/shopify", label: "Shopify" },
  { href: "/seo", label: "SEO" },
  { href: "/care", label: "Care" },
  { href: "/contact", label: "Contact" },
];

export function MobileMenu() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || menu.contains(event.target)) {
        return;
      }

      setIsOpen(false);
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.blur();
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const closeForNavigation = () => {
    setIsOpen(false);
    buttonRef.current?.blur();
  };

  return (
    <div className="mobile-menu" ref={menuRef}>
      <button
        aria-controls="mobile-navigation"
        aria-expanded={isOpen}
        className="mobile-menu-button"
        onClick={() => setIsOpen((open) => !open)}
        ref={buttonRef}
        type="button"
      >
        Menu
      </button>
      {isOpen ? (
        <nav aria-label="Mobile navigation" className="mobile-menu-panel" id="mobile-navigation">
          {mobileLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
              onClick={closeForNavigation}
            >
              {link.label}
            </a>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
