import {
  CHECKLIST_ORDER,
  FINDING_PRIORITY,
  PRIORITY_FINDING_SIGNALS,
  sanitizePlainText,
  type Evaluation,
  type RuleFact,
  type RuleId,
} from "./contract.ts";
import { extractHtml, type ExtractedImage, type ExtractedPage } from "./extract-html.ts";
import type { PageFetchResult } from "./fetch-page.ts";
import { stripIpHost } from "./network-policy.ts";

const PLACEHOLDERS = new Set([
  "untitled",
  "untitled document",
  "document",
  "title",
  "page title",
  "new page",
  "website",
  "my website",
  "my site",
  "site title",
  "your site title",
  "default title",
  "home page",
  "homepage",
  "index.html",
  "react app",
  "vite app",
  "vite + react",
  "vite + react + ts",
  "just another wordpress site",
  "welcome to wordpress",
  "test page",
  "todo",
  "lorem ipsum",
  "未命名",
  "无标题",
  "标题",
  "网站标题",
  "新页面",
  "首页标题",
]);

export function isPlaceholderTitle(title: string): boolean {
  const normalized = title.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.。!！]+$/g, "");
  return PLACEHOLDERS.has(normalized);
}

export function directiveHasNoindex(value: string): boolean {
  for (const part of value.split(/[,;]/)) {
    const piece = part.trim().toLowerCase();
    if (!piece) continue;
    const directive = piece.includes(":") ? (piece.split(":").pop() ?? "").trim() : piece;
    if (directive === "noindex" || directive === "none") return true;
  }
  return false;
}

export function selectFindings(rules: readonly RuleFact[]): RuleId[] {
  const byId = new Map(rules.map((rule) => [rule.ruleId, rule]));
  const chosen: RuleId[] = [];
  for (const ruleId of FINDING_PRIORITY) {
    const rule = byId.get(ruleId);
    if (!rule) continue;
    if (!PRIORITY_FINDING_SIGNALS[ruleId].includes(rule.signal)) continue;
    chosen.push(ruleId);
    if (chosen.length === 2) break;
  }
  return chosen;
}

export function evaluatePage(input: { normalizedUrl: string; fetch: Exclude<PageFetchResult, { type: "blocked" }> }): Evaluation {
  const fetched = input.fetch;
  if (fetched.type === "document") {
    return evaluateDocument(input.normalizedUrl, fetched);
  }
  if (fetched.type === "access_restricted") {
    return emptyEvaluation(fetched.finalUrl, fetched.redirectCount, fetched.httpStatus, "access_restricted", "access_restricted");
  }
  if (fetched.type === "http_error") {
    return emptyEvaluation(fetched.finalUrl, fetched.redirectCount, fetched.httpStatus, "unavailable", "http_error");
  }
  const code = fetched.type === "network" ? "network_error" : fetched.type === "tls" ? "tls_error" : fetched.type === "dns" ? "dns_error" : fetched.type === "too_many_redirects" ? "too_many_redirects" : "timeout";
  return emptyEvaluation(null, fetched.redirectCount, null, "unavailable", code);
}

function evaluateDocument(
  normalizedUrl: string,
  fetched: Extract<PageFetchResult, { type: "document" }>,
): Evaluation {
  if (fetched.kind !== "html" || fetched.html == null) {
    const rules = headerOnlyRules(fetched.finalUrl, fetched.headers);
    const status = fetched.kind === "too_large" ? "too_large" : "unsupported_content";
    return {
      finalUrl: fetched.finalUrl,
      redirectCount: fetched.redirectCount,
      status,
      code: status,
      httpStatus: fetched.httpStatus,
      siteName: null,
      javascriptNotExecuted: false,
      rules,
      findingRuleIds: selectFindings(rules),
    };
  }

  const extracted = extractHtml(fetched.html);
  const jsShell = looksLikeJsShell(extracted);
  const rules = htmlRules(extracted, fetched.finalUrl, fetched.headers, jsShell);
  const unknown = rules.some((rule) => rule.status === "unknown");
  const javascriptNotExecuted = jsShell && unknown;
  const findingRuleIds = selectFindings(rules);
  const status = unknown ? "partial" : "completed";
  const code = javascriptNotExecuted
    ? "javascript_not_executed"
    : unknown
      ? "partial"
      : findingRuleIds.length === 0
        ? "no_priority_findings"
        : "ok";
  return {
    finalUrl: fetched.finalUrl,
    redirectCount: fetched.redirectCount,
    status,
    code,
    httpStatus: fetched.httpStatus,
    siteName: pickSiteName(extracted, fetched.finalUrl || normalizedUrl),
    javascriptNotExecuted,
    rules,
    findingRuleIds,
  };
}

