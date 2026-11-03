import { postSeoCheck, type SeoCheckClient } from "./check-client";
import { interpretSeoCheck, type SeoCheckBlock, type SeoCheckLocale, type SeoCheckReport } from "./contract";
import { requestSeoInquiry, type SeoInquiryContext } from "./inquiry";

export type CheckPhase = "idle" | "checking" | "ready" | "blocked";
export type CheckFocus = "result" | "error" | "inquiry" | null;
export type InquiryView = "closed" | "fallback" | "handled";

export type CheckSnapshot = {
  locale: SeoCheckLocale;
  url: string;
  phase: CheckPhase;
  report: SeoCheckReport | null;
  block: SeoCheckBlock | null;
  notice: "locale_refresh_failed" | null;
  inquiry: InquiryView;
  focus: CheckFocus;
  focusToken: number;
};

export type InquiryPort = {
  request(context: SeoInquiryContext): "handled" | "unhandled";
};

export type HomepageCheckController = {
  submit(raw?: string): Promise<void>;
  retry(): Promise<void>;
  setUrl(url: string): void;
  setLocale(locale: SeoCheckLocale): Promise<void>;
  openInquiry(): "handled" | "unhandled";
  getSnapshot(): CheckSnapshot;
  subscribe(listener: () => void): () => void;
  dispose(): void;
};

const initialSnapshot: CheckSnapshot = {
  locale: "en",
  url: "",
  phase: "idle",
  report: null,
  block: null,
  notice: null,
  inquiry: "closed",
  focus: null,
  focusToken: 0,
};

export function createHomepageCheck(options: {
  client?: SeoCheckClient;
  requestId?: () => string;
  inquiry?: InquiryPort;
} = {}): HomepageCheckController {
  const client = options.client ?? postSeoCheck;
  const requestId = options.requestId ?? (() => `req_${crypto.randomUUID()}`);
  const inquiry = options.inquiry ?? { request: requestSeoInquiry };
  let generation = 0;
  let active: AbortController | null = null;
  let snapshot = initialSnapshot;
  const listeners = new Set<() => void>();

  function publish(next: CheckSnapshot) {
    snapshot = next;
    for (const listener of listeners) listener();
  }

  async function run(url: string, mode: "submit" | "refresh") {
    const previous = snapshot.report;
    const token = ++generation;
    active?.abort();
    const controller = new AbortController();
    active = controller;
    const id = requestId();
    const locale = snapshot.locale;
    publish({
      ...snapshot,
      phase: "checking",
      url,
      report: null,
      block: null,
      notice: null,
      focus: null,
      inquiry: mode === "submit" ? "closed" : snapshot.inquiry,
    });

    let transport;
    try {
      transport = await client({ url, locale, requestId: id }, controller.signal);
    } catch (error) {
      if (token !== generation || isAbortError(error)) return;
      transport = { httpStatus: null, body: null };
    }
    if (token !== generation) return;

    const outcome = interpretSeoCheck(transport, { url, locale, requestId: id });
    if (outcome.kind === "report") {
      publish({
        ...snapshot,
        phase: "ready",
        url,
        locale,
        report: outcome.report,
        block: null,
        notice: null,
        focus: "result",
        focusToken: snapshot.focusToken + 1,
        inquiry: mode === "submit" ? "closed" : snapshot.inquiry,
      });
      return;
    }

    if (mode === "refresh" && previous) {
      publish({
        ...snapshot,
        phase: "ready",
        url,
        report: previous,
        block: null,
        notice: "locale_refresh_failed",
        focus: "error",
        focusToken: snapshot.focusToken + 1,
      });
      return;
    }

    publish({
      ...snapshot,
      phase: "blocked",
      url,
      report: null,
      block: outcome.block,
      notice: null,
      inquiry: "closed",
      focus: "error",
      focusToken: snapshot.focusToken + 1,
    });
  }

  return {
    submit(raw) {
      if (snapshot.phase === "checking") return Promise.resolve();
      const source = raw ?? snapshot.url;
      const url = source.trim();
      if (!url) {
        publish({
          ...snapshot,
          url: source,
          phase: "blocked",
          report: null,
          block: { reason: "invalid_url", requestId: "" },
          notice: null,
          inquiry: "closed",
          focus: "error",
          focusToken: snapshot.focusToken + 1,
        });
        return Promise.resolve();
      }
      return run(url, "submit");
    },
    retry() {
      if (snapshot.phase === "checking") return Promise.resolve();
      const url = snapshot.url.trim();
      if (!url) return this.submit();
      return run(url, snapshot.report ? "refresh" : "submit");
    },
    setUrl(url) {
      if (snapshot.phase === "checking" || url === snapshot.url) return;
      publish({ ...snapshot, url });
    },
    setLocale(locale) {
      if ((locale !== "en" && locale !== "zh") || locale === snapshot.locale) return Promise.resolve();
      const next = { ...snapshot, locale };
      publish(next);
      if ((next.phase === "checking" || next.phase === "ready") && next.url.trim()) {
        return run(next.url.trim(), "refresh");
      }
      return Promise.resolve();
    },
    openInquiry() {
      if (snapshot.phase !== "ready" || !snapshot.report) return "unhandled";
      const context = toInquiry(snapshot.report);
      let outcome: "handled" | "unhandled" = "unhandled";
      try {
        outcome = inquiry.request(context);
      } catch {
        outcome = "unhandled";
      }
      publish({
        ...snapshot,
        inquiry: outcome === "handled" ? "handled" : "fallback",
        focus: "inquiry",
        focusToken: snapshot.focusToken + 1,
      });
      return outcome;
    },
    getSnapshot() {
      return snapshot;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      generation += 1;
      active?.abort();
      listeners.clear();
    },
  };
}

export function localeFromKey(current: SeoCheckLocale, key: string): SeoCheckLocale | null {
  if (key === "Home") return "en";
  if (key === "End") return "zh";
  if (key === "ArrowRight" || key === "ArrowDown") return current === "en" ? "zh" : "en";
  if (key === "ArrowLeft" || key === "ArrowUp") return current === "zh" ? "en" : "zh";
  return null;
}

function toInquiry(report: SeoCheckReport): SeoInquiryContext {
  return {
    scanRef: report.scanRef,
    requestId: report.requestId,
    normalizedUrl: report.normalizedUrl,
    finalUrl: report.finalUrl,
    locale: report.locale,
    checkedAt: report.checkedAt,
    ruleVersion: report.ruleVersion,
    cached: report.cached,
    status: report.status,
  };
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
