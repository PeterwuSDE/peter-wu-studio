import { resolve4, resolve6 } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import type { LookupOptions } from "node:dns";
import { isPublicIp, stripIpHost } from "./network-policy.ts";
import type { ConnectorRequest, ConnectorResult, DnsResolver, PageConnector, ResolvedAddress } from "./fetch-page.ts";

const httpAgent = new http.Agent({ keepAlive: false });
const httpsAgent = new https.Agent({ keepAlive: false });

type LookupCallback = (err: NodeJS.ErrnoException | null, address: string | { address: string; family: number }[], family?: number) => void;

export function createPinnedLookup(expectedHost: string, address: string, family: 4 | 6) {
  const expected = stripIpHost(expectedHost);
  return function pinnedLookup(hostname: string, options: LookupOptions | LookupCallback, callback?: LookupCallback) {
    const cb = typeof options === "function" ? options : callback;
    const opts = typeof options === "function" || !options ? {} : options;
    if (!cb) return;
    if (stripIpHost(hostname) !== expected) {
      cb(Object.assign(new Error("Refusing to resolve an unexpected host"), { code: "EBADHOST" }), "", 4);
      return;
    }
    if (!isPublicIp(address)) {
      cb(Object.assign(new Error("Refusing to connect to a non-public address"), { code: "EBADHOST" }), "", 4);
      return;
    }
    if (opts.all) cb(null, [{ address, family }]);
    else cb(null, address, family);
  };
}

async function records(kind: 4 | 6, hostname: string): Promise<string[] | "error"> {
  try {
    return kind === 4 ? await resolve4(hostname) : await resolve6(hostname);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "ENOTFOUND" || code === "ENODATA" || code === "ENOENT" || code === "ENOTIMP") return [];
    return "error";
  }
}

export function createNodeResolver(): DnsResolver {
  return {
    async lookup(hostname: string): Promise<ResolvedAddress[]> {
      const [v4, v6] = await Promise.all([records(4, hostname), records(6, hostname)]);
      if (v4 === "error" || v6 === "error") {
        throw Object.assign(new Error("DNS lookup failed"), { code: "DNS" });
      }
      const addresses: ResolvedAddress[] = [
        ...v4.map((address) => ({ address, family: 4 as const })),
        ...v6.map((address) => ({ address, family: 6 as const })),
      ];
      if (addresses.length === 0) throw Object.assign(new Error("DNS lookup returned no addresses"), { code: "DNS" });
      return addresses;
    },
  };
}

export function createNodeConnector(): PageConnector {
  return {
    request(input) {
      return nodeRequest(input);
    },
  };
}

function nodeRequest(input: ConnectorRequest): Promise<ConnectorResult> {
  if (!isPublicIp(input.pinnedAddress)) {
    return Promise.reject(Object.assign(new Error("Refusing to connect to a non-public address"), { code: "EBADHOST" }));
  }
  const target = input.target;
  const secure = target.protocol === "https:";
  const mod = secure ? https : http;
  const headers = { ...input.headers };
  delete headers.cookie;
  delete headers.authorization;
  delete headers.Cookie;
  delete headers.Authorization;

  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    const succeed = (result: ConnectorResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    const req = mod.request(
      {
        protocol: target.protocol,
        hostname: stripIpHost(target.hostname),
        port: target.port || (secure ? "443" : "80"),
        method: "GET",
        path: `${target.pathname || "/"}${target.search}`,
        headers,
        agent: secure ? httpsAgent : httpAgent,
        servername: secure ? stripIpHost(target.hostname) : undefined,
        autoSelectFamily: false,
        lookup: createPinnedLookup(target.hostname, input.pinnedAddress, input.pinnedFamily),
        signal: input.signal,
      } as http.RequestOptions,
      (res) => {
        const headersOut = rawHeadersToMap(res.rawHeaders);
        const chunks: Buffer[] = [];
        let received = 0;
        let truncated = false;
        res.on("data", (chunk: Buffer) => {
          if (truncated) return;
          received += chunk.length;
          if (received > input.maxRawBytes) {
            truncated = true;
            res.destroy();
            succeed({ status: res.statusCode ?? 0, headers: headersOut, body: new Uint8Array(), truncated: true });
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => {
          succeed({
            status: res.statusCode ?? 0,
            headers: headersOut,
            body: Buffer.concat(chunks),
            truncated,
          });
        });
        res.on("error", (error) => {
          if (truncated) {
            succeed({ status: res.statusCode ?? 0, headers: headersOut, body: new Uint8Array(), truncated: true });
            return;
          }
          fail(error);
        });
      },
    );
    req.on("error", fail);
    req.end();
  });
}

function rawHeadersToMap(raw: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (let i = 0; i < raw.length; i += 2) {
    const key = raw[i]?.toLowerCase() ?? "";
    if (!key || key === "set-cookie" || key === "cookie") continue;
    const value = raw[i + 1] ?? "";
    map[key] = map[key] ? `${map[key]}, ${value}` : value;
  }
  return map;
}

let resolver: DnsResolver | undefined;
let connector: PageConnector | undefined;

export function getNodeResolver(): DnsResolver {
  resolver ??= createNodeResolver();
  return resolver;
}

export function getNodeConnector(): PageConnector {
  connector ??= createNodeConnector();
  return connector;
}
