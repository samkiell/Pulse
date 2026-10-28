import dotenv from "dotenv";
dotenv.config();

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
  telegramBotUsername: process.env.TELEGRAM_BOT_USERNAME || "PulseMonitorBot",
  telegramWebhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || "",
  telegramApiBase: process.env.TELEGRAM_API_BASE || "https://api.telegram.org",

  // Ingestion and Retention
  alertDebounceWindowMinutes: parseInt(process.env.ALERT_DEBOUNCE_WINDOW_MINUTES || "5", 10),
  retentionDays: parseInt(process.env.RETENTION_DAYS || "30", 10),

  // Self-monitoring
  pulseSelfApiKey: process.env.PULSE_SELF_API_KEY || "",
  pulseEndpoint: process.env.PULSE_ENDPOINT || "",
};
