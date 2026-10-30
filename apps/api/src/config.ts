import dotenv from "dotenv";
import { z } from "zod";
import { logger } from "./lib/logger";

dotenv.config();

const ProductionEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  TELEGRAM_BOT_TOKEN: z.string().min(1, "TELEGRAM_BOT_TOKEN is required"),
  TELEGRAM_WEBHOOK_SECRET: z
    .string()
    .min(1)
    .default("pulse_tele_prod_sec_99"),
  PUBLIC_API_URL: z
    .string()
    .url("PUBLIC_API_URL must be a valid URL")
    .default("https://pulseapi.rumptycloud.app"),
  DASHBOARD_URL: z
    .string()
    .url("DASHBOARD_URL must be a valid URL")
    .default("https://pulse.rumptycloud.app"),
});

export function validateProductionConfig(): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const result = ProductionEnvSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    logger.error("Production environment configuration validation failed", { missing });
    console.error(
      "Missing or invalid production environment variables:\n" +
        missing.map((m) => ` - ${m}`).join("\n")
    );
    process.exit(1);
  }

  process.env.PUBLIC_API_URL = process.env.PUBLIC_API_URL || result.data.PUBLIC_API_URL;
  process.env.DASHBOARD_URL = process.env.DASHBOARD_URL || result.data.DASHBOARD_URL;
  process.env.TELEGRAM_WEBHOOK_SECRET =
    process.env.TELEGRAM_WEBHOOK_SECRET || result.data.TELEGRAM_WEBHOOK_SECRET;
}

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL || "",
  publicApiUrl: process.env.PUBLIC_API_URL || "http://localhost:4000",
  dashboardUrl: process.env.DASHBOARD_URL || "http://localhost:3000",
  corsOrigins: process.env.CORS_ORIGINS || "",

  // Rumpty AI Inference
  rumptyAiEndpoint:
    process.env.RUMPTY_AI_ENDPOINT || "https://chat.rumptycloud.com/v1/chat/completions",
  rumptyAiApiKey: process.env.RUMPTY_AI_API_KEY || process.env.OPENAI_API_KEY || "",
  rumptyAiModel: process.env.RUMPTY_AI_MODEL || "",

  // Fallback AI Provider
  aiFallbackEndpoint: process.env.AI_FALLBACK_ENDPOINT || "",
  aiFallbackApiKey: process.env.AI_FALLBACK_API_KEY || "",
  aiFallbackModel: process.env.AI_FALLBACK_MODEL || "",

  // Telegram Bot
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
  telegramBotUsername: process.env.TELEGRAM_BOT_USERNAME || "rumptypulsebot",
  telegramWebhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || "",
  telegramApiBase: process.env.TELEGRAM_API_BASE || "https://api.telegram.org",

  // Ingestion and Retention
  alertDebounceWindowMinutes: parseInt(process.env.ALERT_DEBOUNCE_WINDOW_MINUTES || "5", 10),
  retentionDays: parseInt(process.env.RETENTION_DAYS || "30", 10),

  // Self-monitoring
  pulseSelfApiKey: process.env.PULSE_SELF_API_KEY || "",
  pulseEndpoint: process.env.PULSE_ENDPOINT || "",
};
