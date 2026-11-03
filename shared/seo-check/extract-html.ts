import { parse, type DefaultTreeAdapterMap } from "parse5";

type Node = DefaultTreeAdapterMap["node"];
type Element = DefaultTreeAdapterMap["element"];
type TextNode = DefaultTreeAdapterMap["textNode"];

export interface ExtractedImage {
  alt: string | null;
  role: string | null;
  ariaHidden: boolean;
  hidden: boolean;
  src: string;
}

export interface ExtractedPage {
  title: string;
  description: string | null;
  robots: string[];
  canonicalHref: string | null;
  viewport: string | null;
  h1: string[];
  images: ExtractedImage[];
  ogSiteName: string | null;
  structuredName: string | null;
  visibleTextLength: number;
  scriptCount: number;
  hasAppRoot: boolean;
  noscriptMentionsJs: boolean;
}

const APP_ROOT_IDS = new Set(["root", "app", "__next", "__nuxt", "___gatsby", "sapper"]);

export function extractHtml(html: string): ExtractedPage {
  const document = parse(html);
  const page: ExtractedPage = {
    title: "",
    description: null,
    robots: [],
    canonicalHref: null,
    viewport: null,
    h1: [],
    images: [],
    ogSiteName: null,
    structuredName: null,
    visibleTextLength: 0,
    scriptCount: 0,
    hasAppRoot: false,
    noscriptMentionsJs: false,
  };
  let visible = "";
  walk(document, false, false, page, (chunk) => {
    if (visible.length >= 500) return;
    visible += chunk;
  });
  page.visibleTextLength = visible.replace(/\s+/g, " ").trim().length;
  return page;
}

function walk(node: Node, blocked: boolean, inBody: boolean, page: ExtractedPage, addVisible: (chunk: string) => void) {
  if (node.nodeName === "#text") {
    if (!blocked && inBody) addVisible((node as TextNode).value);
    return;
  }
  if (!("tagName" in node)) {
    if ("childNodes" in node) {
      for (const child of node.childNodes) walk(child, blocked, inBody, page, addVisible);
    }
    return;
  }

  const element = node as Element;
  const tag = element.tagName.toLowerCase();
  if (!blocked) collect(element, tag, page);
  if (tag === "template") return;
  const nextBlocked = blocked || tag === "script" || tag === "style" || tag === "noscript" || tag === "template";
  const nextInBody = inBody || tag === "body";
  for (const child of element.childNodes) walk(child, nextBlocked, nextInBody, page, addVisible);
}

function collect(element: Element, tag: string, page: ExtractedPage) {
  if (tag === "title" && !page.title) page.title = textOf(element);
  if (tag === "script") {
    page.scriptCount += 1;
    const type = (attr(element, "type") ?? "").toLowerCase();
    if (type.includes("ld+json") && !page.structuredName) {
      const raw = element.childNodes
        .map((child) => (child.nodeName === "#text" ? (child as TextNode).value : ""))
        .join("");
      page.structuredName = structuredName(raw);
    }
  }
  if (tag === "noscript") {
    if (/javascript/i.test(textOf(element))) page.noscriptMentionsJs = true;
  }
  if (tag === "meta") {
    const name = (attr(element, "name") ?? "").toLowerCase();
    const content = attr(element, "content");
    if (name === "description" && content?.trim() && !page.description) page.description = content;
    if ((name === "robots" || name === "googlebot") && content) page.robots.push(content);
    if (name === "viewport" && content?.trim() && !page.viewport) page.viewport = content;
    const property = (attr(element, "property") ?? "").toLowerCase();
    if (property === "og:site_name" && content?.trim() && !page.ogSiteName) page.ogSiteName = content;
  }
  if (tag === "link" && !page.canonicalHref) {
    const rel = (attr(element, "rel") ?? "").toLowerCase().split(/\s+/);
    if (rel.includes("canonical")) page.canonicalHref = attr(element, "href");
  }
  if (tag === "h1") page.h1.push(textOf(element).replace(/\s+/g, " ").trim());
  if (tag === "img") {
    const alt = attr(element, "alt");
    page.images.push({
      alt,
      role: attr(element, "role"),
      ariaHidden: (attr(element, "aria-hidden") ?? "").toLowerCase() === "true",
      hidden: element.attrs.some((item) => item.name.toLowerCase() === "hidden"),
      src: (attr(element, "src") ?? "").slice(0, 200),
    });
  }
  const id = (attr(element, "id") ?? "").toLowerCase();
  if ((APP_ROOT_IDS.has(id) || tag === "app-root") && textOf(element).trim().length < 40) {
    page.hasAppRoot = true;
  }
}

function attr(element: Element, name: string): string | null {
  const found = element.attrs.find((item) => item.name.toLowerCase() === name);
  return found ? found.value : null;
}

function textOf(node: Node): string {
  if (node.nodeName === "#text") return (node as TextNode).value;
  if (!("childNodes" in node)) return "";
  if ("tagName" in node) {
    const tag = (node as Element).tagName.toLowerCase();
    if (tag === "script" || tag === "style") return "";
  }
  return node.childNodes.map((child) => textOf(child)).join(" ");
}

function structuredName(raw: string): string | null {
  if (!raw.trim() || raw.length > 30_000) return null;
  try {
    const names: string[] = [];
    walkJson(JSON.parse(raw), names, 0, { visits: 0 });
    return names[0] ?? null;
  } catch {
    return null;
  }
}

function walkJson(value: unknown, names: string[], depth: number, state: { visits: number }) {
  if (names.length > 0 || depth > 8 || state.visits > 2000) return;
  state.visits += 1;
  if (Array.isArray(value)) {
    for (const item of value) walkJson(item, names, depth + 1, state);
    return;
  }
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  const types = typeNames(record["@type"]);
  if (types.some((type) => type === "website" || type === "organization") && typeof record.name === "string") {
    names.push(record.name);
    return;
  }
  for (const nested of Object.values(record)) {
    if (nested && typeof nested === "object") walkJson(nested, names, depth + 1, state);
  }
}

function typeNames(type: unknown): string[] {
  const values = Array.isArray(type) ? type : [type];
  return values
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.split(/[#/]/).pop()?.toLowerCase() ?? "");
}
