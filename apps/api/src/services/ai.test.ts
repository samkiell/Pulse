import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  diagnoseError,
  generateRuleBasedDiagnosis,
  scrubSecrets,
  scrubMetadata,
} from "./ai";

describe("Pulse AI Diagnosis Service", () => {
  test("generates fallback diagnosis for null pointer/undefined errors when API key not set", async () => {
    const result = await diagnoseError(
      "TypeError",
      "Cannot read properties of undefined (reading 'session')"
    );

    assert.strictEqual(result.source, "heuristic");
    assert.ok(result.diagnosis.includes("undefined or null variable"));
    assert.ok(result.suggestedFix.includes("optional chaining"));
  });

  test("generates fallback diagnosis for connection refused/timeout errors", async () => {
    const result = await diagnoseError(
      "ConnectionError",
      "connect ECONNREFUSED 127.0.0.1:5432"
    );

    assert.strictEqual(result.source, "heuristic");
    assert.ok(result.diagnosis.includes("Connection") || result.diagnosis.includes("unreachable"));
    assert.ok(result.suggestedFix.includes("Verify target host") || result.suggestedFix.includes("credentials"));
  });

  test("tightened connection heuristic ignores broad 'connect' without error codes", () => {
    // "connecting users to rooms" should not be diagnosed as network failure
    const generic = generateRuleBasedDiagnosis("InfoError", "Failed while connecting users to rooms");
    assert.ok(!generic.diagnosis.includes("Upstream target service"));

    // Real network failures should be detected
    const timedOut = generateRuleBasedDiagnosis("TimeoutError", "Socket connect ETIMEDOUT 10.0.0.5");
    assert.ok(timedOut.diagnosis.includes("Connection failed"));

    const dnsFail = generateRuleBasedDiagnosis("DnsError", "getaddrinfo ENOTFOUND api.service.internal");
    assert.ok(dnsFail.diagnosis.includes("Connection failed"));
  });

  test("generates fallback diagnosis for JSON syntax errors", async () => {
    const result = await diagnoseError(
      "SyntaxError",
      "Unexpected token '<', '<!DOCTYPE '... is not valid JSON"
    );

    assert.strictEqual(result.source, "heuristic");
    assert.ok(result.diagnosis.includes("JSON"));
    assert.ok(result.suggestedFix.includes("try/catch") || result.suggestedFix.includes("validate"));
  });

  test("scrubs sensitive tokens, keys, emails, and credentials from text", () => {
    const raw = `
      Error processing request with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-IDc
      Using key pulse_live_a1b2c3d4e5f60718293a4b5c6d7e8f90
      Contact admin@rumptycloud.com for password="super_secret_pass123"
      Hash: 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
      Token: apiKey: 'live_sec_9988776655'
    `;

    const scrubbed = scrubSecrets(raw);

    assert.ok(!scrubbed.includes("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"));
    assert.ok(scrubbed.includes("Bearer [REDACTED]"));
    assert.ok(!scrubbed.includes("pulse_live_a1b2c3d4e5f60718293a4b5c6d7e8f90"));
    assert.ok(scrubbed.includes("pulse_live_[REDACTED]"));
    assert.ok(!scrubbed.includes("admin@rumptycloud.com"));
    assert.ok(scrubbed.includes("[EMAIL_REDACTED]"));
    assert.ok(!scrubbed.includes("super_secret_pass123"));
    assert.ok(!scrubbed.includes("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"));
    assert.ok(scrubbed.includes("[HEX_REDACTED]"));
  });

  test("scrubs metadata objects recursively", () => {
    const metadata = {
      user: {
        id: "usr_1",
        email: "alice@example.com",
        passwordHash: "hash_value_12345",
      },
      headers: {
        authorization: "Bearer secret",
        cookie: "session=abc",
        host: "api.example.com",
      },
      apiKey: "pulse_live_secretkey",
    };

    const clean = scrubMetadata(metadata);
    assert.ok(clean);
    assert.strictEqual(clean.user.passwordHash, "[REDACTED]");
    assert.strictEqual(clean.headers.authorization, "[REDACTED]");
    assert.strictEqual(clean.headers.cookie, "[REDACTED]");
    assert.strictEqual(clean.apiKey, "[REDACTED]");
    assert.strictEqual(clean.headers.host, "api.example.com");
  });
});
