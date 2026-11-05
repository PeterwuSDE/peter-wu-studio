import {
  JAVASCRIPT_NOT_EXECUTED_MESSAGE,
  NO_PRIORITY_FINDINGS_MESSAGE,
  type Evaluation,
  type RuleFact,
  type SeoCheckLocale,
} from "./contract.ts";

export interface RuleCopy {
  summary: string;
  evidence: string;
  reason: string;
  condition: string;
  suggestions: string[];
}

function t(locale: SeoCheckLocale, en: string, zh: string): string {
  return locale === "zh" ? zh : en;
}

export function describeRule(fact: RuleFact, locale: SeoCheckLocale): RuleCopy {
  const key = `${fact.ruleId}:${fact.signal}`;
  const phrase = PHRASES[key];
  if (!phrase) throw new Error(`Unknown rule signal ${key}`);
  return {
    summary: t(locale, phrase.summary.en, phrase.summary.zh),
    evidence: evidenceFor(fact, locale),
    reason: t(locale, phrase.reason.en, phrase.reason.zh),
    condition: t(locale, phrase.condition.en, phrase.condition.zh),
    suggestions: phrase.suggestions.map((item) => t(locale, item.en, item.zh)),
  };
}

export function statusMessage(evaluation: Evaluation, locale: SeoCheckLocale, maxBytes: number): string {
  const mib = maxBytes % (1024 * 1024) === 0 ? `${maxBytes / (1024 * 1024)} MiB` : `${maxBytes} bytes`;
  switch (evaluation.code) {
    case "no_priority_findings":
      return NO_PRIORITY_FINDINGS_MESSAGE[locale];
    case "ok":
      return t(
        locale,
        "The homepage check finished. Only evidence-backed notes are listed, and there is no sitewide score.",
        "首页检查已完成。下面只列出有证据的提示，没有全站分数。",
      );
    case "javascript_not_executed":
      return evaluation.findingRuleIds.length === 0
        ? `${JAVASCRIPT_NOT_EXECUTED_MESSAGE[locale]} ${NO_PRIORITY_FINDINGS_MESSAGE[locale]}`
        : JAVASCRIPT_NOT_EXECUTED_MESSAGE[locale];
    case "partial":
      return t(
        locale,
        "Only part of the check could be completed. Items that could not be judged are marked unknown and were not treated as failures.",
        "本次只完成了一部分检查。无法判断的项目已标出，没有被当成失败。",
      );
    case "access_restricted":
      return t(
        locale,
        "This page blocked the check. Nothing was scored, and the block was not bypassed.",
        "该页面限制了本次访问。本次不评分，也不会绕过限制。",
      );
    case "timeout":
    case "network_error":
    case "tls_error":
    case "dns_error":
    case "too_many_redirects":
      return t(locale, "The page could not be read just now. You can try again.", "暂时无法读取该页面。可以稍后重试。");
    case "http_error":
      return t(
        locale,
        `The page could not be read just now (HTTP ${evaluation.httpStatus ?? "error"}). This was not scored as an SEO result.`,
        `暂时无法读取该页面（HTTP ${evaluation.httpStatus ?? "error"}）。本次没有按 SEO 结果评分。`,
      );
    case "too_large":
      return t(
        locale,
        `The response is larger than this check reads (${mib} of HTML after decompression), so it was not scored as a complete page.`,
        `响应超过本次检查读取的大小（解压后 HTML 上限 ${mib}），因此没有按完整页面评分。`,
      );
    case "unsupported_content":
      return t(
        locale,
        "This address did not return HTML. The check only reads the homepage HTML and headers, so the other items were not judged.",
        "这个地址返回的不是 HTML。本次工具只读取首页 HTML 和响应头，其余项目无法判断。",
      );
    default:
      return t(locale, "The check could not be completed.", "检查未能完成。");
  }
}

export function invalidRequestMessage(locale: SeoCheckLocale): string {
  return t(locale, "The request is not valid. Provide a page URL and a request id.", "请求格式不正确。请提供网址和请求标识。");
}

export function invalidTargetMessage(locale: SeoCheckLocale): string {
  return t(
    locale,
    "Use a public http or https page address. No SEO result was created.",
    "请填写可公开访问的 http 或 https 网页地址。本次没有生成 SEO 结论。",
  );
}

