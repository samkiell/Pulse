import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL || "",
  
  // Rumpty AI Inference (OpenAI compatible)
  rumptyAiEndpoint: process.env.RUMPTY_AI_ENDPOINT || "https://api.rumpty.cloud/v1/chat/completions",
  rumptyAiApiKey: process.env.RUMPTY_AI_API_KEY || process.env.OPENAI_API_KEY || "",
  rumptyAiModel: process.env.RUMPTY_AI_MODEL || "rumpty-llama-3-70b-instruct",

  // Telegram Bot
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
  telegramBotUsername: process.env.TELEGRAM_BOT_USERNAME || "PulseMonitorBot",

  // Dashboard URL for notification links
  dashboardUrl: process.env.DASHBOARD_URL || "http://localhost:3000",

  // Ingestion settings
  alertDebounceWindowMinutes: parseInt(process.env.ALERT_DEBOUNCE_WINDOW_MINUTES || "5", 10),
};

// Debounce window tuned for production