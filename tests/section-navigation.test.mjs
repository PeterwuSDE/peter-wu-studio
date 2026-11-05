import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';

const script = await readFile(new URL('../public/section-navigation.js', import.meta.url), 'utf8');
function page(path = '/websites') {
  const listeners = [], calls = [], location = new URL('https://www.nlstudio.io' + path);
  const window = { location, scrollX: 0, scrollY: 100, addEventListener(type, fn, capture) { listeners.push({ type, fn, capture }); }, scrollTo(value) { calls.push(value); this.scrollY = value.top; } };
  const history = { state: { framework: 'preserve me' }, pushState(state, unused, url) { this.state = state; location.href = new URL(url, location).href; }, replaceState(state) { this.state = state; } };
  window.history = history;
  const targets = { scope: { top: 1000, margin: '72px' }, work: { top: 900, margin: '25px' }, top: { top: 0, margin: '0px' } };
  const document = { documentElement: {}, addEventListener: window.addEventListener, getElementById(id) { const target = targets[id]; return target && { margin: target.margin, getBoundingClientRect() { return { top: target.top - window.scrollY }; } }; } };
  vm.runInNewContext(script, { window, document, URL, getComputedStyle: element => ({ scrollPaddingTop: '92px', scrollMarginTop: element.margin }) });
  function click(href, overrides = {}, attributes = {}) {
    const link = { href: new URL(href, location).href, target: attributes.target || '', hasAttribute: name => Boolean(attributes[name]), blur() {} };
    const event = { defaultPrevented: false, button: 0, target: { closest: () => link }, preventDefault() { this.defaultPrevented = true; }, ...overrides };
    listeners.filter(l => l.type === 'click').forEach(l => l.fn(event));
    return event;
  }
  function traverse(hash, state = null) {
    location.hash = hash;
    const event = { state, stopped: false, stopImmediatePropagation() { this.stopped = true; } };
    event.routerCalls = 0;
    const handlers = [...listeners.filter(l => l.type === 'popstate'), { capture: false, fn() { event.routerCalls++; } }];
    handlers.sort((a, b) => Number(b.capture === true) - Number(a.capture === true));
    for (const listener of handlers) { if (event.stopped) break; listener.fn(event); }
    return event;
  }
  const scrollend = () => listeners.filter(l => l.type === 'scrollend').forEach(l => l.fn({}));
  return { window, listeners, calls, history, click, traverse, scrollend };
}

test('section click moves once, updates the hash and leaves later manual scrolling alone', () => {
  const p = page();
  assert.equal(p.click('#scope').defaultPrevented, true);
  assert.equal(p.window.location.hash, '#scope');
  assert.equal(p.calls.length, 1);
  assert.equal(p.window.scrollY, 836);
  assert.equal(p.history.state.framework, 'preserve me');
  p.window.scrollY += 250;
  assert.equal(p.window.scrollY, 1086);
  assert.equal(p.calls.length, 1);
  assert.ok(!p.listeners.some(l => ['scroll', 'wheel', 'touchmove'].includes(l.type)));
});
test('homepage absolute hash links use the same local jump path', () => {
  const p = page('/');
  assert.equal(p.click('/#work').defaultPrevented, true);
  assert.equal(p.window.scrollY, 783);
});
test('same-page history traversal does not reach the dynamic router', () => {
  const p = page();
  const event = p.traverse('#scope');
  assert.equal(event.stopped, true);
  assert.equal(event.routerCalls, 0);
  assert.ok(p.listeners.some(l => l.type === 'popstate' && l.capture === true));
  assert.equal(p.window.scrollY, 836);
});
test('history restores a saved position rather than following a hash repeatedly', () => {
  const p = page();
  p.traverse('#scope', { __northlineScroll: [0, 450] });
  assert.equal(p.window.scrollY, 450);
  assert.equal(p.calls.length, 1);
});
test('other pages, missing targets, modified clicks and downloads keep native navigation', () => {
  const p = page();
  for (const [href, overrides] of [['/care#plans', {}], ['#missing', {}], ['#scope', { ctrlKey: true }], ['#scope', { button: 1 }]]) {
    assert.equal(p.click(href, overrides).defaultPrevented, false);
  }
  assert.equal(p.click('#scope', {}, { download: true }).defaultPrevented, false);
  assert.equal(p.click('#scope', {}, { target: '_blank' }).defaultPrevented, false);
  assert.equal(p.calls.length, 0);
});

test('different-document traversal remains available to other navigation handlers', () => {
  for (const url of ['https://www.nlstudio.io/tools', 'https://www.nlstudio.io/websites?view=other', 'https://example.com/websites']) {
    const p = page(); p.window.location.href = url;
    const event = p.traverse('#scope');
    assert.equal(event.stopped, false);
    assert.equal(event.routerCalls, 1);
    assert.equal(p.calls.length, 0);
  }
});
test('finishing a manual scroll saves history without initiating another scroll', () => {
  const p = page(); p.click('#scope');
  p.window.scrollY = 1100; p.scrollend();
  assert.equal(p.calls.length, 1);
  assert.equal(p.history.state.__northlineScroll[1], 1100);
  assert.equal(p.history.state.framework, 'preserve me');
  p.traverse('#scope', p.history.state);
  assert.equal(p.window.scrollY, 1100);
});
