import { Router, Request, Response } from "express";
import { prisma } from "@pulse/db";
import { createHash } from "node:crypto";
import { logger } from "../lib/logger";

export const heartbeatRouter = Router();

heartbeatRouter.post("/heartbeat", async (req: Request, res: Response): Promise<void> => {
  try {
    const apiKeyHeader =
      (req.headers["x-pulse-api-key"] as string) ||
      req.headers.authorization?.replace(/^Bearer\s+/i, "");

    if (!apiKeyHeader) {
      res.status(401).json({ error: "Missing X-Pulse-API-Key header or Bearer token." });
      return;
    }

    const keyHash = createHash("sha256").update(apiKeyHeader).digest("hex");
    const apiKeyRecord = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: { project: true },
    });

    if (!apiKeyRecord || !apiKeyRecord.isActive) {
      res.status(401).json({ error: "Invalid or revoked Pulse API Key." });
      return;
    }

    const { environment, release, sdkVersion, runtime } = req.body || {};
    const now = new Date();

    await prisma.$transaction([
      prisma.apiKey.update({
        where: { id: apiKeyRecord.id },
        data: { lastUsedAt: now },
      }),
      prisma.project.update({
        where: { id: apiKeyRecord.projectId },
        data: {
          lastHeartbeatAt: now,
          appMetadata: {
            environment: environment || "production",
            release: release || "",
            sdkVersion: sdkVersion || "1.0.0",
            runtime: runtime || "node",
            lastSeenAt: now.toISOString(),
          },
        },
      }),
    ]);

    if (logger && typeof logger.info === "function") {
      logger.info("Heartbeat received", {
        projectId: apiKeyRecord.projectId,
        projectName: apiKeyRecord.project.name,
        environment: environment || "production",
      });
    }

    res.status(200).json({
      status: "ok",
      projectId: apiKeyRecord.projectId,
      projectName: apiKeyRecord.project.name,
      timestamp: now.toISOString(),
    });
  } catch (err: any) {
    if (logger && typeof logger.error === "function") {
      logger.error("Error processing heartbeat", { error: err.message || String(err) });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

