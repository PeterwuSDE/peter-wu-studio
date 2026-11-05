import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { register } from "node:module";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

register(new URL("./ts-hook.mjs", import.meta.url).href, import.meta.url);

const { interpretSeoCheck } = await import("../app/seo/read-response.ts");
const { seoCheckCopy } = await import("../app/seo/copy.ts");
const { createSeoCheckRequestId, postSeoCheck } = await import("../app/seo/check-client.ts");
const { NO_PRIORITY_FINDINGS_MESSAGE, SEO_CHECK_PATH, SEO_CHECK_REQUEST_ID_PATTERN } = await import("../shared/seo-check/contract.ts");
const { createSeoCheckDouble, FIXTURE_MARKER } = await import("../app/seo/test-double.ts");
const { deliverSeoInquiry, inquiryMailto, parseStoredInquiry, SEO_INQUIRY_ENTRY_ID } = await import("../app/seo/inquiry.ts");
const { createHomepageCheck, localeFromKey } = await import("../app/seo/model.ts");
const { HomepageCheck } = await import("../app/seo/HomepageCheck.tsx");

const request = { url: "https://example.com/shop/", locale: "en", requestId: "req_test" };

function reportBody(overrides = {}) {
  return {
    scanId: "scan_test_ref",
    status: "completed",
    code: "ok",
    message: "The homepage check finished.",
    scope: "This check reads one public homepage.",
    requestId: "req_test",
    normalizedUrl: "https://example.com/shop/",
    finalUrl: "https://example.com/shop/",
    locale: "en",
    checkedAt: "2026-10-29T15:04:00.000Z",
    ruleVersion: "homepage-2026-10-29.1",
    cached: false,
    cacheExpiresAt: null,
    coverage: { completed: 8, unknown: 0, notApplicable: 0, total: 8 },
    findings: [],
    rules: [{ ruleId: "https", ruleVersion: "homepage-2026-10-29.1", status: "pass", signal: "https", evidence: "https", summary: "Final address uses HTTPS." }],
    siteName: "Example Shop",
    javascriptNotExecuted: false,
    redirectCount: 0,
    httpStatus: 200,
    retryAfterSeconds: null,
    ...overrides,
  };
}

function finding(ruleId, evidence = `${FIXTURE_MARKER} ${ruleId}`) {
  return {
    ruleId,
    ruleVersion: "homepage-2026-10-29.1",
    url: "https://example.com/shop/",
    evidence,
    checkedAt: "2026-10-29T15:04:00.000Z",
    condition: "If you want this homepage to be publicly indexed.",
    reason: "The response included a signal worth confirming.",
    suggestions: ["Check this setting against the evidence from the response."],
    signal: "missing",
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
      siteName: "Example Shop",
      findings: [finding("indexability"), finding("description"), finding("title")],
      rules: [
        { ruleId: "https", ruleVersion: "homepage-2026-10-29.1", status: "pass", signal: "https", evidence: "https", summary: "Final address uses HTTPS." },
        { ruleId: "h1", ruleVersion: "homepage-2026-10-29.1", status: "unknown", signal: "unknown", evidence: "", summary: "Could not determine the main heading." },
        { ruleId: "image_alt", ruleVersion: "homepage-2026-10-29.1", status: "not_applicable", signal: "no_images", evidence: "", summary: "No images." },
        { ruleId: "title", ruleVersion: "homepage-2026-10-29.1", status: "fail", signal: "bad", evidence: "", summary: "This status is not in the contract." },
      ],
    }),
  }, "en");

  assert.equal(outcome.kind, "report");
  assert.equal(outcome.report.scanId, "scan_test_ref");
  assert.equal(outcome.report.checkedAt, "2026-10-29T15:04:00.000Z");
  assert.equal(outcome.report.cached, true);
  assert.equal(outcome.report.findings.length, 2);
  assert.deepEqual(outcome.report.findings.map((item) => item.ruleId), ["indexability", "description"]);
  assert.equal(outcome.report.rules.some((item) => item.status === "unknown"), true);
  assert.equal(outcome.report.normalizedUrl, "https://example.com/shop");
  assert.equal(outcome.report.finalUrl, "https://example.com/shop/");
});

