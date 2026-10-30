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
      res.status(401).send("Unauthorized");
      return;
    }

    try {
      const update = req.body;
      if (update && typeof update === "object" && Object.keys(update).length > 0) {
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
