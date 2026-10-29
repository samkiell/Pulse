import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import pulse from "@samkiel/pulse-monitor";

dotenv.config();

pulse.init({
  apiKey: process.env.PULSE_API_KEY || "",
  endpoint: process.env.PULSE_ENDPOINT || "http://localhost:3001/api/v1/ingest",
  environment: process.env.NODE_ENV || "development",
  release: process.env.APP_VERSION || "1.0.0",
});

const app = express();
const port = parseInt(process.env.PORT || "5000", 10);

app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

// Standard route handler error caught by Pulse error middleware
app.post("/boom", (_req: Request, _res: Response) => {
  throw new Error("Standard simulated application failure in /boom endpoint");
});

// Uncaught exception triggered outside Express request cycle (demonstrates crash capture and exit)
app.post("/crash", (_req: Request, res: Response) => {
  res.status(200).json({ message: "Crashing process asynchronously in 100ms" });
  setTimeout(() => {
    throw new Error("Simulated uncaughtException crash triggered by /crash");
  }, 100);
});

// Unhandled promise rejection
app.post("/reject", (_req: Request, res: Response) => {
  res.status(202).json({ message: "Triggered unhandled promise rejection" });
  Promise.reject(new Error("Unhandled rejection: Database pool connection timeout"));
});

// Simulated database connection failure matching AI heuristic (ECONNREFUSED)
app.post("/db-fail", (_req: Request, _res: Response) => {
  const err = new Error("connect ECONNREFUSED 127.0.0.1:5432");
  err.name = "DatabaseConnectionError";
  throw err;
});

// Pulse Express error-handling middleware
app.use(pulse.errorHandler());

// Fallback client response handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({
    error: "Internal Server Error",
    message: err.message,
  });
});

app.listen(port, () => {
  console.log(`[Demo App] Listening on port ${port}`);
});

export default app;

