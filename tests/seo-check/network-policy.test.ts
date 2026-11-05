import assert from "node:assert/strict";
import test from "node:test";
import { escapeHtml } from "../../shared/seo-check/contract.ts";
import { isPublicIp, normalizePublicUrl } from "../../shared/seo-check/network-policy.ts";

test("public and non-public addresses are classified", () => {
  for (const address of ["1.1.1.1", "8.8.8.8", "93.184.216.34", "2606:4700:4700::1111", "::ffff:1.1.1.1"]) {
    assert.equal(isPublicIp(address), true, address);
  }
  for (const address of [
    "0.0.0.0",
    "10.1.2.3",
    "100.64.0.1",
    "127.0.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "192.168.1.1",
    "192.0.2.1",
    "224.0.0.1",
    "255.255.255.255",
    "::1",
    "::",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1",
    "::ffff:a9fe:a9fe",
    "fd00::1",
    "fe80::1",
    "2002:7f00:1::",
    "64:ff9b::7f00:1",
    "2001:db8::1",
  ]) {
    assert.equal(isPublicIp(address), false, address);
  }
});

test("normalization keeps the subdirectory, drops the fragment, and defaults to https", () => {
  const shop = normalizePublicUrl("Example.com/Shop/");
  assert.equal(shop.ok, true);
  if (shop.ok) assert.equal(shop.normalized, "https://example.com/Shop/");

  const fragment = normalizePublicUrl("https://example.com/shop#@127.0.0.1");
  assert.equal(fragment.ok, true);
  if (fragment.ok) assert.equal(fragment.normalized, "https://example.com/shop");

  const root = normalizePublicUrl("https://example.com");
  const slash = normalizePublicUrl("https://example.com/");
  assert.equal(root.ok && slash.ok && root.normalized === slash.normalized, true);
});

test("credentials, private literals, odd ports, and local names are rejected", () => {
  const credential = normalizePublicUrl("https://user:s3cret@example.com/shop");
  assert.equal(credential.ok, false);
  if (!credential.ok) {
    assert.equal(credential.code, "blocked_target");
    assert.equal(credential.sanitized.includes("s3cret"), false);
    assert.equal(credential.sanitized, "https://example.com/shop");
  }

  for (const input of [
    "http://127.0.0.1/admin",
    "http://2130706433/latest",
    "http://127.1/",
    "http://0x7f.0.0.1/",
    "http://0177.0.0.1/",
    "http://[::1]/",
    "http://[::ffff:127.0.0.1]/",
    "http://169.254.169.254/latest/meta-data",
    "http://0/",
    "https://example.com:8443/a",
    "http://example.com:443/",
    "http://localhost/secret",
    "http://foo.localhost/",
    "http://metadata.google.internal/",
    "javascript:alert(1)",
    "file:///etc/passwd",
  ]) {
    const result = normalizePublicUrl(input);
    assert.equal(result.ok, false, input);
  }
});

test("escapeHtml encodes the five markup characters", () => {
  assert.equal(escapeHtml(`a & b <c> "d" 'e'`), "a &amp; b &lt;c&gt; &quot;d&quot; &#39;e&#39;");
});
