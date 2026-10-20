import { Router, Request, Response } from "express";
import { handleTelegramUpdate } from "../services/telegram";

export const telegramRouter = Router();

telegramRouter.post("/webhook", async (req: Request, res: Response): Promise<void> => {
  try {
    const update = req.body;
    if (update) {
      await handleTelegramUpdate(update);
    }
    res.status(200).send("OK");
  } catch (error) {
    console.error("[Telegram Webhook] Error handling update:", error);
    res.status(200).send("OK"); // Acknowledge 200 so Telegram does not continually retry failed updates
  }
});

// Start command verification token handler