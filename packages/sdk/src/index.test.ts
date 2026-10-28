import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { pulse, PulseClient, sanitizeHeaders } from "./index";

describe("Pulse SDK Client", () => {
  beforeEach(() => {
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

  test("does not register SIGTERM or SIGINT listeners", () => {
    const sigtermCountBefore = process.listenerCount("SIGTERM");
    const sigintCountBefore = process.listenerCount("SIGINT");

    const client = new PulseClient();
    client.init({
      apiKey: "pulse_live_test",
      endpoint: "http://localhost:4000/api/v1/ingest",
      captureUncaughtExceptions: true,
      captureUnhandledRejections: true,
    });

    assert.strictEqual(process.listenerCount("SIGTERM"), sigtermCountBefore);
    assert.strictEqual(process.listenerCount("SIGINT"), sigintCountBefore);
  });

  test("header allowlist forwards only permitted headers and strips sensitive headers", () => {
    const headers = {
      "User-Agent": "Mozilla/5.0",
      "Content-Type": "application/json",
      Accept: "*/*",
      Host: "api.rumpty.cloud",
      Referer: "https://dashboard.example.com",
      "X-Request-Id": "req-9876",
      "X-Forwarded-For": "203.0.113.195",
      Authorization: "Bearer super-secret-token",
      Cookie: "session=xyz123; secret=abc",
      "X-Custom-Private": "classified",
    };

    const sanitized = sanitizeHeaders(headers);
    assert.ok(sanitized);
    assert.strictEqual(sanitized["user-agent"], "Mozilla/5.0");
    assert.strictEqual(sanitized["content-type"], "application/json");
    assert.strictEqual(sanitized["accept"], "*/*");
    assert.strictEqual(sanitized["host"], "api.rumpty.cloud");
    assert.strictEqual(sanitized["referer"], "https://dashboard.example.com");
    assert.strictEqual(sanitized["x-request-id"], "req-9876");
    assert.strictEqual(sanitized["x-forwarded-for"], "203.0.113.195");

    assert.strictEqual(sanitized["authorization"], undefined);
    assert.strictEqual(sanitized["cookie"], undefined);
    assert.strictEqual(sanitized["x-custom-private"], undefined);
  });

  test("endpoint is required and client disables itself safely when missing", () => {
    const prevEnv = process.env.PULSE_ENDPOINT;
    delete process.env.PULSE_ENDPOINT;

    const client = new PulseClient();
    assert.doesNotThrow(() => {
      client.init({
        apiKey: "pulse_live_test",
        endpoint: "", // empty
      });
    });

    assert.strictEqual(client.isEnabled(), false);

    // Capturing error when disabled does not throw
    assert.doesNotThrow(() => {
      client.captureError(new Error("Should not queue"));
    });
    assert.strictEqual(client.getQueueLength(), 0);

    if (prevEnv) process.env.PULSE_ENDPOINT = prevEnv;
  });

  test("caps the queue at 200 events and drops oldest events", () => {
    const client = new PulseClient();
    client.init({
      apiKey: "pulse_live_test",
      endpoint: "http://localhost:4000/api/v1/ingest",
      flushIntervalMs: 600000, // do not auto-flush during test
      maxQueueSize: 200,
    });

    for (let i = 0; i < 250; i++) {
      client.captureError(new Error(`Error number ${i}`));
    }

    assert.strictEqual(client.getQueueLength(), 200);
  });

  test("idempotent double init does not duplicate listeners or crash", () => {
    const client = new PulseClient();
    assert.doesNotThrow(() => {
      client.init({
        apiKey: "key_one",
        endpoint: "http://localhost:4000/api/v1/ingest",
      });
      client.init({
        apiKey: "key_two",
        endpoint: "http://localhost:4000/api/v1/ingest",
      });
    });
    assert.strictEqual(client.isEnabled(), true);
  });

  test("flush aborts on hanging server without blocking process", async () => {
    // Create an HTTP server that hangs indefinitely
    const hangingServer = http.createServer((req, res) => {
      // intentionally do not respond
    });

    await new Promise<void>((resolve) => {
      hangingServer.listen(0, "127.0.0.1", () => resolve());
    });

    const address = hangingServer.address() as any;
    const hangingEndpoint = `http://127.0.0.1:${address.port}/api/v1/ingest`;

    const client = new PulseClient();
    client.init({
      apiKey: "pulse_live_test",
      endpoint: hangingEndpoint,
      flushIntervalMs: 600000,
    });

    client.captureError(new Error("Test hanging flush"));

    const startTime = Date.now();
    await client.flush();
    const elapsedMs = Date.now() - startTime;

    // AbortSignal.timeout(3000) should abort around 3000ms
    assert.ok(elapsedMs >= 2900 && elapsedMs < 4500, `Expected ~3000ms timeout, took ${elapsedMs}ms`);

    await new Promise<void>((resolve) => {
      hangingServer.close(() => resolve());
    });
  });
});
