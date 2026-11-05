import type { ConnectorRequest, ConnectorResult, DnsResolver, PageConnector, ResolvedAddress } from "../../shared/seo-check/fetch-page.ts";

export function pageHtml(options: { title?: string; head?: string; body?: string } = {}) {
  const title = options.title ?? "Northline Example Bakery";
  const head = options.head ?? [
    '<meta name="description" content="Bread and cakes in the neighborhood.">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="robots" content="index, follow">',
    '<link rel="canonical" href="https://example.com/">',
  ].join("");
  const body = options.body ?? '<h1>Fresh bread</h1><img src="/loaf.jpg" alt="A loaf of bread"><p>We bake every morning for the neighborhood counter.</p>';
  return `<!doctype html><html><head><title>${title}</title>${head}</head><body>${body}</body></html>`;
}

export function htmlResult(html: string, status = 200, headers: Record<string, string> = {}): ConnectorResult {
  return {
    status,
    headers: { "content-type": "text/html; charset=utf-8", ...headers },
    body: new TextEncoder().encode(html),
    truncated: false,
  };
}

export function publicResolver(addresses: string[] | ((host: string, call: number) => string[]) = ["1.1.1.1"]) {
  const seen: string[] = [];
  const resolver: DnsResolver = {
    async lookup(hostname: string): Promise<ResolvedAddress[]> {
      seen.push(hostname);
      const list = typeof addresses === "function" ? addresses(hostname, seen.length) : addresses;
      return list.map((address) => ({
        address,
        family: (address.includes(":") ? 6 : 4) as 4 | 6,
      }));
    },
  };
  return { resolver, seen };
}

export function scriptedConnector(
  handler: (input: ConnectorRequest, call: number) => Promise<ConnectorResult> | ConnectorResult,
) {
  const calls: { url: string; pinned: string; family: number; headers: Record<string, string> }[] = [];
  const connector: PageConnector = {
    async request(input) {
      calls.push({
        url: input.target.href,
        pinned: input.pinnedAddress,
        family: input.pinnedFamily,
        headers: input.headers,
      });
      return handler(input, calls.length);
    },
  };
  return { connector, calls };
}

export function clock(start: number) {
  let current = start;
  return {
    now: () => current,
    advance(ms: number) {
      current += ms;
    },
  };
}

export function requestId(n: number) {
  return `req_${String(n).padStart(8, "0")}`;
}

export function assertNoScore(value: unknown) {
  if (Array.isArray(value)) {
    for (const item of value) assertNoScore(item);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value)) {
    if (/score|ranking|traffic|revenue/i.test(key)) {
      throw new Error(`unexpected field ${key}`);
    }
    assertNoScore(nested);
  }
}