export function rateLimitMessage(locale: SeoCheckLocale): string {
  return t(locale, "The free check is temporarily unavailable. Try again later.", "当前暂时无法检查，请稍后再试。");
}

export function conflictMessage(locale: SeoCheckLocale): string {
  return t(
    locale,
    "This request id was already used for a different URL. Start a new request id and try again.",
    "这个请求标识已经用于另一个网址。请换一个请求标识后再试。",
  );
}

export function methodMessage(locale: SeoCheckLocale): string {
  return t(locale, "Use POST.", "请使用 POST。");
}

export function internalMessage(locale: SeoCheckLocale): string {
  return t(
    locale,
    "The check could not be completed. Nothing was saved as a successful result.",
    "检查未能完成。没有把本次记为成功结果。",
  );
}

function evidenceFor(fact: RuleFact, locale: SeoCheckLocale): string {
  const zh = locale === "zh";
  const obs = fact.observation;
  switch (`${fact.ruleId}:${fact.signal}`) {
    case "https:https":
      return zh ? `最终地址使用 HTTPS：${obs}` : `Final URL uses HTTPS: ${obs}`;
    case "https:http":
      return zh ? `最终地址使用 HTTP：${obs}` : `Final URL uses HTTP: ${obs}`;
    case "title:present":
    case "title:placeholder":
      return zh ? `标题：${obs}` : `Title: ${obs}`;
    case "title:missing":
      return zh ? "未发现有文字的 title。" : "No title element with text was found.";
    case "title:unknown":
      return zh ? "标题无法判断。" : "The title could not be judged.";
    case "description:present":
      return zh ? `描述：${obs}` : `Meta description: ${obs}`;
    case "description:missing":
      return zh ? "未发现 meta description。" : "No meta description was found.";
    case "description:unknown":
      return zh ? "描述无法判断。" : "The meta description could not be judged.";
    case "h1:single":
      return zh ? `发现 1 个 h1：${obs}` : `Found 1 h1: ${obs}`;
    case "h1:missing":
      return zh ? "未发现 h1。" : "No h1 element was found.";
    case "h1:multiple":
      return zh ? `发现 ${fact.count ?? 0} 个 h1。第一个：${obs}` : `Found ${fact.count ?? 0} h1 elements. First: ${obs}`;
    case "h1:unknown":
      return zh ? "主标题无法判断。" : "The h1 could not be judged.";
    case "indexability:noindex":
      return obs;
    case "indexability:no_noindex":
      return zh ? "meta robots 和 X-Robots-Tag 中未发现 noindex。" : "No noindex directive in meta robots or X-Robots-Tag.";
    case "indexability:unknown":
      return zh ? "索引指令无法完整判断。" : "Index directives could not be fully judged from this response.";
    case "canonical:same_site":
    case "canonical:cross_domain":
      return zh ? `canonical：${obs}` : `Canonical: ${obs}`;
    case "canonical:missing":
      return zh ? "未发现 canonical 链接。" : "No canonical link was found.";
    case "canonical:invalid":
      return zh ? `canonical 的值：${obs}` : `Canonical value: ${obs}`;
    case "canonical:unknown":
      return zh ? "canonical 无法判断。" : "The canonical link could not be judged.";
    case "viewport:present":
      return zh ? `viewport：${obs}` : `Viewport: ${obs}`;
    case "viewport:missing":
      return zh ? "未发现 viewport 声明。" : "No viewport meta tag was found.";
    case "viewport:unknown":
      return zh ? "viewport 无法判断。" : "The viewport tag could not be judged.";
    case "image_alt:ok":
      return zh
        ? `已查看 ${fact.count ?? 0} 张图片，没有缺少 alt 属性的信息性图片。`
        : `Checked ${fact.count ?? 0} images. None are missing an alt attribute.`;
    case "image_alt:missing_alt":
      return obs
        ? zh
          ? `${fact.count ?? 0} 张图片没有 alt 属性。示例：${obs}`
          : `${fact.count ?? 0} images have no alt attribute. Example: ${obs}`
        : zh
          ? `${fact.count ?? 0} 张图片没有 alt 属性。`
          : `${fact.count ?? 0} images have no alt attribute.`;
    case "image_alt:no_images":
      return zh ? "这段 HTML 里没有图片。" : "No img elements were found.";
    case "image_alt:unknown":
      return zh ? "无法从初始 HTML 判断图片 alt。" : "Image alt text could not be judged from the initial HTML.";
    default:
      return obs;
  }
}

