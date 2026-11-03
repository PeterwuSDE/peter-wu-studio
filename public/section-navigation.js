/* These pages are static exports. Fragment navigation must not request an RSC
 * route or repeatedly restore the selected section after a visitor scrolls. */
(function () {
  var page = new URL(window.location.href);
  function sameDocument(url) {
    return url.origin === page.origin && url.pathname === page.pathname && url.search === page.search;
  }
  function targetFor(hash) {
    var id;
    try { id = decodeURIComponent(hash.slice(1)); } catch (_) { return null; }
    return document.getElementById(id);
  }
  function jump(target) {
    var padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    var margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    window.scrollTo({ top: Math.max(0, target.getBoundingClientRect().top + window.scrollY - padding - margin), behavior: "instant" });
  }
  // Save only when scrolling finishes. This never moves the page or blocks input.
  document.addEventListener("scrollend", function () {
    var state = Object.assign({}, window.history.state);
    state.__northlineScroll = [window.scrollX, window.scrollY];
    window.history.replaceState(state, "", window.location.href);
  });
  document.addEventListener("click", function (event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var link = event.target && event.target.closest && event.target.closest("a[href]");
    if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
    var url = new URL(link.href, window.location.href);
    if (!sameDocument(url) || !url.hash) return;
    var target = targetFor(url.hash);
    if (!target) return;
    event.preventDefault();
    link.blur();
    if (window.location.hash !== url.hash) {
      var previous = Object.assign({}, window.history.state);
      previous.__northlineScroll = [window.scrollX, window.scrollY];
      window.history.replaceState(previous, "", window.location.href);
      var next = Object.assign({}, previous);
      delete next.__northlineScroll;
      window.history.pushState(next, "", url.pathname + url.search + url.hash);
    }
    jump(target);
  }, true);
  window.addEventListener("popstate", function (event) {
    if (!sameDocument(new URL(window.location.href))) return;
    // Vinext's dynamic traversal handler cannot run on this static host.
    event.stopImmediatePropagation();
    var saved = event.state && event.state.__northlineScroll;
    if (Array.isArray(saved) && saved.length === 2 && saved.every(Number.isFinite)) {
      window.scrollTo({ left: saved[0], top: saved[1], behavior: "instant" });
      return;
    }
    var target = targetFor(window.location.hash);
    if (target) jump(target);
    else if (!window.location.hash) window.scrollTo({ top: 0, behavior: "instant" });
  }, true);
})();

