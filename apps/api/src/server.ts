import express from "express";
import cors from "cors";
import helmet from "helmet";
import http from "node:http";
import { prisma } from "@pulse/db";
import pulse from "@samkiel/pulse";
import { config, validateProductionConfig } from "./config";
import { logger } from "./lib/logger";
import { ingestRouter } from "./routes/ingest";
import { telegramRouter } from "./routes/telegram";
import { inFlightAlerts } from "./services/anomaly";
import { startRetentionSchedule } from "./services/retention";

// Validate required production environment variables
validateProductionConfig();

// Optional dogfooding: self-monitor pulse-api if credentials are set
if (config.pulseSelfApiKey && config.pulseEndpoint) {
  pulse.init({
    apiKey: config.pulseSelfApiKey,
    endpoint: config.pulseEndpoint,
    environment: config.nodeEnv,
    release: process.env.APP_VERSION || "v1.0.0",
  });
  logger.info("Self-monitoring initialized via pulse");
}

const app = express();

app.set("trust proxy", 1);
app.use(helmet());

const allowedOrigins = config.corsOrigins
  ? config.corsOrigins.split(",").map((s) => s.trim()).filter(Boolean)
  : [];

if (allowedOrigins.length > 0) {
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
    })
  );
} else {
  app.use(cors({ origin: false }));
}

// Global JSON body parser for incoming API & webhook requests
app.use(express.json({ limit: "512kb" }));

// 1. Health endpoint (liveness check for Rumpty Cloud, no DB dependency)
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "pulse-api",
    timestamp: new Date().toISOString(),
  });
});

// 2. Readiness endpoint (checks database connectivity)
app.get("/ready", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: "ready",
      service: "pulse-api",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Readiness check failed: Database connection error", {
      error: error.message || String(error),
    });
    res.status(503).json({
      status: "not_ready",
      service: "pulse-api",
      database: "disconnected",
      error: error.message || "Database connection failure",
    });
  }
});

// API Routes
app.use("/api/v1", ingestRouter);
app.use("/api/v1/telegram", telegramRouter);

// Attach SDK error middleware if self-monitoring is active
if (config.pulseSelfApiKey && config.pulseEndpoint) {
  app.use(pulse.errorHandler());
}

let server: http.Server | null = null;
let retentionTimer: NodeJS.Timeout | null = null;

if (process.env.NODE_ENV !== "test") {
  // Start background retention scheduler (runs on startup and every 24h)
  retentionTimer = startRetentionSchedule();

  server = app.listen(config.port, () => {
    logger.info("Pulse API running", {
      port: config.port,
      nodeEnv: config.nodeEnv,
      version: process.env.APP_VERSION || "v1.0.0",
    });
  });
}

// Graceful Shutdown Handling
const handleShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  if (retentionTimer) {
    clearInterval(retentionTimer);
  }

  if (server) {
    server.close(() => {
      logger.info("Closed HTTP server to incoming connections.");
    });
  }

  // Wait up to 8 seconds for pending in-flight alert workflows
  const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 8000));
  const pendingWorkflows = Array.from(inFlightAlerts);

  if (pendingWorkflows.length > 0) {
    logger.info(`Waiting for ${pendingWorkflows.length} in-flight alert workflows to finish...`);
    await Promise.race([Promise.allSettled(pendingWorkflows), timeoutPromise]);
  }

  try {
    await prisma.$disconnect();
    logger.info("Database connection closed cleanly.");
  } catch (err: any) {
    logger.error("Error closing database connection", { error: err.message });
  }

  logger.info("Graceful shutdown completed.");
  process.exit(0);
};

process.on("SIGTERM", () => void handleShutdown("SIGTERM"));
process.on("SIGINT", () => void handleShutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection intercepted", {
    reason: reason instanceof Error ? reason.stack || reason.message : String(reason),
  });
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception intercepted, exiting", {
    error: error.stack || error.message,
  });
  process.exit(1);
});

export default app;