interface Localized {
  en: string;
  zh: string;
}

interface Phrase {
  summary: Localized;
  reason: Localized;
  condition: Localized;
  suggestions: Localized[];
}

const none: Localized = { en: "", zh: "" };

function info(summary: Localized): Phrase {
  return { summary, reason: none, condition: none, suggestions: [] };
}

const PHRASES: Record<string, Phrase> = {
  "https:https": info({
    en: "The final page uses HTTPS. This is not a full TLS audit.",
    zh: "最终页面使用 HTTPS。这不是完整的 TLS 审计。",
  }),
  "https:http": {
    summary: {
      en: "The final page uses HTTP, so the connection is not encrypted.",
      zh: "最终页面使用 HTTP，连接未加密。",
    },
    reason: {
      en: "The final address still uses HTTP, so browsers will not treat the connection as encrypted.",
      zh: "最终地址仍是 HTTP，浏览器不会把这次连接视为加密访问。",
    },
    condition: {
      en: "This applies to the final URL after redirects, not to a full certificate audit.",
      zh: "这里只看跳转后的最终地址，不是完整的证书审计。",
    },
    suggestions: [
      {
        en: "Serve this homepage over HTTPS and redirect HTTP requests to it.",
        zh: "用 HTTPS 提供这个首页，并把 HTTP 请求重定向过去。",
      },
      {
        en: "Confirm the certificate with your host. This check does not audit the rest of the site.",
        zh: "请主机商确认证书。本次不审计站点其余部分的 TLS。",
      },
    ],
  },
  "title:present": info({ en: "A page title is present.", zh: "页面有标题。" }),
  "title:missing": {
    summary: { en: "The homepage HTML has no page title.", zh: "首页 HTML 没有页面标题。" },
    reason: {
      en: "A homepage without a title is harder for people and search engines to recognize.",
      zh: "首页没有标题时，访客和搜索引擎更难识别这个页面。",
    },
    condition: {
      en: "Judged only from the title element in the fetched HTML.",
      zh: "只根据本次取回的 HTML 里的 title 元素判断。",
    },
    suggestions: [
      { en: "Add a title element that names the business and what this page is.", zh: "补上 title，写明业务名称和这个页面是什么。" },
      { en: "Do not leave it empty. This check does not score title length.", zh: "不要留空。本次不按标题长度打分。" },
    ],
  },
  "title:placeholder": {
    summary: { en: "The page title looks like a placeholder.", zh: "页面标题看起来像占位文字。" },
    reason: {
      en: "The title still looks like a default or placeholder rather than this page's real name.",
      zh: "标题仍像默认值或占位文字，而不像这个页面的真实名称。",
    },
    condition: {
      en: "Only obvious placeholder titles are flagged. Length is not scored.",
      zh: "只提示明显的占位标题，不按长度扣分。",
    },
    suggestions: [
      { en: "Replace the placeholder with the business name and this page's topic.", zh: "把占位标题换成业务名称和这个页面的主题。" },
      { en: "This check does not treat a long or short title as a failure.", zh: "标题偏长或偏短都不会被本次检查判为失败。" },
    ],
  },
  "title:unknown": info({
    en: "The page title could not be judged because this check does not run JavaScript.",
    zh: "本次不执行 JavaScript，因此无法判断页面标题。",
  }),
  "description:present": info({ en: "A meta description is present.", zh: "已发现 meta description。" }),
  "description:missing": {
    summary: {
      en: "No meta description was found. Search engines may generate their own snippet.",
      zh: "未发现 meta description。搜索引擎可能会自行生成摘要。",
    },
    reason: {
      en: "No meta description was found. Search engines may generate their own snippet from the page.",
      zh: "未发现 meta description。搜索引擎可能会用页面内容自行生成摘要。",
    },
    condition: {
      en: "A missing description is not proof of a ranking penalty.",
      zh: "缺少描述不能说明会有排名处罚。",
    },
    suggestions: [
      { en: "Add a meta description that summarizes this homepage in plain language.", zh: "用一段平实的话概括这个首页，写入 meta description。" },
      { en: "Search engines may still rewrite the snippet.", zh: "搜索引擎仍可能改写这段摘要。" },
    ],
  },
  "description:unknown": info({
    en: "The meta description could not be judged because this check does not run JavaScript.",
    zh: "本次不执行 JavaScript，因此无法判断 meta description。",
  }),
  "h1:single": info({ en: "One h1 heading was found.", zh: "发现一个 h1。" }),
  "h1:missing": {
    summary: { en: "No h1 was found. This is a structure signal, not a ranking penalty.", zh: "未发现 h1。这是结构提示，不是排名处罚。" },
    reason: {
      en: "The fetched HTML has no h1, so the main heading is not in the response we read.",
      zh: "取回的 HTML 里没有 h1，我们读到的响应中没有主标题。",
    },
    condition: {
      en: "This is a structure suggestion, not a claimed ranking penalty.",
      zh: "这是结构建议，不能把它说成排名处罚。",
    },
    suggestions: [
      { en: "Add one h1 that states what this page is about.", zh: "添加一个说明这个页面主题的 h1。" },
      { en: "Do not treat this as evidence of a ranking penalty.", zh: "不要把这一点当成排名处罚的证据。" },
    ],
  },
  "h1:multiple": {
    summary: {
      en: "More than one h1 was found. This is a structure signal, not a ranking penalty.",
      zh: "发现多个 h1。这是结构提示，不是排名处罚。",
    },
    reason: { en: "The fetched HTML includes more than one h1.", zh: "取回的 HTML 里有不止一个 h1。" },
    condition: {
      en: "This is a structure suggestion, not a claimed ranking penalty.",
      zh: "这是结构建议，不能把它说成排名处罚。",
    },
    suggestions: [
      { en: "Keep a single h1 for the main topic and lower the other headings.", zh: "主主题保留一个 h1，其余标题降级。" },
      { en: "Confirm the extra h1 elements are intentional.", zh: "确认多出来的 h1 是有意保留的。" },
    ],
  },
  "h1:unknown": info({
    en: "Headings could not be judged because this check does not run JavaScript.",
    zh: "本次不执行 JavaScript，因此无法判断主标题。",
  }),
  "indexability:noindex": {
    summary: {
      en: "A noindex directive was found. If you want this homepage indexed, confirm that this setting is intentional.",
      zh: "发现 noindex。若希望此首页被收录，请确认此设置是有意保留的。",
    },
    reason: {
      en: "The response includes a noindex directive, which asks search engines not to index this URL.",
      zh: "这次响应里有 noindex，它会要求搜索引擎不要收录这个地址。",
    },
    condition: {
      en: "If you want this homepage to be indexed, confirm this setting.",
      zh: "若希望此首页被收录，请确认此设置。",
    },
    suggestions: [
      {
        en: "If this homepage should be public in search, remove noindex from the meta robots tag and the X-Robots-Tag header.",
        zh: "若希望这个首页被公开收录，请从 meta robots 和 X-Robots-Tag 中移除 noindex。",
      },
      {
        en: "If the page is meant to stay out of search, keep the setting. No change is required.",
        zh: "若页面本就不应被收录，请保留该设置，不必修改。",
      },
    ],
  },
  "indexability:no_noindex": info({
    en: "No noindex directive was found. That does not mean the page is indexed.",
    zh: "未发现 noindex。这不等于页面已经被收录。",
  }),
  "indexability:unknown": info({
    en: "Index settings could not be fully judged from this response.",
    zh: "无法仅凭这次响应完整判断索引设置。",
  }),
  "canonical:same_site": info({
    en: "A canonical link points at the same site and the URL syntax is valid.",
    zh: "canonical 指向同一站点，且 URL 语法有效。",
  }),
  "canonical:missing": info({
    en: "No canonical link was found. That is a confirmation signal, not a failed check.",
    zh: "未发现 canonical 链接。这只是需要确认的信号，不算检查失败。",
  }),
  "canonical:cross_domain": info({
    en: "The canonical link points at a different host. Confirm it is intentional. This does not mean the target page is broken.",
    zh: "canonical 指向另一个主机。请确认这是有意的。这不表示目标页面失效。",
  }),
  "canonical:invalid": {
    summary: { en: "The canonical link is not a usable http(s) URL.", zh: "canonical 不是可用的 http 或 https URL。" },
    reason: {
      en: "A canonical link was found, but its value is not a usable http(s) URL.",
      zh: "发现了 canonical，但它的值不是可用的 http 或 https URL。",
    },
    condition: {
      en: "This does not mean another page is unavailable.",
      zh: "这不表示另一个页面不可用。",
    },
    suggestions: [
      {
        en: "Set the canonical href to a full http(s) URL or a valid relative path on this site.",
        zh: "把 canonical 的 href 设成完整的 http(s) URL，或本站上的有效相对路径。",
      },
      { en: "Do not treat this as evidence that the target page is down.", zh: "不要把这一点当成目标页面失效的证据。" },
    ],
  },
  "canonical:unknown": info({ en: "The canonical link could not be judged.", zh: "无法判断 canonical。" }),
  "viewport:present": info({
    en: "A viewport declaration is present. This does not judge mobile usability.",
    zh: "已声明 viewport。这不能说明移动端是否完全可用。",
  }),
  "viewport:missing": {
    summary: {
      en: "No viewport declaration was found. This only reports the tag, not phone usability.",
      zh: "未发现 viewport 声明。这里只报告标签，不判断手机可用性。",
    },
    reason: { en: "No viewport meta tag was found in the HTML.", zh: "HTML 中未发现 viewport meta 标签。" },
    condition: {
      en: "This only reports whether a viewport tag was declared.",
      zh: "这里只报告是否声明了 viewport。",
    },
    suggestions: [
      {
        en: "Add a viewport meta tag, commonly width=device-width, initial-scale=1.",
        zh: "添加 viewport meta 标签，常见写法是 width=device-width, initial-scale=1。",
      },
      {
        en: "Check the page on a phone separately. This tool does not judge mobile usability.",
        zh: "请另外在手机上查看页面。本工具不判断移动端可用性。",
      },
    ],
  },
  "viewport:unknown": info({ en: "The viewport tag could not be judged.", zh: "无法判断 viewport。" }),
  "image_alt:ok": info({
    en: "No informative image is missing an alt attribute. Empty alt and explicit decorative or hidden images were not treated as errors.",
    zh: "没有信息性图片缺少 alt。空 alt，以及明确标成装饰或隐藏的图片，没有被当成错误。",
  }),
  "image_alt:missing_alt": {
    summary: {
      en: "Some images have no alt attribute. Empty alt and explicit decorative or hidden images were not counted.",
      zh: "有图片没有 alt 属性。空 alt，以及明确标成装饰或隐藏的图片，没有被计入。",
    },
    reason: {
      en: "One or more img elements have no alt attribute and no explicit decorative or hidden marker.",
      zh: "有 img 没有 alt 属性，也没有明确的装饰或隐藏标记。",
    },
    condition: {
      en: "Empty alt, role=presentation, role=none, aria-hidden, and the hidden attribute were not counted as errors.",
      zh: "空 alt、role=presentation、role=none、aria-hidden 和 hidden 属性都不算错误。",
    },
    suggestions: [
      {
        en: "Add an alt attribute that describes the image, or an empty alt if it is decorative.",
        zh: "为图片补上说明用途的 alt；如果只是装饰，使用空的 alt。",
      },
      { en: "Do not add keyword-stuffed alt text.", zh: "不要在 alt 里堆砌关键词。" },
    ],
  },
  "image_alt:no_images": info({
    en: "There are no images in this HTML, so alt text does not apply.",
    zh: "这段 HTML 里没有图片，因此 alt 不适用。",
  }),
  "image_alt:unknown": info({
    en: "Image alt text could not be judged. This check did not run JavaScript, so images that load later were not called missing.",
    zh: "无法判断图片 alt。本次没有执行 JavaScript，稍后才出现的图片不会被当成缺失。",
  }),
};
