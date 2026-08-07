"use client";

import { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";

const mobileLinks = [
  { href: "#work", label: "Work" },
  { href: "#services", label: "Services" },
  { href: "#process", label: "Process" },
  { href: "#about", label: "About" },
  { href: "#contact", label: "Start a project" },
];

export function MobileMenu() {
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

    const closeOnHashChange = () => {
      setIsOpen(false);
      buttonRef.current?.blur();
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("hashchange", closeOnHashChange);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("hashchange", closeOnHashChange);
    };
  }, []);

  const closeForNavigation = (event: MouseEvent<HTMLAnchorElement>) => {
    setIsOpen(false);
    buttonRef.current?.blur();
    event.currentTarget.blur();
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
            <a key={link.href} href={link.href} onClick={closeForNavigation}>
              {link.label}
            </a>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
