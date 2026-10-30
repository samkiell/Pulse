import express, { Router, Request, Response } from "express";
import crypto from "node:crypto";
import { config } from "../config";
import { handleTelegramUpdate } from "../services/telegram";
import { logger } from "../lib/logger";

export const telegramRouter = Router();

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

telegramRouter.post(
  "/webhook",
  express.json({ limit: "512kb" }),
  async (req: Request, res: Response): Promise<void> => {
    const incomingSecret = req.headers["x-telegram-bot-api-secret-token"];
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET || config.telegramWebhookSecret;

    if (
      !incomingSecret ||
      !expectedSecret ||
      !safeCompare(String(incomingSecret), expectedSecret)
    ) {
      console.warn(
        `[Telegram Webhook] Unauthorized request. Missing or mismatched secret token header.`
      );
      res.status(401).send("Unauthorized");
      return;
    }

    try {
      const update = req.body;
      if (update && typeof update === "object" && Object.keys(update).length > 0) {
        if (update.message) {
          console.log(
            `[Telegram Webhook] Message from chat ${update.message.chat?.id} (@${update.message.from?.username || "unknown"}): "${update.message.text}"`
          );
        }
        await handleTelegramUpdate(update);
      }
      res.status(200).send("OK");
    } catch (error: any) {
      logger.error("Error handling Telegram webhook update", {
        error: error.message || String(error),
      });
      // Keep returning 200 for handler errors so Telegram does not continually retry
      res.status(200).send("OK");
    }
  }
);

telegramRouter.get("/debug", async (req: Request, res: Response): Promise<void> => {
  const token = (config.telegramBotToken || "").replace(/^["']|["']$/g, "").trim();
  let tgStatus = "unknown";
  let botUsername = "";

  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = (await r.json()) as any;
    if (data.ok) {
      tgStatus = "ok";
      botUsername = data.result.username;
    } else {
      tgStatus = `error: ${data.description || r.status}`;
    }
  } catch (err: any) {
    tgStatus = `fetch_failed: ${err.message}`;
  }

  res.status(200).json({
    status: "online",
    botConfigured: Boolean(token),
    tokenPrefix: token.slice(0, 10),
    botUsername,
    tgStatus,
    webhookSecretConfigured: Boolean(config.telegramWebhookSecret),
    webhookSecretPrefix: (process.env.TELEGRAM_WEBHOOK_SECRET || config.telegramWebhookSecret).slice(0, 8),
    rumptyAiConfigured: Boolean(config.rumptyAiApiKey),
    version: "v1.0.4",
  });
});