test("does not turn an unreadable page or a broken payload into an SEO conclusion", () => {
  const restricted = interpretSeoCheck({
    httpStatus: 200,
    body: {
      status: "access_restricted",
      code: "access_restricted",
      message: "This page blocked the check.",
      locale: "en",
      cached: false,
      rules: [],
      findings: [finding("title")],
    },
  }, "en");
  assert.equal(restricted.kind, "blocked");
  assert.match(restricted.block.message, /blocked the check/);
  assert.equal(restricted.block.showContact, true);

  const broken = interpretSeoCheck({ httpStatus: 200, body: { status: "completed", findings: [finding("title")] } }, "en");
  assert.equal(broken.kind, "blocked");
  assert.match(broken.block.message, /could not be completed/i);

  const quota = interpretSeoCheck({ httpStatus: 429, body: null }, "en");
  assert.match(quota.block.message, /temporarily unavailable/);
  const invalid = interpretSeoCheck({
    httpStatus: 400,
    body: reportBody({ status: "invalid_target", code: "invalid_target", scanId: null, message: "Use a public http or https page address. No SEO result was created.", findings: [finding("title")] }),
  }, "en");
  assert.match(invalid.block.message, /No SEO result was created/);
  assert.equal(invalid.kind, "blocked");
});

test("posts the contract body to /api/seo-check and surfaces quota and transport failures", async () => {
  const original = globalThis.fetch;
  try {
    let captured;
    globalThis.fetch = async (url, init) => {
      captured = { url, init };
      return new Response(JSON.stringify(reportBody({
        status: "rate_limited",
        code: "ip_rate_limit",
        scanId: null,
        locale: "zh",
        message: "当前暂时无法检查，请稍后再试。",
        requestId: "req_live",
      })), { status: 429 });
    };
    const transport = await postSeoCheck({ url: "https://example.com", locale: "zh", requestId: "req_live" });
    assert.equal(transport.httpStatus, 429);
    assert.equal(String(captured.url), SEO_CHECK_PATH);
    assert.equal(captured.init.method, "POST");
    assert.deepEqual(JSON.parse(captured.init.body), { url: "https://example.com", locale: "zh", requestId: "req_live" });
    assert.match(interpretSeoCheck(transport, "zh").block.message, /暂时无法检查/);

    globalThis.fetch = async () => {
      throw new Error("offline");
    };
    const failed = await postSeoCheck(request);
    assert.deepEqual(failed, { httpStatus: null, body: null });
    assert.match(interpretSeoCheck(failed, "en").block.message, /could not be completed/i);
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
    return Promise.resolve({ httpStatus: 200, body: reportBody({ scanId: "scan_retry_ref" }) });
  };
  const checker = controller(client);
  const pending = checker.submit("https://example.com/keep");
  const ignored = checker.submit("https://example.com/other");
  assert.equal(calls, 1);
  assert.equal(checker.getSnapshot().phase, "checking");
  assert.equal(checker.getSnapshot().url, "https://example.com/keep");
  const checking = renderToStaticMarkup(createElement(HomepageCheck, { controller: checker }));
  assert.match(checking, /Checking the page you submitted/);
  release({ httpStatus: 200, body: reportBody({ status: "unavailable", code: "network_error", scanId: null, message: "The page could not be read just now. You can try again.", findings: [], rules: [] }) });
  await pending;
  await ignored;
  assert.equal(checker.getSnapshot().phase, "blocked");
  assert.match(checker.getSnapshot().block.message, /could not be read/i);
  assert.equal(checker.getSnapshot().url, "https://example.com/keep");
  await checker.retry();
  assert.equal(calls, 2);
  assert.equal(checker.getSnapshot().phase, "ready");
  assert.equal(checker.getSnapshot().url, "https://example.com/keep");
  assert.equal(checker.getSnapshot().report.scanId, "scan_retry_ref");
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
  second({ httpStatus: 200, body: reportBody({ scanId: "scan_second_id", locale: "zh", requestId: "req_second" }) });
  await secondRun;
  first({ httpStatus: 200, body: reportBody({ scanId: "scan_first_idx", requestId: "req_firstx" }) });
  await firstRun;
  assert.equal(checker.getSnapshot().report.scanId, "scan_second_id");
  assert.equal(checker.getSnapshot().locale, "zh");
});

