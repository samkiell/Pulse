import { describe, it } from "node:test";
import assert from "node:assert";
import { decideAlert } from "./anomaly";

describe("Incident Alert Decision Engine", () => {
  const windowMs = 5 * 60 * 1000; // 5 minutes

  it("alerts on brand new incident (null existing)", () => {
    const now = new Date("2026-10-31T12:00:00Z");
    const decision = decideAlert(null, now, windowMs);
    assert.strictEqual(decision.shouldAlert, true);
    assert.strictEqual(decision.nextStatus, "OPEN");
    assert.strictEqual(decision.isRegression, false);
  });

  it("suppresses alerts when incident is MUTED", () => {
    const now = new Date("2026-10-31T12:00:00Z");
    const existing = {
      status: "MUTED",
      lastAlertedAt: new Date("2026-10-31T10:00:00Z"), // well past debounce window
    };
    const decision = decideAlert(existing, now, windowMs);
    assert.strictEqual(decision.shouldAlert, false);
    assert.strictEqual(decision.nextStatus, "MUTED");
    assert.strictEqual(decision.isRegression, false);
  });

  it("alerts immediately and reopens when incident is RESOLVED (regression)", () => {
    const now = new Date("2026-10-31T12:00:00Z");
    const existing = {
      status: "RESOLVED",
      lastAlertedAt: new Date("2026-10-31T11:59:00Z"), // within debounce window
    };
    const decision = decideAlert(existing, now, windowMs);
    assert.strictEqual(decision.shouldAlert, true);
    assert.strictEqual(decision.nextStatus, "OPEN");
    assert.strictEqual(decision.isRegression, true);
  });

  it("suppresses alerts for OPEN incident within debounce window", () => {
    const now = new Date("2026-10-31T12:00:00Z");
    const existing = {
      status: "OPEN",
      lastAlertedAt: new Date("2026-10-31T11:58:00Z"), // 2 minutes ago < 5 min
    };
    const decision = decideAlert(existing, now, windowMs);
    assert.strictEqual(decision.shouldAlert, false);
    assert.strictEqual(decision.nextStatus, "OPEN");
    assert.strictEqual(decision.isRegression, false);
  });

  it("alerts for OPEN incident after debounce window has elapsed", () => {
    const now = new Date("2026-10-31T12:00:00Z");
    const existing = {
      status: "OPEN",
      lastAlertedAt: new Date("2026-10-31T11:50:00Z"), // 10 minutes ago > 5 min
    };
    const decision = decideAlert(existing, now, windowMs);
    assert.strictEqual(decision.shouldAlert, true);
    assert.strictEqual(decision.nextStatus, "OPEN");
    assert.strictEqual(decision.isRegression, false);
  });
});
