import test from "node:test";
import assert from "node:assert/strict";
import { assertSameOriginMutation } from "../lib/server/request-security.ts";

function command(origin, extra = {}) {
  return new Request("http://localhost:3001/api/admin/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      host: "127.0.0.1:3001",
      origin,
      "sec-fetch-site": "same-origin",
      ...extra,
    },
    body: "{}",
  });
}

test("localhost bind address does not reject the browser's actual authority", () => {
  assert.doesNotThrow(() =>
    assertSameOriginMutation(command("http://127.0.0.1:3001")),
  );
});
test("other origins, ports, protocols, and malformed origins remain blocked", () => {
  for (const origin of [
    "https://evil.example",
    "http://127.0.0.1:3002",
    "https://127.0.0.1:3001",
    "null",
    "http://127.0.0.1:3001/path",
  ]) {
    assert.throws(
      () => assertSameOriginMutation(command(origin)),
      /origin is not allowed/,
    );
  }
});
test("forwarded-host spoofing and cross-site fetches cannot bypass the check", () => {
  assert.throws(
    () =>
      assertSameOriginMutation(
        command("https://evil.example", { "x-forwarded-host": "evil.example" }),
      ),
    /origin is not allowed/,
  );
  assert.throws(
    () =>
      assertSameOriginMutation(
        command("http://127.0.0.1:3001", { "sec-fetch-site": "cross-site" }),
      ),
    /Cross-site/,
  );
  assert.throws(
    () =>
      assertSameOriginMutation(
        command("http://127.0.0.1:3001", { "content-type": "text/plain" }),
      ),
    /application\/json/,
  );
});
