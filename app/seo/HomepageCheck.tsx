"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import type { SeoCheckClient } from "./check-client";
import { copyFor } from "./copy";
import { inquiryMailto, registerSeoInquiryHandler, SEO_INQUIRY_ENTRY_ID, type SeoInquiryContext } from "./inquiry";
import { SeoInquiryForm } from "./inquiry-form";
import { createHomepageCheck, localeFromKey, type HomepageCheckController, type InquiryPort } from "./model";
import { presentReport } from "./present";
import { mailtoHref } from "../site";

/**
 * Free homepage check. The default client posts to /api/seo-check.
 * Pass a client only from tests. Do not pass the fixture double here from the page.
 */
export function HomepageCheck({ client, inquiry, controller }: { client?: SeoCheckClient; inquiry?: InquiryPort; controller?: HomepageCheckController } = {}) {
  const [ownsChecker] = useState(() => !controller);
  const [checker] = useState(() => controller ?? createHomepageCheck({ client, inquiry }));
  const snapshot = useSyncExternalStore(checker.subscribe, checker.getSnapshot, checker.getSnapshot);
  const copy = copyFor(snapshot.locale);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const inquiryRef = useRef<HTMLDivElement>(null);
  const englishRef = useRef<HTMLButtonElement>(null);
  const chineseRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!ownsChecker) return undefined;
    return () => checker.dispose();
  }, [checker, ownsChecker]);

  useEffect(() => registerSeoInquiryHandler(() => {
    // The form below replaces the mailto fallback. The result above stays mounted.
  }), []);

  useEffect(() => {
    if (snapshot.focus === "result") resultRef.current?.focus();
    if (snapshot.focus === "error") errorRef.current?.focus();
    if (snapshot.focus === "inquiry") inquiryRef.current?.focus();
  }, [snapshot.focus, snapshot.focusToken]);

  const report = snapshot.phase === "ready" ? snapshot.report : null;
  const presented = report ? presentReport(report, snapshot.locale) : null;
  const alertMessage = snapshot.block?.message ?? (snapshot.notice ? copy.localeRefresh : null);
  const describedBy = ["seo-check-help", alertMessage ? "seo-check-error" : ""].filter(Boolean).join(" ");
  const inquiryContext = report?.scanId && report.checkedAt ? toInquiryContext({ ...report, scanId: report.scanId, checkedAt: report.checkedAt }) : null;

  function onLanguageKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const next = localeFromKey(snapshot.locale, event.key);
    if (!next || next === snapshot.locale) return;
    event.preventDefault();
    void checker.setLocale(next);
    (next === "en" ? englishRef : chineseRef).current?.focus();
  }

  return (
    <section className="seo-check" id="homepage-check" lang={snapshot.locale === "zh" ? "zh-Hans" : "en"} data-seo-check-phase={snapshot.phase}>
      <div className="seo-check-header">
        <p className="section-kicker">{copy.kicker}</p>
        <h2 id="seo-check-title">{copy.title}</h2>
        <p id="seo-check-help" className="seo-check-lead">{copy.lead}</p>
        <div className="seo-check-languages" role="radiogroup" aria-label={copy.languageLabel} onKeyDown={onLanguageKeyDown}>
          <button ref={englishRef} type="button" role="radio" aria-checked={snapshot.locale === "en"} onClick={() => void checker.setLocale("en")}>{copy.english}</button>
          <button ref={chineseRef} type="button" role="radio" aria-checked={snapshot.locale === "zh"} onClick={() => void checker.setLocale("zh")}>{copy.chinese}</button>
        </div>
      </div>
      <form
        id="seo-check-form"
        className="seo-check-form"
        aria-labelledby="seo-check-title"
        aria-busy={snapshot.phase === "checking"}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void checker.submit();
        }}
      >
        <label htmlFor="seo-check-url">{copy.urlLabel}</label>
        <div className="seo-check-controls">
          <input
            id="seo-check-url"
            name="url"
            type="text"
            inputMode="url"
            autoComplete="url"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder={copy.urlPlaceholder}
            value={snapshot.url}
            readOnly={snapshot.phase === "checking"}
            aria-invalid={snapshot.block?.reason === "invalid_url"}
            aria-describedby={describedBy}
            onChange={(event) => checker.setUrl(event.target.value)}
          />
          <button className="button button-primary" type="submit" disabled={snapshot.phase === "checking"}>
            {snapshot.phase === "checking" ? copy.checking : copy.submit}
          </button>
        </div>
        <p className="seo-check-live" role="status" aria-live="polite">{snapshot.phase === "checking" ? copy.checking : ""}</p>
        {alertMessage ? (
          <div id="seo-check-error" className="seo-check-error" role="alert" tabIndex={-1} ref={errorRef}>
            <p>{alertMessage}</p>
            {snapshot.block?.showRetry || snapshot.notice ? <button className="button button-primary" type="button" onClick={() => void checker.retry()}>{copy.retry}</button> : null}
            {snapshot.block?.showContact ? <a href={mailtoHref}>{copy.contact}</a> : null}
          </div>
        ) : null}
      </form>
      {presented && report ? (
        <div className="seo-check-result" id="seo-check-result" data-scan-id={report.scanId ?? undefined} data-seo-cached={report.cached ? "true" : "false"} data-seo-status={report.status} data-seo-code={report.code} lang={report.locale === "zh" ? "zh-Hans" : "en"}>
          <div className="seo-check-overview">
            <h3 id="seo-check-result-title" tabIndex={-1} ref={resultRef}>{presented.displayName}</h3>
            <p>{presented.message}</p>
            <p>{copy.overview}</p>
            <dl>
              <div><dt>{copy.addressChecked}</dt><dd>{presented.normalizedUrl}</dd></div>
              {presented.finalUrl ? <div><dt>{copy.finalAddress}</dt><dd>{presented.finalUrl}</dd></div> : null}
              <div><dt>{copy.findingTime}</dt><dd>{presented.timeLine}</dd></div>
              <div><dt>{copy.ruleVersion}</dt><dd>{presented.ruleVersion}</dd></div>
              <div><dt>{copy.coverageLabel}</dt><dd>{presented.coverageLine}</dd></div>
              {presented.pageHttp ? <div><dt>{copy.pageHttp}</dt><dd>{presented.pageHttp}</dd></div> : null}
              {presented.redirects ? <div><dt>{copy.redirects}</dt><dd>{presented.redirects}</dd></div> : null}
              {presented.scope ? <div><dt>{copy.scopeLabel}</dt><dd>{presented.scope}</dd></div> : null}
            </dl>
            {presented.cacheUntil ? <p>{presented.cacheUntil}</p> : null}
            {presented.scriptNote ? <p>{presented.scriptNote}</p> : null}
          </div>
          <div className="seo-check-findings">
            <h3>{copy.findings}</h3>
            {presented.findings.map((finding) => (
              <article className="seo-check-finding" key={finding.key} data-seo-finding={finding.ruleId}>
                <p className="seo-check-rule">{finding.ruleId} · {finding.ruleVersion}</p>
                <h4>{finding.condition || finding.reason}</h4>
                {finding.reason ? <p>{finding.reason}</p> : null}
                <p className="seo-check-evidence">{copy.observed}: {finding.evidence}</p>
                <dl>
                  <div><dt>{copy.onPage}</dt><dd>{finding.url}</dd></div>
                  <div><dt>{copy.findingTime}</dt><dd>{finding.checkedAt}</dd></div>
                </dl>
                <h5>{copy.next}</h5>
                <ol>
                  {finding.suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}
                </ol>
              </article>
            ))}
          </div>
          {presented.passed.length > 0 ? (
            <ItemGroup title={copy.passed} items={presented.passed} />
          ) : null}
          {presented.review.length > 0 ? (
            <ItemGroup title={copy.review} items={presented.review} />
          ) : null}
          {presented.unknown.length > 0 ? (
            <ItemGroup title={copy.unknown} items={presented.unknown} />
          ) : null}
          {presented.notApplicable.length > 0 ? (
            <ItemGroup title={copy.notApplicable} items={presented.notApplicable} />
          ) : null}
          <div className="seo-check-deeper">
            <h3>{copy.deeper}</h3>
            <p className="seo-check-disclaimer">{copy.deeperNote}</p>
            <ul className="seo-check-examples">
              {copy.exampleDirections.map((direction) => (
                <li key={direction}>
                  <span className="seo-check-lock">{copy.notRun}</span>
                  <h4>{direction}</h4>
                  <p>{copy.exampleBody}</p>
                </li>
              ))}
            </ul>
            {inquiryContext ? (
              <div className="seo-check-actions">
                <button className="button button-primary" type="button" data-seo-inquiry-trigger="primary" data-scan-id={inquiryContext.scanId} onClick={() => checker.openInquiry()}>{copy.inquire}</button>
                <button className="text-link" type="button" data-seo-inquiry-trigger="learn" data-scan-id={inquiryContext.scanId} onClick={() => checker.openInquiry()}>{copy.learnMore}</button>
              </div>
            ) : <p><a href={mailtoHref}>{copy.contact}</a></p>}
          </div>
        </div>
      ) : null}
      <div id={SEO_INQUIRY_ENTRY_ID} className={snapshot.inquiry === "closed" ? "seo-check-inquiry" : "seo-check-inquiry seo-check-inquiry-open"} data-seo-inquiry-entry="" data-seo-inquiry-state={snapshot.inquiry} data-scan-id={inquiryContext?.scanId} tabIndex={-1} ref={inquiryRef} hidden={snapshot.inquiry === "closed" ? true : undefined} role={snapshot.inquiry === "closed" ? undefined : "region"} aria-labelledby={snapshot.inquiry === "handled" ? "seo-inquiry-form-title" : snapshot.inquiry === "fallback" ? "seo-inquiry-title" : undefined}>
        {snapshot.inquiry === "handled" && inquiryContext ? <SeoInquiryForm context={inquiryContext} /> : null}
        {snapshot.inquiry === "fallback" && inquiryContext ? <InquiryFallback context={inquiryContext} locale={snapshot.locale} /> : null}
      </div>
    </section>
  );
}

