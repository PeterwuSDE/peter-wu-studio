"use client";

import { useEffect, useState, type FormEvent } from "react";
import { inquiryCopy, type InquiryErrorCode } from "../../lib/seo/messages";
import { mailtoHref, siteEmail } from "../site";
import { SEO_INQUIRY_PATH } from "../../shared/seo-check/contract";
import type { SeoInquiryContext } from "./inquiry";

const REQUEST_KEY_PREFIX = "northline:seo-inquiry-request:";

function requestIdFor(scanId: string): string {
  const key = `${REQUEST_KEY_PREFIX}${scanId}`;
  let existing = "";
  try {
    existing = sessionStorage.getItem(key) || "";
  } catch {
    existing = "";
  }
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(existing)) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    existing = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    try {
      sessionStorage.setItem(key, existing);
    } catch {
      // The same page session still reuses this id until reload.
    }
  }
  return existing;
}

/**
 * Contact form opened from the free homepage result.
 * `scanId` is only a lookup key. The API rebuilds the snapshot with `readStoredScan`.
 */
export function SeoInquiryForm({ context }: { context: SeoInquiryContext }) {
  const copy = inquiryCopy(context.locale);
  const [requestId] = useState(() => requestIdFor(context.scanId));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [goal, setGoal] = useState("");
  const [phone, setPhone] = useState("");
  const [phase, setPhase] = useState<"idle" | "sending" | "received" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    document.getElementById("seo-inquiry-name")?.focus();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phase === "sending" || phase === "received") return;
    setPhase("sending");
    setMessage("");
    try {
      const response = await fetch(SEO_INQUIRY_PATH, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          scanId: context.scanId,
          requestId,
          name,
          email,
          goal,
          phone,
          locale: context.locale,
        }),
      });
      const body = await response.json().catch(() => ({})) as {
        inquiryId?: string;
        notificationStatus?: string;
        received?: boolean;
        error?: string;
      };
      if (body.received === true && body.inquiryId) {
        const delivery = body.notificationStatus === "sent" ? "" : ` ${copy.notSent}`;
        setMessage(`${copy.received} ${body.inquiryId}${delivery}`);
        setPhase("received");
        return;
      }
      const code = body.error as InquiryErrorCode | undefined;
      setMessage((code && copy.errors[code]) || copy.errors.save_failed);
      setPhase("error");
    } catch {
      setMessage(copy.errors.save_failed);
      setPhase("error");
    }
  }

  return (
    <form id="seo-inquiry-form" className="seo-inquiry-form" action={SEO_INQUIRY_PATH} method="post" onSubmit={onSubmit} aria-labelledby="seo-inquiry-form-title">
      <h3 id="seo-inquiry-form-title">{copy.title}</h3>
      <p>{copy.intro}</p>
      <p>{copy.scanAttached} {context.scanId}</p>
      <p className="seo-inquiry-fallback">
        <span>{copy.fallbackBefore}</span>{" "}
        <a href={mailtoHref}>{siteEmail}</a>
        <span>{copy.fallbackAfter}</span>
      </p>
      <input type="hidden" name="scanId" value={context.scanId} />
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="locale" value={context.locale} />
      <label htmlFor="seo-inquiry-name">
        <span>{copy.name}</span>
        <input id="seo-inquiry-name" name="name" type="text" autoComplete="name" required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label htmlFor="seo-inquiry-email">
        <span>{copy.email}</span>
        <input id="seo-inquiry-email" name="email" type="email" autoComplete="email" required maxLength={254} inputMode="email" spellCheck={false} value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      <label htmlFor="seo-inquiry-goal">
        <span>{copy.goal}</span>
        <textarea id="seo-inquiry-goal" name="goal" required maxLength={1000} rows={4} value={goal} onChange={(event) => setGoal(event.target.value)} />
      </label>
      <label htmlFor="seo-inquiry-phone">
        <span>{copy.phone}</span>
        <input id="seo-inquiry-phone" name="phone" type="tel" autoComplete="tel" maxLength={40} inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
      </label>
      {phase === "error" ? <p id="seo-inquiry-error" className="seo-inquiry-error" role="alert">{message}</p> : null}
      {phase === "received" ? <p id="seo-inquiry-success" className="seo-inquiry-success" role="status">{message}</p> : null}
      <button id="seo-inquiry-submit" className="button button-primary" type="submit" disabled={phase === "sending" || phase === "received"}>
        {phase === "sending" ? copy.sending : copy.submit}
      </button>
    </form>
  );
}
