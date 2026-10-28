import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config";
import { ingestRouter } from "./routes/ingest";
import { telegramRouter } from "./routes/telegram";

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

// Health check endpoint for Rumpty Cloud container orchestrator
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "pulse-api",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/v1", ingestRouter);
app.use("/api/v1/telegram", telegramRouter);

// Start Server if not imported by tests
if (process.env.NODE_ENV !== "test") {
  app.listen(config.port, () => {
    console.log(`[Pulse API] Ingestion engine running on port ${config.port} (${config.nodeEnv})`);
  });
}

export default app;
