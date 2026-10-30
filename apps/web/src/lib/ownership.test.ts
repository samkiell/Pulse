import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@pulse/db";
import { getOwnedProject, getOwnedIncident } from "./auth-helpers";
import { createHash, randomBytes } from "node:crypto";

describe("Integration: Two User Ownership Scoping", () => {
  let userA: { id: string; name: string | null; email: string | null };
  let userB: { id: string; name: string | null; email: string | null };
  let projectA: { id: string; slug: string; name: string };
  let incidentA: { id: string };

  before(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      console.warn("Skipping two user ownership integration test: database connection failed.");
      return;
    }

    const timestamp = Date.now();

    // 1. Create User A
    userA = await prisma.user.create({
      data: {
        name: `User A ${timestamp}`,
        email: `usera-${timestamp}@example.com`,
      },
    });

    // 2. Create User B
    userB = await prisma.user.create({
      data: {
        name: `User B ${timestamp}`,
        email: `userb-${timestamp}@example.com`,
      },
    });

    // 3. User A creates Project A with API Key and Telegram Integration
    const rawKey = `pulse_live_${randomBytes(16).toString("hex")}`;
    const keyHash = createHash("sha256").update(rawKey).digest("hex");

    projectA = await prisma.project.create({
      data: {
        name: `Project A ${timestamp}`,
        slug: `proj-a-${timestamp}`,
        ownerId: userA.id,
        apiKeys: {
          create: {
            keyHash,
            keyPrefix: rawKey.slice(0, 12),
            name: "User A Key",
          },
        },
        telegramIntegrations: {
          create: {
            verificationToken: `plink_${randomBytes(8).toString("hex")}`,
            chatId: "12345678",
            chatTitle: "User A Chat",
          },
        },
      },
    });

    // 4. Create Incident for Project A
    incidentA = await prisma.incident.create({
      data: {
        projectId: projectA.id,
        fingerprint: `fp_a_${timestamp}`,
        title: "TypeError: User A test error",
        status: "OPEN",
      },
    });
  });

  after(async () => {
    if (userA?.id && userB?.id) {
      try {
        // Deleting User A cascades to Project A, keys, integrations, incidents, and events
        await prisma.user.delete({ where: { id: userA.id } });
        await prisma.user.delete({ where: { id: userB.id } });
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  test("User A can successfully access their own project", async () => {
    const result = await getOwnedProject(userA.id, projectA.slug);
    assert.ok(result);
    assert.strictEqual(result.id, projectA.id);
    assert.strictEqual(result.slug, projectA.slug);
  });

  test("User B gets 404 (null) when attempting to access User A's project (existence not leaked)", async () => {
    const result = await getOwnedProject(userB.id, projectA.slug);
    assert.strictEqual(result, null, "User B must not see User A's project");
  });

  test("User A can access their own incident", async () => {
    const result = await getOwnedIncident(userA.id, projectA.slug, incidentA.id);
    assert.ok(result);
    assert.strictEqual(result.id, incidentA.id);
  });

  test("User B gets 404 (null) when attempting to access User A's incident", async () => {
    const result = await getOwnedIncident(userB.id, projectA.slug, incidentA.id);
    assert.strictEqual(result, null, "User B must get 404 / null for User A's incident");
  });

  test("User B cannot access User A's incident even with valid incident ID if project slug is foreign", async () => {
    const result = await getOwnedIncident(userB.id, "non-existent-or-b-slug", incidentA.id);
    assert.strictEqual(result, null);
  });
});
