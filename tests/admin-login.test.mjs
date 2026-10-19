import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolveAdminLoginEmail } from "../lib/business/admin-login.ts";
test("admin username resolves to its Supabase identity without accepting unknown usernames", () => {
  assert.equal(
    resolveAdminLoginEmail(" admin123 "),
    "admin123@truecolours.internal",
  );
  assert.equal(
    resolveAdminLoginEmail("ADMIN123"),
    "admin123@truecolours.internal",
  );
  assert.equal(resolveAdminLoginEmail("someone-else"), null);
  assert.equal(resolveAdminLoginEmail(""), null);
  assert.equal(
    resolveAdminLoginEmail("Staff@Example.com"),
    "staff@example.com",
  );
});
test("configured aliases resolve only to their configured identity", () => {
  assert.equal(
    resolveAdminLoginEmail("shopadmin", "shopadmin", "manager@example.com"),
    "manager@example.com",
  );
  assert.equal(
    resolveAdminLoginEmail("admin123", "shopadmin", "manager@example.com"),
    null,
  );
});
test("admin form uses the server login endpoint and contains no Google sign-in or embedded password", async () => {
  const source = await readFile(
    new URL("../app/admin/login/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /name="username"/);
  assert.match(source, /\/api\/admin\/login/);
  assert.doesNotMatch(
    source,
    /signInWithGoogle|Continue with Google|123456789/,
  );
});
