import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { register } from "node:module";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

register(new URL("./ts-hook.mjs", import.meta.url).href, import.meta.url);

const { interpretSeoCheck } = await import("../app/seo/contract.ts");
const { seoCheckCopy } = await import("../app/seo/copy.ts");
const { postSeoCheck } = await import("../app/seo/check-client.ts");
const { createSeoCheckDouble, FIXTURE_MARKER } = await import("../app/seo/test-double.ts");
const { deliverSeoInquiry, inquiryMailto, parseStoredInquiry, SEO_INQUIRY_ENTRY_ID } = await import("../app/seo/inquiry.ts");
const { createHomepageCheck, localeFromKey } = await import("../app/seo/model.ts");
const { HomepageCheck } = await import("../app/seo/HomepageCheck.tsx");

const request = { url: "https://example.com/shop/", locale: "en", requestId: "req_test" };

function reportBody(overrides = {}) {
  return {
    status: "complete",
    scanRef: "scan_test_ref",
    requestId: "req_test",
    normalizedUrl: "https://example.com/shop/",
    finalUrl: "https://example.com/shop/",
    locale: "en",
    checkedAt: "2026-10-29T15:04:00.000Z",
    ruleVersion: "2026-10-29.1",
    cached: false,
    coverage: { completed: 8, unknown: 0, notApplicable: 0 },
    findings: [],
    items: [{ ruleId: "https", status: "pass", summary: "Final address uses HTTPS." }],
    ...overrides,
  };
}

function finding(ruleId, evidence = `${FIXTURE_MARKER} ${ruleId}`) {
  return {
    ruleId,
    ruleVersion: "2026-10-29.1",
    url: "https://example.com/shop/",
    evidence,
    checkedAt: "2026-10-29T15:04:00.000Z",
    condition: "If you want this homepage to be publicly indexed.",
    explanation: "The response included a signal worth confirming.",
    suggestions: ["Check this setting against the evidence from the response."],
  };
}

function controller(client, inquiry = { request: () => "unhandled" }, requestId = () => "req_test") {
  return createHomepageCheck({ client, inquiry, requestId });
}

test("parses a complete check and keeps the original time, urls, and at most two findings", () => {
  const outcome = interpretSeoCheck({
    httpStatus: 200,
    body: reportBody({
      cached: true,
      cacheExpiresAt: "2026-10-30T15:04:00.000Z",
      normalizedUrl: "https://example.com/shop",
      finalUrl: "https://example.com/shop/",
      displayName: "Example Shop",
      findings: [finding("indexing"), finding("description"), finding("title")],
      items: [
        { ruleId: "https", status: "pass", summary: "Final address uses HTTPS." },
        { ruleId: "h1", status: "unknown", summary: "Could not determine the main heading." },
        { ruleId: "image_alt", status: "not_applicable", summary: "No images." },
        { ruleId: "title", status: "fail", summary: "This status is not in the contract." },
      ],
    }),
  }, request);

  assert.equal(outcome.kind, "report");
  assert.equal(outcome.report.scanRef, "scan_test_ref");
  assert.equal(outcome.report.checkedAt, "2026-10-29T15:04:00.000Z");
  assert.equal(outcome.report.cached, true);
  assert.equal(outcome.report.findings.length, 2);
  assert.deepEqual(outcome.report.findings.map((item) => item.ruleId), ["indexing", "description"]);
  assert.equal(outcome.report.items.some((item) => item.status === "fail"), false);
  assert.equal(outcome.report.items.some((item) => item.status === "unknown"), true);
  assert.equal(outcome.report.normalizedUrl, "https://example.com/shop");
  assert.equal(outcome.report.finalUrl, "https://example.com/shop/");
});

test("does not turn an unreadable page or a broken payload into an SEO conclusion", () => {
  const restricted = interpretSeoCheck({
    httpStatus: 200,
    body: {
      status: "unreadable",
      reason: "access_restricted",
      requestId: "req_test",
      findings: [finding("title")],
    },
  }, request);
  assert.equal(restricted.kind, "blocked");
  assert.equal(restricted.block.reason, "access_restricted");

  const broken = interpretSeoCheck({ httpStatus: 200, body: { status: "complete", findings: [finding("title")] } }, request);
  assert.deepEqual(broken, { kind: "blocked", block: { reason: "service", requestId: "req_test" } });

  const quota = interpretSeoCheck({ httpStatus: 429, body: null }, request);
  assert.equal(quota.block.reason, "quota");
  const invalid = interpretSeoCheck({ httpStatus: 400, body: { status: "rejected", reason: "invalid_url" } }, request);
  assert.equal(invalid.block.reason, "invalid_url");
});

