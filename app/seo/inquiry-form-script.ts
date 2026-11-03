export const inquiryFormScript = `(function () {
  var SCAN_KEY = "nl-seo-scan";
  var pageScan = "";

  function readConfig() {
    var configNode = document.getElementById("seo-inquiry-config");
    var messageNode = document.getElementById("seo-inquiry-messages");
    if (!configNode || !messageNode) return null;
    try {
      return {
        config: JSON.parse(configNode.textContent || "{}"),
        messages: JSON.parse(messageNode.textContent || "{}")
      };
    } catch (error) {
      return null;
    }
  }

  var sawUrl = false;

  function currentVisit() {
    var params = new URLSearchParams(location.search);
    var urlScan = params.get("scan") || "";
    if (!/^[A-Za-z0-9._-]{8,128}$/.test(urlScan) || urlScan.indexOf("..") !== -1) urlScan = "";
    var locale = "en";
    if (params.get("locale") === "zh") locale = "zh";
    else if (!params.has("locale") && (document.documentElement.lang || "").toLowerCase().indexOf("zh") === 0) locale = "zh";
    if (!sawUrl) {
      sawUrl = true;
      pageScan = urlScan;
      try {
        if (urlScan) sessionStorage.setItem(SCAN_KEY, urlScan);
        else sessionStorage.removeItem(SCAN_KEY);
      } catch (error) {}
    } else if (urlScan) {
      pageScan = urlScan;
      try { sessionStorage.setItem(SCAN_KEY, urlScan); } catch (error) {}
    }
    return { scan: urlScan || pageScan, locale: locale };
  }

  currentVisit();

  function createSubmissionId() {
    var bytes = new Uint8Array(16);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(bytes);
    else for (var index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
    var hex = "";
    for (var index = 0; index < bytes.length; index += 1) {
      hex += bytes[index].toString(16).padStart(2, "0");
    }
    return hex;
  }

  function submissionIdFor(scan) {
    var key = "nl-seo-inquiry:" + scan;
    var existing = "";
    try { existing = sessionStorage.getItem(key) || ""; } catch (error) { existing = ""; }
    if (!/^[A-Za-z0-9_-]{16,80}$/.test(existing)) {
      existing = createSubmissionId();
      try { sessionStorage.setItem(key, existing); } catch (error) {}
    }
    return existing;
  }

  function apply(form) {
    var data = readConfig();
    if (!data || !form) return null;
    var visit = currentVisit();
    var copy = data.messages[visit.locale] || data.messages.en;
    if (!copy) return null;
    document.querySelectorAll("[data-i18n]").forEach(function (node) {
      var key = node.getAttribute("data-i18n");
      if (key && typeof copy[key] === "string") node.textContent = copy[key];
    });
    var scanInput = document.getElementById("seo-inquiry-scan-reference");
    var submissionInput = document.getElementById("seo-inquiry-submission-id");
    var localeInput = document.getElementById("seo-inquiry-locale");
    var scanNote = document.getElementById("seo-inquiry-scan-note");
    if (localeInput) localeInput.value = visit.locale;
    if (scanInput) scanInput.value = visit.scan;
    if (submissionInput) submissionInput.value = visit.scan ? submissionIdFor(visit.scan) : "";
    if (scanNote) scanNote.textContent = visit.scan ? copy.scanAttached + " " + visit.scan : copy.scanMissing;
    return { copy: copy, config: data.config, visit: visit };
  }

  document.addEventListener("submit", function (event) {
    var form = event.target;
    if (!form || form.id !== "seo-inquiry") return;
    event.preventDefault();
    if (form.getAttribute("data-inquiry-state") === "received") return;
    var state = apply(form);
    var errorBox = document.getElementById("seo-inquiry-error");
    var successBox = document.getElementById("seo-inquiry-success");
    var submitButton = document.getElementById("seo-inquiry-submit");
    if (!state || !errorBox || !successBox || !submitButton) return;

    function showError(text) {
      successBox.hidden = true;
      errorBox.hidden = false;
      errorBox.textContent = text;
      errorBox.focus();
    }

    if (!state.visit.scan || !document.getElementById("seo-inquiry-submission-id").value) {
      showError(state.copy.scanMissing);
      return;
    }
    if (typeof form.reportValidity === "function" && !form.reportValidity()) return;

    errorBox.hidden = true;
    submitButton.disabled = true;
    submitButton.textContent = state.copy.sending;
    var payload = {
      scanReference: state.visit.scan,
      submissionId: document.getElementById("seo-inquiry-submission-id").value,
      name: form.elements.name.value,
      email: form.elements.email.value,
      goal: form.elements.goal.value,
      phone: form.elements.phone.value,
      locale: state.visit.locale
    };

    fetch(state.config.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(payload)
    }).then(function (response) {
      return response.json().then(function (body) { return body; }).catch(function () { return {}; });
    }).then(function (body) {
      if (body && body.received === true && typeof body.inquiryId === "string") {
        errorBox.hidden = true;
        successBox.hidden = false;
        var text = state.copy.received + " " + body.inquiryId;
        if (!body.notification || body.notification.delivered !== true) text += " " + state.copy.notSent;
        successBox.textContent = text;
        form.setAttribute("data-inquiry-state", "received");
        submitButton.disabled = true;
        submitButton.textContent = state.copy.submit;
        successBox.focus();
        return;
      }
      submitButton.disabled = false;
      submitButton.textContent = state.copy.submit;
      var errors = state.copy.errors || {};
      showError(errors[body && body.error] || errors.save_failed || state.copy.scanMissing);
    }).catch(function () {
      submitButton.disabled = false;
      submitButton.textContent = state.copy.submit;
      showError((state.copy.errors && state.copy.errors.save_failed) || state.copy.scanMissing);
    });
  }, true);

  var applying = false;
  function boot() {
    if (applying) return;
    applying = true;
    try { apply(document.getElementById("seo-inquiry")); }
    finally { applying = false; }
  }
  if (document.readyState === "complete") boot();
  else window.addEventListener("load", boot);
  [0, 250, 700, 1500, 2500].forEach(function (delay) { setTimeout(boot, delay); });
})();`;