function emptyEvaluation(
  finalUrl: string | null,
  redirectCount: number,
  httpStatus: number | null,
  status: Evaluation["status"],
  code: Evaluation["code"],
): Evaluation {
  return {
    finalUrl,
    redirectCount,
    status,
    code,
    httpStatus,
    siteName: null,
    javascriptNotExecuted: false,
    rules: [],
    findingRuleIds: [],
  };
}

function looksLikeJsShell(page: ExtractedPage): boolean {
  if (page.visibleTextLength >= 80) return false;
  if (page.scriptCount < 1) return false;
  return page.hasAppRoot || page.noscriptMentionsJs;
}

function htmlRules(page: ExtractedPage, finalUrl: string, headers: Record<string, string>, jsShell: boolean): RuleFact[] {
  const rules = [
    httpsFact(finalUrl),
    titleFact(page.title, jsShell),
    descriptionFact(page.description, jsShell),
    h1Fact(page.h1, jsShell),
    indexabilityFact(page.robots, headers["x-robots-tag"], true, jsShell),
    canonicalFact(page.canonicalHref, finalUrl, jsShell),
    viewportFact(page.viewport, jsShell),
    imageFact(page.images, jsShell),
  ];
  return orderRules(rules);
}

function headerOnlyRules(finalUrl: string, headers: Record<string, string>): RuleFact[] {
  return orderRules([
    httpsFact(finalUrl),
    unknownFact("title"),
    unknownFact("description"),
    unknownFact("h1"),
    indexabilityFact([], headers["x-robots-tag"], false, false),
    unknownFact("canonical"),
    unknownFact("viewport"),
    unknownFact("image_alt"),
  ]);
}

function orderRules(rules: RuleFact[]): RuleFact[] {
  const byId = new Map(rules.map((rule) => [rule.ruleId, rule]));
  return CHECKLIST_ORDER.map((ruleId) => byId.get(ruleId)).filter((rule): rule is RuleFact => Boolean(rule));
}

function httpsFact(finalUrl: string): RuleFact {
  let protocol = "";
  try {
    protocol = new URL(finalUrl).protocol;
  } catch {
    protocol = "";
  }
  if (protocol === "https:") {
    return { ruleId: "https", status: "pass", signal: "https", observation: sanitizePlainText(finalUrl, 200), count: null };
  }
  return { ruleId: "https", status: "review", signal: "http", observation: sanitizePlainText(finalUrl, 200), count: null };
}

function titleFact(title: string, jsShell: boolean): RuleFact {
  const value = sanitizePlainText(title, 180);
  if (!value) return jsShell ? unknownFact("title") : { ruleId: "title", status: "review", signal: "missing", observation: "", count: null };
  if (isPlaceholderTitle(value)) {
    return { ruleId: "title", status: "review", signal: "placeholder", observation: value, count: null };
  }
  return { ruleId: "title", status: "pass", signal: "present", observation: value, count: null };
}

function descriptionFact(description: string | null, jsShell: boolean): RuleFact {
  const value = sanitizePlainText(description ?? "", 180);
  if (!value) {
    return jsShell ? unknownFact("description") : { ruleId: "description", status: "review", signal: "missing", observation: "", count: null };
  }
  return { ruleId: "description", status: "pass", signal: "present", observation: value, count: null };
}

function h1Fact(headings: string[], jsShell: boolean): RuleFact {
  if (headings.length === 0) {
    return jsShell ? unknownFact("h1") : { ruleId: "h1", status: "review", signal: "missing", observation: "", count: 0 };
  }
  const sample = sanitizePlainText(headings[0] ?? "", 120);
  if (headings.length === 1) return { ruleId: "h1", status: "pass", signal: "single", observation: sample, count: 1 };
  return { ruleId: "h1", status: "review", signal: "multiple", observation: sample, count: headings.length };
}

