import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { pulse } from "./index";

describe("Pulse SDK Client", () => {
  beforeEach(() => {
    // Reset or configure test credentials
    pulse.init({
      apiKey: "pulse_test_key_123456",
      endpoint: "http://localhost:4000/api/v1/ingest",
      debug: false,
      captureUncaughtExceptions: false,
      captureUnhandledRejections: false,
      flushIntervalMs: 60000,
    });
  });

  test("captures standard Error instances with metadata", () => {
    const err = new Error("Database query timed out");
    err.name = "DatabaseTimeout";

    // capture should not throw
    assert.doesNotThrow(() => {
      pulse.captureError(err, { query: "SELECT * FROM users", durationMs: 5000 });
    });
  });

  test("captures string and custom object errors gracefully", () => {
    assert.doesNotThrow(() => {
      pulse.captureError("Raw string exception occurred");
    });

    assert.doesNotThrow(() => {
      pulse.captureError({ code: 500, status: "Internal Server Error" });
    });
  });

  test("provides express error-handling middleware that passes through next(err)", (t, done) => {
    const middleware = pulse.errorHandler();
    const mockReq = {
      originalUrl: "/api/users/profile",
      method: "GET",
      ip: "127.0.0.1",
      headers: { "user-agent": "PulseAgent" },
    };
    const mockRes = {};
    const testErr = new Error("Route failed");

    middleware(testErr, mockReq, mockRes, (err) => {
      assert.strictEqual(err, testErr);
      done();
    });
  });
});
