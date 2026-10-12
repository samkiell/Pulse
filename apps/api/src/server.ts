import express from "express";
import cors from "cors";
import { config } from "./config";
import { ingestRouter } from "./routes/ingest";
import { telegramRouter } from "./routes/telegram";

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

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

// Start Server
app.listen(config.port, () => {
  console.log(`[Pulse API] Ingestion engine running on port ${config.port} (${config.nodeEnv})`);
});

export default app;