test("renders success, partial, cached, empty, javascript, oversized, and blocked states from the double", async () => {
  const cases = [
    ["complete", /Fixture Shop/, /scan_complete_fixture/, /Address after redirects/, /FIXTURE_EVIDENCE_DO_NOT_SHIP indexability/, /FIXTURE_EVIDENCE_DO_NOT_SHIP description/],
    ["partial", /Only part of the check could be completed/, /Could not judge/, /Not applicable/, /data-seo-status="partial"/],
    ["cached", /29 Oct 2026, 15:04 UTC/, /not scanned again just now/, /data-seo-cached="true"/],
    ["empty", /No priority issues were found in the basic checks completed this time/],
    ["javascript", /did not run JavaScript/, /Could not judge/],
    ["oversized", /not scored as a complete page/, /Could not judge/],
    ["restricted", /This page blocked the check/],
    ["quota", /temporarily unavailable/, /Email Northline/],
    ["rejected", /No SEO result was created/],
  ];

  for (const [name, ...patterns] of cases) {
    const double = createSeoCheckDouble(() => name);
    const checker = controller(double);
    await checker.submit(`https://fixture.test/${name}`);
    const html = renderToStaticMarkup(createElement(HomepageCheck, { controller: checker }));
    for (const pattern of patterns) assert.match(html, pattern, name);
    assert.doesNotMatch(html, /weighted SEO score|full report is ready|ranking prediction|竞品名单|完整版已完成/);
    if (name === "complete") {
      assert.doesNotMatch(html, /FIXTURE_EVIDENCE_DO_NOT_SHIP title/);
      assert.match(html, /data-seo-item-status="review"/);
      assert.doesNotMatch(html, /data-seo-finding="canonical"/);
      assert.equal((html.match(/data-seo-finding=/g) ?? []).length, 2);
    }
    if (name === "partial") {
      assert.match(html, /data-seo-item-status="review"/);
      assert.doesNotMatch(html, /data-seo-finding="canonical"/);
    }
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
  assert.match(html, new RegExp(NO_PRIORITY_FINDINGS_MESSAGE.zh));
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
  assert.equal(seen[0].scanId, "scan_complete_fixture");
  assert.equal(seen[0].normalizedUrl, "https://fixture.test/shop");
  assert.equal(seen[0].finalUrl, "https://fixture.test/shop/");
  assert.equal(seen[0].ruleVersion, "homepage-2026-10-29.1");
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
  assert.match(checker.getSnapshot().block.message, /No SEO result was created/);
  checker.setUrl("https://example.com/shop/");
  await checker.submit();
  assert.equal(checker.getSnapshot().phase, "ready");
  await checker.setLocale("zh");
  assert.equal(calls, 2);
  assert.equal(checker.getSnapshot().phase, "ready");
  assert.equal(checker.getSnapshot().notice, "locale_refresh_failed");
  assert.equal(checker.getSnapshot().report.scanId, "scan_test_ref");
  assert.equal(checker.getSnapshot().url, "https://example.com/shop/");
});

test("inquiry delivery stores the scan reference before revealing the entry", () => {
  const events = [];
  const outcome = deliverSeoInquiry({
    scanId: "scan_test_ref",
    requestId: "req_test",
    normalizedUrl: "https://example.com/shop/",
    finalUrl: "https://example.com/shop/",
    locale: "en",
    checkedAt: "2026-10-29T15:04:00.000Z",
    ruleVersion: "2026-10-29.1",
    cached: false,
    status: "completed",
    code: "ok",
  }, {
    remember(context) { events.push(["remember", context.scanId]); },
    reveal(context) { events.push(["reveal", context.scanId]); },
    notify() { events.push(["notify"]); return false; },
  });
  assert.equal(outcome, "unhandled");
  assert.deepEqual(events.map((event) => event[0]), ["remember", "reveal", "notify"]);
  const mailto = inquiryMailto(events.length ? {
    scanId: "scan_test_ref",
    requestId: "req_test",
    normalizedUrl: "https://example.com/shop/",
    finalUrl: "https://example.com/shop/",
    locale: "en",
    checkedAt: "2026-10-29T15:04:00.000Z",
    ruleVersion: "2026-10-29.1",
    cached: false,
    status: "completed",
    code: "ok",
  } : null);
  assert.match(mailto, /^mailto:northlinestudio425@gmail.com\?/);
  assert.match(decodeURIComponent(mailto), /scan_test_ref/);
  assert.equal(parseStoredInquiry("{"), null);
  assert.equal(parseStoredInquiry(JSON.stringify({ scanId: "short" })), null);
  assert.equal(SEO_CHECK_REQUEST_ID_PATTERN.test(createSeoCheckRequestId()), true);
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
    assert.doesNotMatch(source, /test-double|createSeoCheckDouble|FIXTURE_EVIDENCE_DO_NOT_SHIP|app\/seo\/contract/);
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
