"use client";

import { useEffect, useRef } from "react";

const mobileLinks = [
  { href: "#work", label: "Work" },
  { href: "#services", label: "Services" },
  { href: "#process", label: "Process" },
  { href: "#about", label: "About" },
  { href: "#contact", label: "Start a project" },
];

export function MobileMenu() {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const details = detailsRef.current;
    if (!details) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!details.open || !(event.target instanceof Node) || details.contains(event.target)) {
        return;
      }

      details.open = false;
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        details.open = false;
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const closeAfterNavigation = () => {
    const details = detailsRef.current;
    if (!details) return;

    requestAnimationFrame(() => {
      details.open = false;
    });
  };

  return (
    <details className="mobile-menu" ref={detailsRef}>
      <summary aria-label="Open navigation">Menu</summary>
      <nav aria-label="Mobile navigation">
        {mobileLinks.map((link) => (
          <a key={link.href} href={link.href} onClick={closeAfterNavigation}>
            {link.label}
          </a>
        ))}
      </nav>
    </details>
  );
}
