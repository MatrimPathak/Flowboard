import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { isAllowedUrl } from "./url-safety";

describe("isAllowedUrl", () => {
  test("allows public HTTP and HTTPS URLs", () => {
    assert.equal(isAllowedUrl("https://example.com/icon.png"), true);
    assert.equal(isAllowedUrl("http://assets.example.com/icon.webp"), true);
  });

  test("rejects non-HTTP protocols and malformed URLs", () => {
    assert.equal(isAllowedUrl("ftp://example.com/icon.png"), false);
    assert.equal(isAllowedUrl("not a url"), false);
  });

  test("rejects localhost and private IPv4 destinations", () => {
    assert.equal(isAllowedUrl("http://localhost/icon.png"), false);
    assert.equal(isAllowedUrl("http://127.0.0.1/icon.png"), false);
    assert.equal(isAllowedUrl("http://10.0.0.1/icon.png"), false);
    assert.equal(isAllowedUrl("http://172.16.0.1/icon.png"), false);
    assert.equal(isAllowedUrl("http://172.31.255.255/icon.png"), false);
    assert.equal(isAllowedUrl("http://192.168.1.1/icon.png"), false);
    assert.equal(isAllowedUrl("http://169.254.10.20/icon.png"), false);
  });

  test("does not block adjacent public IPv4 ranges", () => {
    assert.equal(isAllowedUrl("http://172.15.255.255/icon.png"), true);
    assert.equal(isAllowedUrl("http://172.32.0.1/icon.png"), true);
  });
});
