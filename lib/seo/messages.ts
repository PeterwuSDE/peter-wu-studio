export const inquiryMessages = {
  en: {
    title: "Ask Northline to look further",
    intro:
      "Send your name, email, and what you want to improve. Phone is optional. These details are used only to respond to this request. Sending it does not join a marketing list, buy anything, approve a quote, or start a deeper automated analysis.",
    name: "Name (required)",
    email: "Email (required)",
    goal: "What do you want to improve? (required)",
    phone: "Phone (optional)",
    submit: "Send this request",
    sending: "Sending…",
    scanMissing:
      "Open this form from a finished homepage check so the result can be attached. You can also email the studio address below.",
    scanAttached: "Attached check reference:",
    received: "We have received your request. Request number:",
    notSent: "The request is saved. A notification email was not sent.",
    fallbackBefore: "Or email",
    fallbackAfter: ". This address stays available even when the form cannot be saved.",
    errors: {
      validation: "The request was not submitted. Check the required fields. What you typed is still here.",
      scan_not_found: "The request was not submitted. That homepage check could not be found.",
      scan_expired: "The request was not submitted. That homepage check has expired. Run the check again, or use the email below.",
      scan_invalid: "The request was not submitted. That homepage check could not be verified.",
      scan_unavailable: "The request was not submitted. The homepage check could not be verified just now.",
      conflict: "The request was not submitted. This submission was already used for different answers.",
      rate_limited: "The request was not submitted. Please wait and try again, or use the email below.",
      persistence_unconfigured: "The request was not submitted. Saving is not configured yet.",
      save_failed: "The request was not submitted. What you typed is still here. Try again, or use the email below.",
      origin_not_allowed: "The request was not submitted.",
      unauthorized: "The request was not submitted.",
      method_not_allowed: "The request was not submitted.",
      unsupported_media: "The request was not submitted.",
      unavailable: "The request was not submitted. Try again, or use the email below.",
    },
  },
  zh: {
    title: "让 Northline 进一步分析",
    intro:
      "留下姓名、邮箱，以及你想改善的地方。电话可以不填。这些信息只用于处理这次请求和相关沟通，不会默认加入营销名单。提交不代表购买、同意报价，也不会自动开始更深入的采集或分析。",
    name: "姓名（必填）",
    email: "邮箱（必填）",
    goal: "想改善什么（必填）",
    phone: "电话（选填）",
    submit: "提交需求",
    sending: "正在提交…",
    scanMissing: "请从已经完成的首页检查结果打开这个表单，这样我们才能附上那次检查。你也可以直接写信到下面的邮箱。",
    scanAttached: "已附上检查编号：",
    received: "已收到你的需求。请求编号：",
    notSent: "请求已保存。通知邮件并未送出。",
    fallbackBefore: "也可以直接写信：",
    fallbackAfter: "。这个邮箱会一直保留，作为表单无法保存时的备用入口。",
    errors: {
      validation: "请求尚未提交。请检查必填项。已填写的内容还在。",
      scan_not_found: "请求尚未提交。没有找到这次首页检查。",
      scan_expired: "请求尚未提交。这次首页检查已过期。请重新检查，或使用下面的邮箱。",
      scan_invalid: "请求尚未提交。这次首页检查无法核验。",
      scan_unavailable: "请求尚未提交。暂时无法核验这次首页检查。",
      conflict: "请求尚未提交。这个提交标识已经用于另一份内容。",
      rate_limited: "请求尚未提交。请稍后再试，或使用下面的邮箱。",
      persistence_unconfigured: "请求尚未提交。保存服务还没有配置。",
      save_failed: "请求尚未提交。已填写的内容还在。可以再试一次，或使用下面的邮箱。",
      origin_not_allowed: "请求尚未提交。",
      unauthorized: "请求尚未提交。",
      method_not_allowed: "请求尚未提交。",
      unsupported_media: "请求尚未提交。",
      unavailable: "请求尚未提交。请稍后再试，或使用下面的邮箱。",
    },
  },
} as const;

export type InquiryLocale = keyof typeof inquiryMessages;
export type InquiryErrorCode = keyof typeof inquiryMessages.en.errors;

export function inquiryCopy(locale: string | null | undefined) {
  return locale === "zh" ? inquiryMessages.zh : inquiryMessages.en;
}
