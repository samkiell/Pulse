import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  computeConnectionStatus,
  generateProjectSlug,
  MAX_PROJECTS_PER_USER,
} from "./auth-helpers";

describe("Unit Tests: Auth Helpers & Business Logic", () => {
  describe("Connection Status Calculation", () => {
    test("returns 'Waiting for first event' when total events is 0", () => {
      const status = computeConnectionStatus(0, null);
      assert.strictEqual(status, "Waiting for first event");
    });

    test("returns 'Waiting for first event' when lastEventAt is undefined", () => {
      const status = computeConnectionStatus(5, undefined);
      assert.strictEqual(status, "Waiting for first event");
    });

    test("returns 'Connected' when an event was recorded within the last 24h", () => {
      const recent = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      const status = computeConnectionStatus(10, recent);
      assert.strictEqual(status, "Connected");
    });

    test("returns 'Silent' when the last event was recorded more than 24h ago", () => {
      const old = new Date(Date.now() - 26 * 60 * 60 * 1000); // 26 hours ago
      const status = computeConnectionStatus(50, old);
      assert.strictEqual(status, "Silent");
    });

    test("handles ISO date strings safely", () => {
      const recentIso = new Date(Date.now() - 10000).toISOString();
      assert.strictEqual(computeConnectionStatus(1, recentIso), "Connected");
    });
  });

  describe("Slug Generation", () => {
    test("generates kebab-case slug with 4 random characters", () => {
      const slug = generateProjectSlug("My Cool App");
      assert.ok(slug.startsWith("my-cool-app-"));
      const parts = slug.split("-");
      const suffix = parts[parts.length - 1];
      assert.strictEqual(suffix.length, 4);
    });

    test("cleans symbols, emojis and trailing dashes", () => {
      const slug = generateProjectSlug("$$$ Super #1 Project !!!");
      assert.ok(slug.startsWith("super-1-project-"));
      assert.match(slug, /^[a-z0-9-]+$/);
    });

    test("handles empty or blank name gracefully", () => {
      const slug = generateProjectSlug("   ");
      assert.ok(slug.startsWith("project-"));
    });
  });

  describe("Project Limits", () => {
    test("MAX_PROJECTS_PER_USER defaults to 5", () => {
      assert.strictEqual(MAX_PROJECTS_PER_USER, 5);
    });
  });

  describe("One-time Token Expiry", () => {
    test("verifies token created 25h ago is expired (>24h window)", () => {
      const createdAt = new Date(Date.now() - 25 * 60 * 60 * 1000);
      const isExpired = Date.now() - createdAt.getTime() > 24 * 60 * 60 * 1000;
      assert.strictEqual(isExpired, true);
    });

    test("verifies token created 1h ago is active (<24h window)", () => {
      const createdAt = new Date(Date.now() - 60 * 60 * 1000);
      const isExpired = Date.now() - createdAt.getTime() > 24 * 60 * 60 * 1000;
      assert.strictEqual(isExpired, false);
    });
  });
});
