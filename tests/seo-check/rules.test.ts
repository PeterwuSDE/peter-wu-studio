import assert from "node:assert/strict";
import test from "node:test";
import { RULE_SIGNALS, PRIORITY_FINDING_SIGNALS, type RuleFact, type RuleId } from "../../shared/seo-check/contract.ts";
import { evaluatePage, isPlaceholderTitle } from "../../shared/seo-check/evaluate.ts";
import type { PageFetchResult } from "../../shared/seo-check/fetch-page.ts";
import { describeRule } from "../../shared/seo-check/messages.ts";
import { pageHtml } from "./helpers.ts";

function htmlFetch(html: string, url = "https://example.com/", headers: Record<string, string> = {}): Extract<PageFetchResult, { type: "document" }> {
  return {
    type: "document",
    kind: "html",
    finalUrl: url,
    redirectCount: 0,
    httpStatus: 200,
    headers,
    html,
    contentType: "text/html",
  };
}

function evaluate(html: string, url = "https://example.com/", headers: Record<string, string> = {}) {
  return evaluatePage({ normalizedUrl: url, fetch: htmlFetch(html, url, headers) });
}

function rule(result: ReturnType<typeof evaluate>, id: RuleId) {
  const found = result.rules.find((item) => item.ruleId === id);
  assert.ok(found, id);
  return found;
}

test("a complete homepage passes every basic rule and invents no findings", () => {
  const result = evaluate(pageHtml());
  assert.equal(result.status, "completed");
  assert.equal(result.code, "no_priority_findings");
  assert.deepEqual(result.findingRuleIds, []);
  assert.equal(result.javascriptNotExecuted, false);
  assert.equal(result.siteName, "Northline Example Bakery");
  for (const item of result.rules) assert.equal(item.status, "pass", item.ruleId);
});

test("a long title is not treated as a problem", () => {
  const title = "Neighborhood bakery opening hours and seasonal cakes today in town";
  assert.equal(title.length > 60, true);
  assert.equal(isPlaceholderTitle(title), false);
  const result = evaluate(pageHtml({ title }));
  assert.equal(rule(result, "title").signal, "present");
  assert.equal(result.findingRuleIds.includes("title"), false);
});

test("placeholder titles, missing descriptions, and extra h1s are confirmation signals", () => {
  const result = evaluate(pageHtml({
    title: "React App",
    head: '<meta name="viewport" content="width=device-width, initial-scale=1"><link rel="canonical" href="https://example.com/">',
    body: "<h1>One</h1><h1>Two</h1><p>This page has enough visible text to show that the headings were really in the HTML response we fetched.</p>",
  }));
  assert.equal(rule(result, "title").signal, "placeholder");
  assert.equal(rule(result, "description").signal, "missing");
  assert.equal(rule(result, "h1").signal, "multiple");
  assert.equal(rule(result, "h1").count, 2);
  assert.ok(result.findingRuleIds.includes("title"));
  assert.ok(result.findingRuleIds.includes("description"));
  assert.equal(result.findingRuleIds.includes("h1"), false);
});

test("decorative images and pages without images are not failures", () => {
  const decorative = evaluate(pageHtml({
    body: '<h1>Fresh bread</h1><img src="/a.jpg" alt=""><img src="/b.jpg" role="presentation"><img src="/c.jpg" aria-hidden="true"><img hidden src="/d.jpg"><img src="/e.jpg" alt="Loaf">',
  }));
  assert.equal(rule(decorative, "image_alt").status, "pass");
  assert.equal(rule(decorative, "image_alt").signal, "ok");

  const none = evaluate(pageHtml({ body: "<h1>Fresh bread</h1><p>No pictures on this homepage, just the bakery hours and the address.</p>" }));
  assert.equal(rule(none, "image_alt").status, "not_applicable");
  assert.equal(rule(none, "image_alt").signal, "no_images");
  assert.equal(none.findingRuleIds.includes("image_alt"), false);

  const missing = evaluate(pageHtml({ body: '<h1>Fresh bread</h1><img src="/loaf.jpg"><img alt="" src="/decor.jpg">' }));
  assert.equal(rule(missing, "image_alt").signal, "missing_alt");
  assert.equal(rule(missing, "image_alt").count, 1);
  assert.equal(rule(missing, "image_alt").observation, "/loaf.jpg");
});

test("missing and cross-domain canonicals are not priority errors", () => {
  const missing = evaluate(pageHtml({
    head: '<meta name="description" content="Bread."><meta name="viewport" content="width=device-width, initial-scale=1">',
  }));
  assert.equal(rule(missing, "canonical").status, "review");
  assert.equal(rule(missing, "canonical").signal, "missing");
  assert.equal(missing.findingRuleIds.includes("canonical"), false);
  assert.deepEqual(missing.findingRuleIds, []);

  const cross = evaluate(pageHtml({
    head: '<meta name="description" content="Bread."><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="canonical" href="https://cdn.example.net/home">',
  }));
  assert.equal(rule(cross, "canonical").signal, "cross_domain");
  assert.equal(cross.findingRuleIds.includes("canonical"), false);

  const www = evaluate(pageHtml({
    head: '<meta name="description" content="Bread."><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="canonical" href="https://example.com/">',
  }), "https://www.example.com/");
  assert.equal(rule(www, "canonical").signal, "same_site");

  const invalid = evaluate(pageHtml({
    head: '<meta name="description" content="Bread."><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="canonical" href="javascript:alert(1)">',
  }));
  assert.equal(rule(invalid, "canonical").signal, "invalid");
  assert.deepEqual(invalid.findingRuleIds, ["canonical"]);
});