test("posts the contract body to /api/seo-check and surfaces quota and transport failures", async () => {
  const original = globalThis.fetch;
  try {
    let captured;
    globalThis.fetch = async (url, init) => {
      captured = { url, init };
      return new Response(JSON.stringify({ status: "unavailable", reason: "quota", requestId: "req_live" }), { status: 429 });
    };
    const transport = await postSeoCheck({ url: "https://example.com", locale: "zh", requestId: "req_live" });
    assert.equal(transport.httpStatus, 429);
    assert.equal(String(captured.url), "/api/seo-check");
    assert.equal(captured.init.method, "POST");
    assert.deepEqual(JSON.parse(captured.init.body), { url: "https://example.com", locale: "zh", requestId: "req_live" });
    assert.equal(interpretSeoCheck(transport, { url: "https://example.com", locale: "zh", requestId: "req_live" }).block.reason, "quota");

    globalThis.fetch = async () => {
      throw new Error("offline");
    };
    const failed = await postSeoCheck(request);
    assert.deepEqual(failed, { httpStatus: null, body: null });
    assert.equal(interpretSeoCheck(failed, request).block.reason, "service");
  } finally {
    globalThis.fetch = original;
  }
});

test("keeps one request in flight, retains the address, and retries without clearing it", async () => {
  let calls = 0;
  let release;
  const client = () => {
    calls += 1;
    if (calls === 1) return new Promise((resolve) => { release = resolve; });
    return Promise.resolve({ httpStatus: 200, body: reportBody({ scanRef: "scan_retry_ref" }) });
  };
  const checker = controller(client);
  const pending = checker.submit("https://example.com/keep");
  const ignored = checker.submit("https://example.com/other");
  assert.equal(calls, 1);
  assert.equal(checker.getSnapshot().phase, "checking");
  assert.equal(checker.getSnapshot().url, "https://example.com/keep");
  const checking = renderToStaticMarkup(createElement(HomepageCheck, { controller: checker }));
  assert.match(checking, /Checking the page you submitted/);
  release({ httpStatus: 504, body: { status: "unreadable", reason: "network", requestId: "req_test" } });
  await pending;
  await ignored;
  assert.equal(checker.getSnapshot().phase, "blocked");
  assert.equal(checker.getSnapshot().block.reason, "network");
  assert.equal(checker.getSnapshot().url, "https://example.com/keep");
  await checker.retry();
  assert.equal(calls, 2);
  assert.equal(checker.getSnapshot().phase, "ready");
  assert.equal(checker.getSnapshot().url, "https://example.com/keep");
  assert.equal(checker.getSnapshot().report.scanRef, "scan_retry_ref");
});

test("ignores a stale response when the language changes mid-check", async () => {
  const requests = [];
  let first;
  let second;
  const client = (body) => {
    requests.push(body);
    return new Promise((resolve) => {
      if (requests.length === 1) first = resolve;
      else second = resolve;
    });
  };
  let id = 0;
  const checker = controller(client, undefined, () => `req_${++id}`);
  const firstRun = checker.submit("https://example.com/a");
  const secondRun = checker.setLocale("zh");
  assert.equal(requests.length, 2);
  assert.equal(requests[1].locale, "zh");
  assert.notEqual(requests[0].requestId, requests[1].requestId);
  second({ httpStatus: 200, body: reportBody({ scanRef: "scan_second", locale: "zh", requestId: "req_2" }) });
  await secondRun;
  first({ httpStatus: 200, body: reportBody({ scanRef: "scan_first", requestId: "req_1" }) });
  await firstRun;
  assert.equal(checker.getSnapshot().report.scanRef, "scan_second");
  assert.equal(checker.getSnapshot().locale, "zh");
});

