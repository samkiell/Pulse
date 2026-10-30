import { config } from "../config";
import { registerTelegramCommands } from "../services/telegram";

async function main() {
  const token = config.telegramBotToken;
  const secret = config.telegramWebhookSecret;
  const targetUrl = process.argv[2] || process.env.PUBLIC_API_URL || config.publicApiUrl;
  const publicApiUrl = targetUrl.replace(/\/$/, "");
  const base = (config.telegramApiBase || "https://api.telegram.org").replace(/\/$/, "");

  if (!token) {
    console.error("Error: TELEGRAM_BOT_TOKEN is required to set webhook.");
    process.exit(1);
  }

  if (!secret) {
    console.error("Error: TELEGRAM_WEBHOOK_SECRET is required to set webhook.");
    process.exit(1);
  }

  const webhookUrl = `${publicApiUrl}/api/v1/telegram/webhook`;
  console.log(`Setting Telegram webhook to: ${webhookUrl}`);

  const setWebhookUrl = `${base}/bot${token}/setWebhook`;
  const setRes = await fetch(setWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secret,
      allowed_updates: ["message"],
    }),
  });

  const setResult = await setRes.json();
  console.log("setWebhook response:", JSON.stringify(setResult, null, 2));

  if (!setRes.ok) {
    console.error("Failed to set webhook.");
    process.exit(1);
  }

  const getInfoUrl = `${base}/bot${token}/getWebhookInfo`;
  const infoRes = await fetch(getInfoUrl);
  const infoResult = await infoRes.json();
  console.log("getWebhookInfo response:", JSON.stringify(infoResult, null, 2));

  console.log("Registering Telegram bot command menu...");
  const cmdSuccess = await registerTelegramCommands();
  console.log(`setMyCommands result: ${cmdSuccess ? "SUCCESS" : "FAILED"}`);
}

main().catch((err) => {
  console.error("Unexpected error setting webhook:", err);
  process.exit(1);
});
