import { Router, Request, Response } from "express";
import express from "express";
import { prisma } from "@pulse/db";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { createHash } from "node:crypto";
import { processIngestBatch } from "../services/anomaly";
import { logger } from "../lib/logger";

export const ingestRouter = Router();

const IngestEventSchema = z.object({
  errorType: z.string().default("custom"),
  name: z.string().max(200).default("Error"),
  message: z.string().max(5000).default(""),
  stack: z.string().max(20000).optional(),
  fingerprint: z.string().min(1),
  environment: z.string().optional(),
  release: z.string().optional(),
  metadata: z
    .record(z.any())
    .optional()
    .refine(
      (data) => {
        if (!data) return true;
        try {
          return Buffer.byteLength(JSON.stringify(data)) <= 16 * 1024;
        } catch {
          return false;
        }
      },
      { message: "Metadata serialized size must not exceed 16 KB" }
    ),
  timestamp: z.string().optional(),
});

const IngestPayloadSchema = z.object({
  events: z.array(IngestEventSchema).min(1).max(50),
});

const ingestLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: true,
  keyGenerator: (req: Request) => {
    const rawKey =
      (req.headers["x-pulse-api-key"] as string) ||
      req.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (rawKey) {
      return rawKey;
    }
    return req.ip || "unknown-ip";
  },
  handler: (req, res) => {
    const resetTime = (req as any).rateLimit?.resetTime;
    const retryAfter = resetTime
      ? Math.max(1, Math.ceil((new Date(resetTime).getTime() - Date.now()) / 1000))
      : 60;
    res.setHeader("Retry-After", String(retryAfter));
    res.status(429).json({
      error: "Too many requests. Rate limit exceeded.",
      retryAfter,
    });
  },
});

ingestRouter.post(
  "/ingest",
  ingestLimiter,
  express.json({ limit: "256kb" }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const apiKeyHeader =
        (req.headers["x-pulse-api-key"] as string) ||
        req.headers.authorization?.replace(/^Bearer\s+/i, "");

      if (!apiKeyHeader) {
        res.status(401).json({ error: "Missing X-Pulse-API-Key header or Bearer token." });
        return;
      }

      // Hash presented key to verify against database
      const keyHash = createHash("sha256").update(apiKeyHeader).digest("hex");
      const apiKeyRecord = await prisma.apiKey.findUnique({
        where: { keyHash },
        include: { project: true },
      });

      if (!apiKeyRecord || !apiKeyRecord.isActive) {
        res.status(401).json({ error: "Invalid or revoked Pulse API Key." });
        return;
      }

      // Validate payload schema
      const parsed = IngestPayloadSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid ingest payload schema.", details: parsed.error.issues });
        return;
      }

      // Update apiKey lastUsedAt timestamp only if older than 60s
      const now = new Date();
      const lastUsed = apiKeyRecord.lastUsedAt ? new Date(apiKeyRecord.lastUsedAt).getTime() : 0;
      if (now.getTime() - lastUsed > 60 * 1000) {
        prisma.apiKey
          .update({
            where: { id: apiKeyRecord.id },
            data: { lastUsedAt: now },
          })
          .catch(() => {});
      }

      // Process ingest batch
      await processIngestBatch(
        apiKeyRecord.projectId,
        apiKeyRecord.project.name,
        apiKeyRecord.project.slug,
        parsed.data.events
      );

      res.status(200).json({
        success: true,
        processed: parsed.data.events.length,
        ingestedCount: parsed.data.events.length,
        projectId: apiKeyRecord.projectId,
      });
    } catch (error: any) {
      logger.error("Error processing ingest batch", { error: error.message || String(error) });
      res.status(500).json({ error: "Internal error processing events." });
    }
  }
);