test("renders success, partial, cached, empty, javascript, oversized, and blocked states from the double", async () => {
  const cases = [
    ["complete", /Fixture Shop/, /scan_complete_fixture/, /Address after redirects/, /FIXTURE_EVIDENCE_DO_NOT_SHIP indexing/, /FIXTURE_EVIDENCE_DO_NOT_SHIP description/],
    ["partial", /Part of this check finished/, /Could not determine/, /Not applicable/, /data-seo-status="partial"/],
    ["cached", /29 Oct 2026, 15:04 UTC/, /not scanned again just now/, /data-seo-cached="true"/],
    ["empty", /The basic checks completed this time did not find an issue that needs a priority note/],
    ["javascript", /did not run JavaScript/, /Could not determine/],
    ["oversized", /up to its size limit/, /Could not determine/],
    ["restricted", /This page limited access for this check/],
    ["quota", /temporarily unavailable/, /Email Northline/],
    ["rejected", /Enter a public web address/],
  ];

  for (const [name, ...patterns] of cases) {
    const double = createSeoCheckDouble(() => name);
    const checker = controller(double);
    await checker.submit(`https://fixture.test/${name}`);
    const html = renderToStaticMarkup(createElement(HomepageCheck, { controller: checker }));
    for (const pattern of patterns) assert.match(html, pattern, name);
    assert.doesNotMatch(html, /SEO score|full report is ready|ranking prediction|竞品名单|完整版已完成/);
    if (name === "complete") {
      assert.doesNotMatch(html, /FIXTURE_EVIDENCE_DO_NOT_SHIP title/);
      assert.doesNotMatch(html, /A third review signal/);
      assert.equal((html.match(/data-seo-finding=/g) ?? []).length, 2);
    }
    if (name === "partial") assert.doesNotMatch(html, /not one of the two findings/);
    if (name === "quota" || name === "restricted" || name === "rejected") {
      assert.doesNotMatch(html, /data-seo-finding=/);
      assert.doesNotMatch(html, /data-seo-inquiry-trigger=/);
    }
  }
});

test("shows the Chinese templates and keeps unknown items out of the failure language", async () => {
  const checker = controller(createSeoCheckDouble(() => "empty"), undefined, () => "req_zh");
  await checker.setLocale("zh");
  await checker.submit("https://fixture.test/empty");
  const html = renderToStaticMarkup(createElement(HomepageCheck, { controller: checker }));
  assert.match(html, /本次已完成的基础检查中，未发现需要优先提示的问题。其他页面、搜索表现和未检测项目仍需另行分析。/);
  assert.match(html, /免费检查首页/);
  assert.doesNotMatch(html, /失败/);
});

test("escapes evidence instead of rendering it as HTML", async () => {
  const client = async () => ({
    httpStatus: 200,
    body: reportBody({ findings: [finding("title", "<script>alert(1)</script>")] }),
  });
  const checker = controller(client);
  await checker.submit("https://example.com");
  const html = renderToStaticMarkup(createElement(HomepageCheck, { controller: checker }));
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
});

test("opens the inquiry entry with the scan reference and skips the fallback when a handler is registered", async () => {
  const seen = [];
  const unhandled = controller(createSeoCheckDouble(() => "complete"), {
    request(context) {
      seen.push(context);
      return "unhandled";
    },
  });
  await unhandled.submit("https://fixture.test/complete");
  assert.equal(unhandled.openInquiry(), "unhandled");
  assert.equal(seen[0].scanRef, "scan_complete_fixture");
  assert.equal(seen[0].normalizedUrl, "https://fixture.test/shop");
  assert.equal(seen[0].finalUrl, "https://fixture.test/shop/");
  assert.equal(seen[0].ruleVersion, "2026-10-29.1");
  assert.equal(seen[0].checkedAt, "2026-10-29T15:04:00.000Z");
  const fallback = renderToStaticMarkup(createElement(HomepageCheck, { controller: unhandled }));
  assert.match(fallback, /scan_complete_fixture/);
  assert.match(fallback, /Contact Northline about this check/);
  assert.match(fallback, /northlinestudio425@gmail.com/);
  assert.match(fallback, new RegExp(`id="${SEO_INQUIRY_ENTRY_ID}"`));

  const handledPort = { request: () => "handled" };
  const handled = controller(createSeoCheckDouble(() => "complete"), handledPort);
  await handled.submit("https://fixture.test/complete");
  assert.equal(handled.openInquiry(), "handled");
  const html = renderToStaticMarkup(createElement(HomepageCheck, { controller: handled }));
  assert.equal(handled.getSnapshot().inquiry, "handled");
  assert.doesNotMatch(html, /Contact Northline about this check/);
  assert.match(html, /data-seo-inquiry-state="handled"/);
});

