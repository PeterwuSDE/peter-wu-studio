import { mailtoHref, siteEmail } from "../site";
import { inquiryMessages } from "../../lib/seo/messages.ts";
import { inquiryFormScript } from "./inquiry-form-script";

function safeJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/**
 * Follow-up form for a finished homepage check.
 * Issue #4 should link here with `seoInquiryHref(reference, locale)`:
 * `/seo?scan=<reference>&locale=zh#inquiry`
 * The browser sends only the reference. The API copies the snapshot from the scan directory.
 */
export function SeoInquiryForm() {
  return (
    <section className="seo-inquiry" id="inquiry" aria-labelledby="seo-inquiry-title">
      <p className="section-kicker">Homepage check follow-up</p>
      <div className="seo-inquiry-copy">
        <h2 id="seo-inquiry-title" data-i18n="title">Ask Northline to look further</h2>
        <p data-i18n="intro">
          Send your name, email, and what you want to improve. Phone is optional. These details are used only to respond to this request. Sending it does not join a marketing list, buy anything, approve a quote, or start a deeper automated analysis.
        </p>
        <p id="seo-inquiry-scan-note" data-i18n="scanMissing">
          Open this form from a finished homepage check so the result can be attached. You can also email the studio address below.
        </p>
        <p className="seo-inquiry-fallback">
          <span data-i18n="fallbackBefore">Or email</span>{" "}
          <a href={mailtoHref}>{siteEmail}</a>
          <span data-i18n="fallbackAfter">. This address stays available even when the form cannot be saved.</span>
        </p>
      </div>
      <form id="seo-inquiry" action="/api/seo-inquiries" method="post" acceptCharset="utf-8">
        <input id="seo-inquiry-scan-reference" name="scanReference" type="hidden" defaultValue="" />
        <input id="seo-inquiry-submission-id" name="submissionId" type="hidden" defaultValue="" />
        <input id="seo-inquiry-locale" name="locale" type="hidden" defaultValue="en" />
        <label htmlFor="seo-inquiry-name">
          <span data-i18n="name">Name (required)</span>
          <input id="seo-inquiry-name" name="name" type="text" autoComplete="name" required maxLength={80} />
        </label>
        <label htmlFor="seo-inquiry-email">
          <span data-i18n="email">Email (required)</span>
          <input id="seo-inquiry-email" name="email" type="email" autoComplete="email" required maxLength={254} inputMode="email" spellCheck={false} />
        </label>
        <label htmlFor="seo-inquiry-goal">
          <span data-i18n="goal">What do you want to improve? (required)</span>
          <textarea id="seo-inquiry-goal" name="goal" required maxLength={1000} rows={4} />
        </label>
        <label htmlFor="seo-inquiry-phone">
          <span data-i18n="phone">Phone (optional)</span>
          <input id="seo-inquiry-phone" name="phone" type="tel" autoComplete="tel" maxLength={40} inputMode="tel" />
        </label>
        <p id="seo-inquiry-error" className="seo-inquiry-error" role="alert" tabIndex={-1} hidden />
        <p id="seo-inquiry-success" className="seo-inquiry-success" role="status" tabIndex={-1} hidden />
        <button id="seo-inquiry-submit" className="button button-primary" type="submit" data-i18n="submit">Send this request</button>
      </form>
      <script type="application/json" id="seo-inquiry-config" dangerouslySetInnerHTML={{ __html: safeJson({ endpoint: "/api/seo-inquiries", email: siteEmail }) }} />
      <script type="application/json" id="seo-inquiry-messages" dangerouslySetInnerHTML={{ __html: safeJson(inquiryMessages) }} />
      <script dangerouslySetInnerHTML={{ __html: inquiryFormScript }} />
    </section>
  );
}
