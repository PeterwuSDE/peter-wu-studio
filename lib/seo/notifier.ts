import { siteEmail } from "../../app/site.ts";
import type { InquiryRecord, NotificationStatus } from "./contract.ts";

export type NotifyResult =
  | { status: "sent" }
  | { status: "unconfigured" }
  | { status: "failed"; errorCode: string };

export interface InquiryNotifier {
  send(record: InquiryRecord): Promise<NotifyResult>;
}

export function createUnconfiguredNotifier(): InquiryNotifier {
  return {
    async send(): Promise<NotifyResult> {
      return { status: "unconfigured" };
    },
  };
}

export function notificationDelivered(status: NotificationStatus): boolean {
  return status === "sent";
}

function singleLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export function inquiryNotificationText(record: InquiryRecord): string {
  const snapshot = record.snapshot;
  const findings = snapshot.findings.length
    ? snapshot.findings.map((finding, index) => [
      `${index + 1}. ${finding.ruleId} @ ${finding.ruleVersion}`,
      `   URL: ${finding.url}`,
      `   Observed: ${finding.observed}`,
      `   Evidence: ${finding.evidence}`,
      `   Checked: ${finding.checkedAt}`,
      `   Why: ${finding.reason}`,
      `   Suggestion: ${finding.suggestion}`,
    ].join("\n")).join("\n")
    : "(none displayed)";
  const checks = snapshot.checks.length
    ? snapshot.checks.map((check) => `- ${check.ruleId} @ ${check.ruleVersion}: ${check.state}; ${check.observed}`).join("\n")
    : "(none)";

  return [
    "A homepage-check follow-up was saved.",
    `Inquiry: ${record.inquiryId}`,
    `Saved at: ${record.createdAt}`,
    `Name: ${singleLine(record.name)}`,
    `Email: ${singleLine(record.email)}`,
    `Phone: ${record.phone ? singleLine(record.phone) : "(not provided)"}`,
    "What they want to improve:",
    record.goal,
    "",
    `Scan reference: ${snapshot.reference}`,
    `Checked at: ${snapshot.checkedAt}`,
    `Rule version: ${snapshot.ruleVersion}`,
    `Locale: ${snapshot.locale}`,
    `Status: ${snapshot.status}`,
    `Canonical URL: ${snapshot.canonicalUrl}`,
    `Final URL: ${snapshot.finalUrl}`,
    `Cache hit: ${snapshot.cacheHit ? "yes" : "no"}`,
    `Cache expires: ${snapshot.cacheExpiresAt}`,
    `Coverage: completed ${snapshot.coverage.completed}, unknown ${snapshot.coverage.unknown}, not applicable ${snapshot.coverage.notApplicable}`,
    "",
    "Checks:",
    checks,
    "",
    "Displayed findings:",
    findings,
    "",
    "This notice does not start a full audit, a quote, a purchase, or a model run.",
  ].join("\n");
}

export interface ResendNotifierOptions {
  apiKey: string;
  from: string;
  to: string;
  fetchImpl?: typeof fetch;
}

export function createResendNotifier(options: ResendNotifierOptions): InquiryNotifier {
  const fetchImpl = options.fetchImpl ?? fetch;
  return {
    async send(record): Promise<NotifyResult> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetchImpl("https://api.resend.com/emails", {
          method: "POST",
          signal: controller.signal,
          headers: {
            authorization: `Bearer ${options.apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            from: options.from,
            to: [options.to],
            subject: `Northline homepage check inquiry ${record.inquiryId}`,
            text: inquiryNotificationText(record),
          }),
        });
        if (!response.ok) {
          await response.text().catch(() => "");
          return { status: "failed", errorCode: `resend_${response.status}` };
        }
        await response.text().catch(() => "");
        return { status: "sent" };
      } catch {
        return { status: "failed", errorCode: "resend_network" };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

export function createNotifierFromEnv(env: Record<string, string | undefined> = process.env): InquiryNotifier {
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) return createUnconfiguredNotifier();
  const to = env.SEO_NOTIFY_TO?.trim() || siteEmail;
  const from = env.SEO_NOTIFY_FROM?.trim() || "Northline Studio <onboarding@resend.dev>";
  return createResendNotifier({ apiKey, from, to });
}