test("an empty address does not call the API, and a failed language refresh keeps the result", async () => {
  let calls = 0;
  const client = async (body) => {
    calls += 1;
    if (calls === 1) return { httpStatus: 200, body: reportBody() };
    return { httpStatus: 504, body: { status: "unreadable", reason: "network", requestId: body.requestId } };
  };
  const checker = controller(client);
  await checker.submit("   ");
  assert.equal(calls, 0);
  assert.equal(checker.getSnapshot().block.reason, "invalid_url");
  checker.setUrl("https://example.com/shop/");
  await checker.submit();
  assert.equal(checker.getSnapshot().phase, "ready");
  await checker.setLocale("zh");
  assert.equal(calls, 2);
  assert.equal(checker.getSnapshot().phase, "ready");
  assert.equal(checker.getSnapshot().notice, "locale_refresh_failed");
  assert.equal(checker.getSnapshot().report.scanRef, "scan_test_ref");
  assert.equal(checker.getSnapshot().url, "https://example.com/shop/");
});

test("inquiry delivery stores the scan reference before revealing the entry", () => {
  const events = [];
  const outcome = deliverSeoInquiry({
    scanRef: "scan_test_ref",
    requestId: "req_test",
    normalizedUrl: "https://example.com/shop/",
    finalUrl: "https://example.com/shop/",
    locale: "en",
    checkedAt: "2026-10-29T15:04:00.000Z",
    ruleVersion: "2026-10-29.1",
    cached: false,
    status: "complete",
  }, {
    remember(context) { events.push(["remember", context.scanRef]); },
    reveal(context) { events.push(["reveal", context.scanRef]); },
    notify() { events.push(["notify"]); return false; },
  });
  assert.equal(outcome, "unhandled");
  assert.deepEqual(events.map((event) => event[0]), ["remember", "reveal", "notify"]);
  const mailto = inquiryMailto(events.length ? {
    scanRef: "scan_test_ref",
    requestId: "req_test",
    normalizedUrl: "https://example.com/shop/",
    finalUrl: "https://example.com/shop/",
    locale: "en",
    checkedAt: "2026-10-29T15:04:00.000Z",
    ruleVersion: "2026-10-29.1",
    cached: false,
    status: "complete",
  } : null);
  assert.match(mailto, /^mailto:northlinestudio425@gmail.com\?/);
  assert.match(decodeURIComponent(mailto), /scan_test_ref/);
  assert.equal(parseStoredInquiry("{"), null);
  assert.equal(parseStoredInquiry(JSON.stringify({ scanRef: "short" })), null);
});

test("language keys move between English and Chinese", () => {
  assert.equal(localeFromKey("en", "ArrowRight"), "zh");
  assert.equal(localeFromKey("zh", "ArrowLeft"), "en");
  assert.equal(localeFromKey("zh", "Home"), "en");
  assert.equal(localeFromKey("en", "End"), "zh");
  assert.equal(localeFromKey("en", "Enter"), null);
});

test("fixed copy does not promise a score, ranking, or a finished full report", () => {
  const text = JSON.stringify(seoCheckCopy);
  assert.doesNotMatch(text, /SEO score|全站 SEO 分|ranking prediction|收入损失|竞品名单|完整版已完成|AI 提及/);
  assert.match(text, /本次已完成的基础检查中，未发现需要优先提示的问题/);
  assert.match(text, /以上为深入分析的交付示例。尚未针对你的网站运行；确认需求后启动。/);
  assert.match(text, /让 Northline 帮我进一步分析/);
  assert.match(text, /正在检查你提交的页面…/);
});

test("the live page does not import the fixture double", async () => {
  const page = await readFile(new URL("../app/seo/page.tsx", import.meta.url), "utf8");
  const view = await readFile(new URL("../app/seo/HomepageCheck.tsx", import.meta.url), "utf8");
  const model = await readFile(new URL("../app/seo/model.ts", import.meta.url), "utf8");
  const client = await readFile(new URL("../app/seo/check-client.ts", import.meta.url), "utf8");
  for (const source of [page, view, model, client]) {
    assert.doesNotMatch(source, /test-double|createSeoCheckDouble|FIXTURE_EVIDENCE_DO_NOT_SHIP/);
  }
  assert.match(page, /<HomepageCheck \/>/);
  assert.match(client, /SEO_CHECK_PATH/);
});

test("the idle check renders an address field and no fixture report", () => {
  const html = renderToStaticMarkup(createElement(HomepageCheck));
  assert.match(html, /id="seo-check-form"/);
  assert.match(html, /for="seo-check-url"/);
  assert.match(html, /Check this homepage for free/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /role="radiogroup"/);
  assert.doesNotMatch(html, /FIXTURE_EVIDENCE_DO_NOT_SHIP|scan_complete_fixture|data-seo-finding=/);
});
