import { Router, Request, Response } from "express";
import { prisma } from "@pulse/db";
import { z } from "zod";
import { processIngestBatch } from "../services/anomaly";

export const ingestRouter = Router();

const IngestPayloadSchema = z.object({
  events: z.array(
    z.object({
      errorType: z.string().default("custom"),
      name: z.string().default("Error"),
      message: z.string().default(""),
      stack: z.string().optional(),
      fingerprint: z.string().min(1),
      environment: z.string().optional(),
      release: z.string().optional(),
      metadata: z.record(z.any()).optional(),
      timestamp: z.string().optional(),
    })
  ).min(1),
});

ingestRouter.post("/ingest", async (req: Request, res: Response): Promise<void> => {
  const apiKeyHeader =
    (req.headers["x-pulse-api-key"] as string) ||
    req.headers.authorization?.replace(/^Bearer\s+/i, "");

  if (!apiKeyHeader) {
    res.status(401).json({ error: "Missing X-Pulse-API-Key header or Bearer token." });
    return;
  }

  // 1. Authenticate API Key
  const apiKeyRecord = await prisma.apiKey.findUnique({
    where: { key: apiKeyHeader },
    include: { project: true },
  });

  if (!apiKeyRecord || !apiKeyRecord.isActive) {
    res.status(401).json({ error: "Invalid or revoked Pulse API Key." });
    return;
  }

  // 2. Validate Payload
  const parsed = IngestPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid ingest payload schema.", details: parsed.error.issues });
    return;
  }

  // Update apiKey lastUsedAt timestamp asynchronously
  void prisma.apiKey.update({
    where: { id: apiKeyRecord.id },
    data: { lastUsedAt: new Date() },
  });

  // 3. Process Ingest Batch
  try {
    await processIngestBatch(
      apiKeyRecord.projectId,
      apiKeyRecord.project.name,
      apiKeyRecord.project.slug,
      parsed.data.events
    );

    res.status(202).json({
      success: true,
      ingestedCount: parsed.data.events.length,
      projectId: apiKeyRecord.projectId,
    });
  } catch (error) {
    console.error("[Pulse Ingest] Error processing batch:", error);
    res.status(500).json({ error: "Internal error processing events." });
  }
});