function indexabilityFact(metaRobots: string[], xRobots: string | undefined, htmlFullyRead: boolean, jsShell: boolean): RuleFact {
  const sources: string[] = [];
  if (htmlFullyRead) {
    for (const value of metaRobots) sources.push(`meta robots: ${sanitizePlainText(value, 120)}`);
  }
  if (xRobots) sources.push(`X-Robots-Tag: ${sanitizePlainText(xRobots, 120)}`);
  const hit = sources.find((source) => directiveHasNoindex(source));
  if (hit) return { ruleId: "indexability", status: "review", signal: "noindex", observation: hit, count: null };
  if (!htmlFullyRead || jsShell) return unknownFact("indexability");
  return { ruleId: "indexability", status: "pass", signal: "no_noindex", observation: "", count: null };
}

function canonicalFact(href: string | null, finalUrl: string, jsShell: boolean): RuleFact {
  if (!href || !href.trim()) {
    return jsShell ? unknownFact("canonical") : { ruleId: "canonical", status: "review", signal: "missing", observation: "", count: null };
  }
  let resolved: URL;
  try {
    resolved = new URL(href, finalUrl);
  } catch {
    return { ruleId: "canonical", status: "review", signal: "invalid", observation: sanitizePlainText(href, 180), count: null };
  }
  if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
    return { ruleId: "canonical", status: "review", signal: "invalid", observation: sanitizePlainText(href, 180), count: null };
  }
  if (resolved.username || resolved.password || badPort(resolved)) {
    return { ruleId: "canonical", status: "review", signal: "invalid", observation: sanitizePlainText(stripUser(resolved), 180), count: null };
  }
  if (!sameSite(resolved.hostname, new URL(finalUrl).hostname)) {
    return { ruleId: "canonical", status: "review", signal: "cross_domain", observation: sanitizePlainText(resolved.href, 180), count: null };
  }
  resolved.hash = "";
  return { ruleId: "canonical", status: "pass", signal: "same_site", observation: sanitizePlainText(resolved.href, 180), count: null };
}

function viewportFact(viewport: string | null, jsShell: boolean): RuleFact {
  const value = sanitizePlainText(viewport ?? "", 120);
  if (value) return { ruleId: "viewport", status: "pass", signal: "present", observation: value, count: null };
  return jsShell ? unknownFact("viewport") : { ruleId: "viewport", status: "review", signal: "missing", observation: "", count: null };
}

function imageFact(images: ExtractedImage[], jsShell: boolean): RuleFact {
  if (images.length === 0) {
    return jsShell
      ? unknownFact("image_alt")
      : { ruleId: "image_alt", status: "not_applicable", signal: "no_images", observation: "", count: 0 };
  }
  const missing = images.filter((image) => !isDecorative(image) && image.alt === null);
  if (missing.length === 0) {
    return { ruleId: "image_alt", status: "pass", signal: "ok", observation: "", count: images.length };
  }
  return {
    ruleId: "image_alt",
    status: "review",
    signal: "missing_alt",
    observation: sanitizePlainText(missing[0]?.src ?? "", 80),
    count: missing.length,
  };
}

function isDecorative(image: ExtractedImage): boolean {
  if (image.hidden || image.ariaHidden) return true;
  const role = image.role?.trim().toLowerCase() ?? "";
  if (role === "presentation" || role === "none") return true;
  return image.alt !== null && image.alt.trim() === "";
}

function unknownFact(ruleId: RuleId): RuleFact {
  return { ruleId, status: "unknown", signal: "unknown", observation: "", count: null };
}

function sameSite(left: string, right: string): boolean {
  return comparableHost(left) === comparableHost(right);
}

function comparableHost(hostname: string): string {
  return stripIpHost(hostname).replace(/\.$/, "").replace(/^www\./, "");
}

function badPort(url: URL): boolean {
  if (url.protocol === "http:") return url.port !== "" && url.port !== "80";
  if (url.protocol === "https:") return url.port !== "" && url.port !== "443";
  return true;
}

function stripUser(url: URL): string {
  const clean = new URL(url.href);
  clean.username = "";
  clean.password = "";
  clean.hash = "";
  return clean.href;
}

function pickSiteName(page: ExtractedPage, finalUrl: string): string {
  const title = sanitizePlainText(page.title, 120);
  if (title && !isPlaceholderTitle(title)) return title;
  const og = sanitizePlainText(page.ogSiteName ?? "", 120);
  if (og) return og;
  const structured = sanitizePlainText(page.structuredName ?? "", 120);
  if (structured) return structured;
  try {
    return new URL(finalUrl).hostname.replace(/^\[|\]$/g, "");
  } catch {
    return finalUrl;
  }
}
