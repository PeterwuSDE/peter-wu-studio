"use client";

import type { ComponentProps, MouseEvent } from "react";

export function navigateToSection(event: MouseEvent<HTMLAnchorElement>) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  const hash = event.currentTarget.hash;
  const target = hash ? document.getElementById(hash.slice(1)) : null;
  if (!target) return;

  event.preventDefault();
  event.currentTarget.blur();

  const headerHeight = document.querySelector(".site-header")?.getBoundingClientRect().height ?? 0;
  const targetTop = target.getBoundingClientRect().top + window.scrollY - headerHeight;

  window.scrollTo({ top: Math.max(0, targetTop), behavior: "instant" });
  if (window.location.hash !== hash) window.history.pushState(null, "", hash);
}

export function SectionLink(props: ComponentProps<"a">) {
  return <a {...props} onClick={navigateToSection} />;
}
