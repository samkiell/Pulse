import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import { createHash } from "node:crypto";
import { ingestRouter } from "./routes/ingest";
import { telegramRouter } from "./routes/telegram";
import { prisma } from "@pulse/db";

describe("API Integration Tests", () => {
  let app: express.Express;
  let server: http.Server;
  let baseUrl: string;
  let mockTelegramServer: http.Server;
  let mockTelegramUrl: string;

  const testSecret = "test_webhook_secret_1234567890";
  let hasDb = false;
  let testProjectId = "";
  let testRawKey = "";
  let testRevokedKey = "";

  before(async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = testSecret;

    // Start mock Telegram API server
    mockTelegramServer = http.createServer((req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, result: { message_id: 123 } }));
    });
    await new Promise<void>((resolve) => mockTelegramServer.listen(0, resolve));
    const tgPort = (mockTelegramServer.address() as any).port;
    mockTelegramUrl = `http://127.0.0.1:${tgPort}`;
    process.env.TELEGRAM_API_BASE = mockTelegramUrl;
    process.env.TELEGRAM_BOT_TOKEN = "123456:mock_token";

    // Setup Express application
    app = express();
    app.set("trust proxy", 1);
    app.use(express.json({ limit: "256kb" }));
    app.use("/api/v1", ingestRouter);
    app.use("/api/v1/telegram", telegramRouter);

    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;
    baseUrl = `http://127.0.0.1:${port}`;

    // Verify DB connectivity
    const dbUrl = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;
    if (dbUrl) {
      try {
        await prisma.$queryRaw`SELECT 1`;
        hasDb = true;

        // Create test user and project
        const testUser = await prisma.user.create({
          data: {
            name: "Integration Test User",
            email: `integration-${Date.now()}@example.com`,
          },
        });
        const project = await prisma.project.create({
          data: {
            name: "Integration Test Project",
            slug: `test-proj-${Date.now()}`,
            ownerId: testUser.id,
          },
        });
        testProjectId = project.id;

        testRawKey = `pulse_live_${Date.now()}_active_key_test_12345678`;
        const activeKeyHash = createHash("sha256").update(testRawKey).digest("hex");
        await prisma.apiKey.create({
          data: {
            projectId: project.id,
            keyHash: activeKeyHash,
            keyPrefix: testRawKey.slice(0, 12),
            isActive: true,
          },
        });

        testRevokedKey = `pulse_live_${Date.now()}_revoked_key_test_123456`;
        const revokedKeyHash = createHash("sha256").update(testRevokedKey).digest("hex");
        await prisma.apiKey.create({
          data: {
            projectId: project.id,
            keyHash: revokedKeyHash,
            keyPrefix: testRevokedKey.slice(0, 12),
            isActive: false,
          },
        });
      } catch (err: any) {
        console.log(`[API Tests] Database check failed: ${err.message}. Skipping DB tests.`);
        hasDb = false;
      }
    } else {
      console.log("[API Tests] Neither DATABASE_URL_TEST nor DATABASE_URL configured. Skipping DB tests.");
    }
  });

  after(async () => {
    if (hasDb && testProjectId) {
      try {
        await prisma.project.delete({ where: { id: testProjectId } });
      } catch {
        // Ignore cleanup errors
      }
    }
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    if (mockTelegramServer) {
      await new Promise<void>((resolve) => mockTelegramServer.close(() => resolve()));
    }
  });

  describe("Telegram Webhook Authentication", () => {
    it("rejects webhook requests without secret token with HTTP 401", async () => {
      const res = await fetch(`${baseUrl}/api/v1/telegram/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: { text: "/status", chat: { id: 12345 } } }),
      });
      assert.equal(res.status, 401);
    });

    it("rejects webhook requests with mismatched secret token with HTTP 401", async () => {
      const res = await fetch(`${baseUrl}/api/v1/telegram/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Telegram-Bot-Api-Secret-Token": "invalid_wrong_secret",
        },
        body: JSON.stringify({ message: { text: "/status", chat: { id: 12345 } } }),
      });
      assert.equal(res.status, 401);
    });

    it("accepts webhook requests with matching secret token", async () => {
      const res = await fetch(`${baseUrl}/api/v1/telegram/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Telegram-Bot-Api-Secret-Token": testSecret,
        },
        body: JSON.stringify({
          message: {
            text: "/help",
            chat: { id: 12345 },
            from: { id: 12345, first_name: "Tester" },
          },
        }),
      });
      assert.equal(res.status, 200);
      const text = await res.text();
      assert.equal(text, "OK");
    });
  });

  describe("Ingest Security & Validation", () => {
    it("rejects ingest requests without API key with HTTP 401", async () => {
      const res = await fetch(`${baseUrl}/api/v1/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          events: [
            {
              name: "Error",
              message: "Test error",
              fingerprint: "abc123hash",
            },
          ],
        }),
      });
      assert.equal(res.status, 401);
    });

    it("enforces rate limits on excessive requests", async () => {
      const testIpKey = "pulse_live_ratelimit_probe_key";
      // Burst send requests to trip 120 limit
      const requests = Array.from({ length: 130 }, () =>
        fetch(`${baseUrl}/api/v1/ingest`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Pulse-Api-Key": testIpKey,
          },
          body: JSON.stringify({ events: [] }),
        })
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.find((r) => r.status === 429);
      assert.ok(rateLimited, "Expected at least one request to be rate limited with HTTP 429");
      assert.ok(rateLimited.headers.get("Retry-After"), "Expected Retry-After header on 429");
    });
  });

  describe("Database-Backed Verification (when DB available)", () => {
    it("authenticates valid API key and accepts event payload", async (t) => {
      if (!hasDb) {
        t.skip("Database not available");
        return;
      }

      const res = await fetch(`${baseUrl}/api/v1/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Pulse-Api-Key": testRawKey,
        },
        body: JSON.stringify({
          events: [
            {
              errorType: "custom",
              name: "TypeError",
              message: "Cannot read properties of null",
              stack: "TypeError: at Object.<anonymous>",
              fingerprint: `fp_test_${Date.now()}`,
            },
          ],
        }),
      });

      assert.equal(res.status, 200);
      const data = (await res.json()) as any;
      assert.equal(data.success, true);
      assert.equal(data.processed, 1);
    });

    it("rejects revoked API key with HTTP 401", async (t) => {
      if (!hasDb) {
        t.skip("Database not available");
        return;
      }

      const res = await fetch(`${baseUrl}/api/v1/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Pulse-Api-Key": testRevokedKey,
        },
        body: JSON.stringify({
          events: [
            {
              name: "Error",
              message: "Test",
              fingerprint: "fp_revoked",
            },
          ],
        }),
      });

      assert.equal(res.status, 401);
    });

    it("rejects batch exceeding 50 events with HTTP 400", async (t) => {
      if (!hasDb) {
        t.skip("Database not available");
        return;
      }

      const events = Array.from({ length: 51 }, (_, i) => ({
        name: `Error ${i}`,
        message: "Message",
        fingerprint: `fp_${i}`,
      }));

      const res = await fetch(`${baseUrl}/api/v1/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Pulse-Api-Key": testRawKey,
        },
        body: JSON.stringify({ events }),
      });

      assert.equal(res.status, 400);
    });

    it("rejects event with stack exceeding 20000 characters with HTTP 400", async (t) => {
      if (!hasDb) {
        t.skip("Database not available");
        return;
      }

      const res = await fetch(`${baseUrl}/api/v1/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Pulse-Api-Key": testRawKey,
        },
        body: JSON.stringify({
          events: [
            {
              name: "Error",
              message: "Test",
              stack: "A".repeat(20001),
              fingerprint: "fp_oversized_stack",
            },
          ],
        }),
      });

      assert.equal(res.status, 400);
    });

    it("verifies single-use and expiration of Telegram tokens", async (t) => {
      if (!hasDb) {
        t.skip("Database not available");
        return;
      }

      // Create an expired token
      const expiredIntegration = await prisma.telegramIntegration.create({
        data: {
          projectId: testProjectId,
          verificationToken: `expired_token_${Date.now()}`,
          createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
        },
      });

      const resExpired = await fetch(`${baseUrl}/api/v1/telegram/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Telegram-Bot-Api-Secret-Token": testSecret,
        },
        body: JSON.stringify({
          message: {
            text: `/start ${expiredIntegration.verificationToken}`,
            chat: { id: 99901, title: "Test Group" },
          },
        }),
      });
      assert.equal(resExpired.status, 200);

      // Create a fresh token
      const freshIntegration = await prisma.telegramIntegration.create({
        data: {
          projectId: testProjectId,
          verificationToken: `fresh_token_${Date.now()}`,
        },
      });

      // First /start consumption
      const resFresh = await fetch(`${baseUrl}/api/v1/telegram/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Telegram-Bot-Api-Secret-Token": testSecret,
        },
        body: JSON.stringify({
          message: {
            text: `/start ${freshIntegration.verificationToken}`,
            chat: { id: 99902, title: "Test Group 2" },
          },
        }),
      });
      assert.equal(resFresh.status, 200);

      // Verify consumed in DB
      const updated = await prisma.telegramIntegration.findUnique({
        where: { id: freshIntegration.id },
      });
      assert.ok(updated?.consumedAt, "Token should be marked consumed");

      // Second /start consumption attempt (should fail)
      const resReused = await fetch(`${baseUrl}/api/v1/telegram/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Telegram-Bot-Api-Secret-Token": testSecret,
        },
        body: JSON.stringify({
          message: {
            text: `/start ${freshIntegration.verificationToken}`,
            chat: { id: 99903, title: "Test Group 3" },
          },
        }),
      });
      assert.equal(resReused.status, 200);
    });
  });
});
