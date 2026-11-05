import { BlockList, isIP } from "node:net";
import { SEO_CHECK_MAX_URL_LENGTH } from "./contract.ts";

const blocked = new BlockList();

function block4(address: string, prefix: number) {
  blocked.addSubnet(address, prefix, "ipv4");
}

function block6(address: string, prefix: number) {
  blocked.addSubnet(address, prefix, "ipv6");
}

block4("0.0.0.0", 8);
block4("10.0.0.0", 8);
block4("100.64.0.0", 10);
block4("127.0.0.0", 8);
block4("169.254.0.0", 16);
block4("172.16.0.0", 12);
block4("192.0.0.0", 24);
block4("192.0.2.0", 24);
block4("192.168.0.0", 16);
block4("192.88.99.0", 24);
block4("198.18.0.0", 15);
block4("198.51.100.0", 24);
block4("203.0.113.0", 24);
block4("224.0.0.0", 4);
block4("240.0.0.0", 4);

block6("::", 128);
block6("::1", 128);
block6("::", 96);
block6("64:ff9b::", 96);
block6("64:ff9b:1::", 48);
block6("100::", 64);
block6("2001::", 32);
block6("2001:db8::", 32);
block6("2002::", 16);
block6("fc00::", 7);
block6("fe80::", 10);
block6("fec0::", 10);
block6("ff00::", 8);

const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata.goog",
  "metadata",
  "instance-data",
  "instance-data.ec2.internal",
  "kubernetes",
  "kubernetes.default",
  "kubernetes.default.svc",
  "kubernetes.default.svc.cluster.local",
]);

export function stripIpHost(hostname: string): string {
  let host = hostname.trim().toLowerCase();
  if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1);
  const zone = host.indexOf("%");
  if (zone !== -1) host = host.slice(0, zone);
  return host;
}

export function isPublicIp(address: string): boolean {
  const bare = stripIpHost(address);
  const family = isIP(bare);
  if (family === 0) return false;
  try {
    return !blocked.check(bare, family === 4 ? "ipv4" : "ipv6");
  } catch {
    return false;
  }
}

export function isBlockedHostname(hostname: string): boolean {
  const host = stripIpHost(hostname).replace(/\.$/, "");
  if (!host) return true;
  if (BLOCKED_HOSTS.has(host)) return true;
  return (
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".localdomain") ||
    host.endsWith(".internal") ||
    host.endsWith(".home.arpa") ||
    host.endsWith(".lan")
  );
}

export type NormalizeResult =
  | { ok: true; url: URL; normalized: string }
  | { ok: false; code: "invalid_target" | "blocked_target"; sanitized: string };

export function safeUrlKey(url: URL): string {
  const clean = new URL(url.href);
  clean.username = "";
  clean.password = "";
  clean.hash = "";
  return `${clean.protocol}//${clean.host}${clean.pathname}${clean.search}`;
}

export function validateUrl(url: URL): NormalizeResult {
  const sanitized = safeUrlKey(url);
  if (url.username || url.password) {
    return { ok: false, code: "blocked_target", sanitized };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, code: "invalid_target", sanitized: "" };
  }
  if (url.protocol === "http:" && url.port !== "" && url.port !== "80") {
    return { ok: false, code: "blocked_target", sanitized };
  }
  if (url.protocol === "https:" && url.port !== "" && url.port !== "443") {
    return { ok: false, code: "blocked_target", sanitized };
  }
  const host = stripIpHost(url.hostname);
  if (!host || /^\d+$/.test(host)) {
    return { ok: false, code: host ? "blocked_target" : "invalid_target", sanitized: host ? sanitized : "" };
  }
  if (isIP(host)) {
    if (!isPublicIp(host)) return { ok: false, code: "blocked_target", sanitized };
  } else if (isBlockedHostname(host)) {
    return { ok: false, code: "blocked_target", sanitized };
  }
  const clean = new URL(sanitized);
  return { ok: true, url: clean, normalized: sanitized };
}

export function normalizePublicUrl(input: string): NormalizeResult {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > SEO_CHECK_MAX_URL_LENGTH) {
    return { ok: false, code: "invalid_target", sanitized: "" };
  }
  if (/[\u0000-\u001F\u007F\\]/.test(trimmed) || /\s/.test(trimmed)) {
    return { ok: false, code: "invalid_target", sanitized: "" };
  }
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return { ok: false, code: "invalid_target", sanitized: "" };
  }
  url.hash = "";
  return validateUrl(url);
}
