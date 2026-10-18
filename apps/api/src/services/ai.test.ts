import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { diagnoseError } from "./ai";

describe("Pulse AI Diagnosis Service", () => {
  test("generates fallback diagnosis for null pointer/undefined errors when API key not set", async () => {
    const result = await diagnoseError(
      "TypeError",
      "Cannot read properties of undefined (reading 'session')"
    );

    assert.ok(result.diagnosis.includes("undefined or null variable"));
    assert.ok(result.suggestedFix.includes("optional chaining"));
  });

  test("generates fallback diagnosis for connection refused/timeout errors", async () => {
    const result = await diagnoseError(
      "ConnectionError",
      "connect ECONNREFUSED 127.0.0.1:5432"
    );

    assert.ok(result.diagnosis.includes("Connection refused") || result.diagnosis.includes("offline"));
    assert.ok(result.suggestedFix.includes("Verify host"));
  });

  test("generates fallback diagnosis for JSON syntax errors", async () => {
    const result = await diagnoseError(
      "SyntaxError",
      "Unexpected token '<', '<!DOCTYPE '... is not valid JSON"
    );

    assert.ok(result.diagnosis.includes("JSON"));
    assert.ok(result.suggestedFix.includes("try/catch") || result.suggestedFix.includes("validate"));
  });
});