test("noindex outranks other issues and stops at two findings", () => {
  const result = evaluate(pageHtml({
    title: "React App",
    head: '<meta name="robots" content="noindex, nofollow">',
    body: '<h1>A</h1><h1>B</h1><img src="/a.jpg"><p>Short page with several structural gaps and a noindex directive in the head.</p>',
  }), "http://example.com/");
  assert.equal(rule(result, "indexability").signal, "noindex");
  assert.equal(rule(result, "https").signal, "http");
  assert.deepEqual(result.findingRuleIds, ["indexability", "https"]);
  assert.equal(result.findingRuleIds.length, 2);
});

test("a header noindex is noticed even when the meta tag says index", () => {
  const result = evaluate(pageHtml(), "https://example.com/", { "x-robots-tag": "googlebot: noindex" });
  assert.equal(rule(result, "indexability").signal, "noindex");
  assert.match(rule(result, "indexability").observation, /noindex/i);
});

test("javascript shells do not turn missing body content into failures", () => {
  const shell = evaluate(pageHtml({
    title: "Northline Example Bakery",
    head: '<meta name="viewport" content="width=device-width, initial-scale=1">',
    body: '<div id="root"></div><script src="/app.js"></script><noscript>You need to enable JavaScript to run this app.</noscript>',
  }));
  assert.equal(shell.javascriptNotExecuted, true);
  assert.equal(shell.status, "partial");
  assert.equal(shell.code, "javascript_not_executed");
  assert.equal(rule(shell, "h1").status, "unknown");
  assert.equal(rule(shell, "description").status, "unknown");
  assert.equal(rule(shell, "image_alt").status, "unknown");
  assert.equal(rule(shell, "canonical").status, "unknown");
  assert.equal(rule(shell, "title").signal, "present");
  assert.deepEqual(shell.findingRuleIds, []);

  const placeholder = evaluate(pageHtml({
    title: "React App",
    body: '<div id="root"></div><script src="/app.js"></script>',
  }));
  assert.equal(rule(placeholder, "title").signal, "placeholder");
  assert.deepEqual(placeholder.findingRuleIds, ["title"]);
  assert.equal(rule(placeholder, "h1").status, "unknown");
});

test("site name falls through title, open graph, structured data, then the host", () => {
  const titled = evaluate(pageHtml({ head: '<meta property="og:site_name" content="OG Name">' }));
  assert.equal(titled.siteName, "Northline Example Bakery");

  const og = evaluate(pageHtml({
    title: "React App",
    head: '<meta property="og:site_name" content="Example Bakery">',
  }));
  assert.equal(og.siteName, "Example Bakery");

  const structured = evaluate(`<!doctype html><html><head><script type="application/ld+json">{"@type":"WebSite","name":"Structured Bakery"}</script></head><body><p>${"Visible text ".repeat(12)}</p></body></html>`);
  assert.equal(structured.siteName, "Structured Bakery");

  const host = evaluate("<!doctype html><html><head><title>React App</title></head><body><p>Enough ordinary text to avoid the javascript shell heuristic for this host-name fallback.</p></body></html>");
  assert.equal(host.siteName, "example.com");
});

test("title text is decoded and not stored as live markup", () => {
  const result = evaluate("<!doctype html><html><head><title>Tom &amp; &lt;Jerry&gt;</title></head><body><h1>Show</h1><p>Enough text for a normal homepage without treating the title punctuation as a document failure.</p></body></html>");
  assert.equal(rule(result, "title").observation, "Tom & <Jerry>");
});

test("every documented signal has both languages of copy", () => {
  for (const locale of ["en", "zh"] as const) {
    for (const [ruleId, signals] of Object.entries(RULE_SIGNALS) as [RuleId, readonly string[]][]) {
      for (const signal of signals) {
        const fact: RuleFact = { ruleId, status: "pass", signal, observation: "observed", count: 2 };
        const copy = describeRule(fact, locale);
        assert.ok(copy.summary.length > 0, `${locale} ${ruleId}:${signal}`);
        assert.ok(copy.evidence.length > 0, `${locale} ${ruleId}:${signal}`);
        if (PRIORITY_FINDING_SIGNALS[ruleId].includes(signal)) {
          assert.ok(copy.reason.length > 0);
          assert.ok(copy.condition.length > 0);
          assert.equal(copy.suggestions.length >= 1 && copy.suggestions.length <= 2, true);
        }
      }
    }
  }
});
