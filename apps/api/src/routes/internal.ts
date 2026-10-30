import { Router, Request, Response } from "express";
import express from "express";
import { prisma } from "@pulse/db";
import { config } from "../config";
import { processIngestBatch } from "../services/anomaly";

export const internalRouter = Router();

internalRouter.post(
  "/simulate",
  express.json(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!config.internalApiSecret) {
        res.status(503).json({
          error: "Internal simulation disabled: INTERNAL_API_SECRET is unset.",
        });
        return;
      }

      const clientSecret = req.headers["x-internal-secret"] as string;
      if (!clientSecret || clientSecret !== config.internalApiSecret) {
        res.status(401).json({ error: "Invalid or missing X-Internal-Secret." });
        return;
      }

      const { projectId, errorType = "uncaughtException" } = req.body || {};
      if (!projectId || typeof projectId !== "string") {
        res.status(400).json({ error: "Missing or invalid projectId parameter." });
        return;
      }

      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        res.status(404).json({ error: "Project not found." });
        return;
      }

      const mockErrors: Record<string, any> = {
        uncaughtException: {
          name: "TypeError",
          message: "Cannot read properties of undefined (reading 'userAuthToken')",
          stack: `TypeError: Cannot read properties of undefined (reading 'userAuthToken')
    at AuthenticateSession (src/middleware/auth.ts:42:18)
    at Layer.handle [as handle_request] (node_modules/express/lib/router/layer.js:95:5)
    at next (node_modules/express/lib/router/route.js:144:13)
    at Route.dispatch (node_modules/express/lib/router/route.js:114:3)`,
          errorType: "uncaughtException",
        },
        unhandledRejection: {
          name: "DatabaseConnectionTimeout",
          message: "Failed to establish TCP connection to postgres.internal.rumpty.cloud:5432 after 5000ms",
          stack: `Error: Connection timeout
    at Client._connect (node_modules/pg/lib/client.js:132:19)
    at Connection.connect (node_modules/pg/lib/connection.js:63:17)
    at QueryExecutor.execute (src/db/pool.ts:24:9)`,
          errorType: "unhandledRejection",
        },
        crashLoop: {
          name: "OutOfMemoryError",
          message: "JavaScript heap out of memory. Allocation failed - process terminated",
          stack: `FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
    at v8::internal::V8::FatalProcessOutOfMemory (src/v8/v8.cc:184:3)
    at DataStreamBuffer.transform (src/services/stream.ts:89:12)`,
          errorType: "uncaughtException",
        },
      };

      const selectedMock = mockErrors[errorType] || mockErrors.uncaughtException;
      const simulatedFingerprint = `sim_${errorType}_${Date.now().toString(36)}`;

      await processIngestBatch(project.id, project.name, project.slug, [
        {
          errorType: selectedMock.errorType,
          name: selectedMock.name,
          message: selectedMock.message,
          stack: selectedMock.stack,
          fingerprint: simulatedFingerprint,
          environment: "production",
          release: "v1.0.0-simulated",
          metadata: {
            simulated: true,
            simulatedBy: "internal-api",
            nodeVersion: process.version,
          },
          timestamp: new Date().toISOString(),
        },
      ]);

      res.status(200).json({
        success: true,
        simulatedError: selectedMock.name,
        fingerprint: simulatedFingerprint,
        projectId: project.id,
      });
    } catch (error: any) {
      console.error("[Internal Simulator] Error during crash simulation:", error);
      res.status(500).json({ error: "Internal crash simulation error." });
    }
  }
);