function ItemGroup({ title, items }: { title: string; items: { key: string; status: string; statusLabel: string; summary: string }[] }) {
  return (
    <div className="seo-check-group">
      <h3>{title}</h3>
      <ul className="seo-check-list">
        {items.map((item) => (
          <li key={item.key} data-seo-item-status={item.status}>
            <span className={`seo-check-status seo-check-status-${item.status === "not_applicable" ? "na" : item.status}`}>{item.statusLabel}</span>
            <span>{item.summary}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InquiryFallback({ context, locale }: { context: SeoInquiryContext; locale: SeoInquiryContext["locale"] }) {
  const copy = copyFor(locale);
  return (
    <>
      <h3 id="seo-inquiry-title">{copy.inquiryTitle}</h3>
      <p>{copy.inquiryBody}</p>
      <dl>
        <div><dt>{copy.scanReference}</dt><dd>{context.scanId}</dd></div>
        <div><dt>{copy.addressChecked}</dt><dd>{context.normalizedUrl}</dd></div>
        <div><dt>{copy.finalAddress}</dt><dd>{context.finalUrl}</dd></div>
        <div><dt>{copy.findingTime}</dt><dd>{context.checkedAt}</dd></div>
        <div><dt>{copy.ruleVersion}</dt><dd>{context.ruleVersion}</dd></div>
      </dl>
      <p>{copy.inquiryEmail}</p>
      <a href={inquiryMailto(context)}>{copy.contact}</a>
    </>
  );
}

function toInquiryContext(report: NonNullable<ReturnType<HomepageCheckController["getSnapshot"]>["report"]> & { scanId: string; checkedAt: string }): SeoInquiryContext {
  return {
    scanId: report.scanId,
    requestId: report.requestId,
    normalizedUrl: report.normalizedUrl,
    finalUrl: report.finalUrl,
    locale: report.locale,
    checkedAt: report.checkedAt,
    ruleVersion: report.ruleVersion,
    cached: report.cached,
    status: report.status,
    code: report.code,
  };
}
