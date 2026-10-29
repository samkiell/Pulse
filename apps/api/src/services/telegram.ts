import { prisma } from "@pulse/db";
import { config } from "../config";
import { logger } from "../lib/logger";

export interface AlertNotificationPayload {
  projectName: string;
  projectSlug: string;
  incidentId: string;
  errorName: string;
  errorMessage: string;
  occurrenceCount: number;
  environment: string;
  aiDiagnosis?: string;
  suggestedFix?: string;
  isRuleBased?: boolean;
}

/**
 * Dispatches an alert to all active Telegram integrations linked to the project.
 */
export async function sendTelegramAlert(
  projectId: string,
  payload: AlertNotificationPayload
): Promise<void> {
  if (!config.telegramBotToken) {
    logger.warn("Telegram alert skipped: TELEGRAM_BOT_TOKEN not configured");
    return;
  }

  const integrations = await prisma.telegramIntegration.findMany({
    where: {
      projectId,
      isActive: true,
      chatId: { not: null },
    },
  });

  if (integrations.length === 0) {
    return;
  }

  const incidentUrl = `${config.dashboardUrl}/projects/${payload.projectSlug}?incident=${payload.incidentId}`;
  const aiHeading = payload.isRuleBased ? "Likely cause (rule-based):" : "AI root cause:";

  const messageText = `🚨 <b>Pulse Crash Alert</b>
━━━━━━━━━━━━━━━━━━
📁 <b>Project:</b> ${escapeHtml(payload.projectName)} (<code>${escapeHtml(payload.environment)}</code>)
💥 <b>Error:</b> <code>${escapeHtml(payload.errorName)}</code>
📝 <b>Message:</b> <code>${escapeHtml(payload.errorMessage.slice(0, 250))}</code>
🔢 <b>Occurrences:</b> ${payload.occurrenceCount}

🧠 <b>${aiHeading}</b>
${escapeHtml(payload.aiDiagnosis || "Diagnosis pending...")}

💡 <b>Suggested Fix:</b>
<code>${escapeHtml(payload.suggestedFix || "Check stack trace in dashboard.")}</code>

🔗 <a href="${incidentUrl}">View Incident in Pulse Dashboard</a>`;

  for (const integration of integrations) {
    if (!integration.chatId) continue;
    try {
      await sendTelegramMessage(integration.chatId, messageText, integration.id);
    } catch (err: any) {
      logger.error("Failed to send alert to chat", {
        chatId: integration.chatId,
        error: err.message || String(err),
      });
    }
  }
}

/**
 * Sends a message using Telegram Bot API.
 */
export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  integrationId?: string
): Promise<void> {
  const base = (config.telegramApiBase || "https://api.telegram.org").replace(/\/$/, "");
  const url = `${base}/bot${config.telegramBotToken}/sendMessage`;

  // Truncate to Telegram's 4096 character limit
  const truncatedText = text.length > 4096 ? text.slice(0, 4093) + "..." : text;

  const makeRequest = async () => {
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: truncatedText,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
  };

  let response = await makeRequest();

  // If rate limited (429), wait retry_after seconds once, then give up
  if (response.status === 429) {
    try {
      const data = (await response.json()) as any;
      const retryAfter = data?.parameters?.retry_after || 1;
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      response = await makeRequest();
    } catch {
      return;
    }
  }

  // If bot was blocked (403), mark integration inactive
  if (response.status === 403 && integrationId) {
    await prisma.telegramIntegration
      .update({
        where: { id: integrationId },
        data: { isActive: false },
      })
      .catch(() => {});
    return;
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Telegram API error (${response.status}): ${errorText}`);
  }
}

/**
 * Handles incoming webhook updates from Telegram.
 */
export async function handleTelegramUpdate(update: any): Promise<void> {
  const message = update?.message;
  if (!message || !message.text) return;

  const chatId = String(message.chat.id);
  const text = message.text.trim();

  // Handle /start <token>
  if (text.startsWith("/start")) {
    const parts = text.split(" ");
    const token = parts[1]?.trim();

    if (!token) {
      await sendTelegramMessage(
        chatId,
        `Welcome to Pulse Monitor.\n\nTo link your chat to a project, open your Pulse Dashboard, click Connect Telegram to generate a link token, then send /start <token>.`
      );
      return;
    }

    const integration = await prisma.telegramIntegration.findUnique({
      where: { verificationToken: token },
      include: { project: true },
    });

    if (!integration) {
      await sendTelegramMessage(
        chatId,
        `Invalid token. Please generate a new link token from your Pulse dashboard.`
      );
      return;
    }

    if (integration.consumedAt) {
      await sendTelegramMessage(
        chatId,
        `This token has already been used. Please generate a fresh link token from your Pulse dashboard.`
      );
      return;
    }

    const isExpired = Date.now() - new Date(integration.createdAt).getTime() > 24 * 60 * 60 * 1000;
    if (isExpired) {
      await sendTelegramMessage(
        chatId,
        `This token has expired. Link tokens are valid for 24 hours. Please generate a fresh link token from your Pulse dashboard.`
      );
      return;
    }

    const chatTitle =
      message.chat.title || message.chat.username || message.chat.first_name || "Direct Chat";

    await prisma.telegramIntegration.update({
      where: { id: integration.id },
      data: {
        chatId,
        chatTitle,
        isActive: true,
        consumedAt: new Date(),
      },
    });

    await sendTelegramMessage(
      chatId,
      `Pulse Connected. This chat is now subscribed to alerts for project <b>${escapeHtml(
        integration.project.name
      )}</b>.`
    );
    return;
  }

  // Handle /status
  if (text === "/status") {
    const linked = await prisma.telegramIntegration.findMany({
      where: { chatId, isActive: true },
      include: { project: true },
    });

    if (linked.length === 0) {
      await sendTelegramMessage(
        chatId,
        `This chat is not currently linked to any active Pulse projects.`
      );
      return;
    }

    const projectList = linked.map((item) => `• <b>${escapeHtml(item.project.name)}</b>`).join("\n");
    await sendTelegramMessage(chatId, `Active Pulse Subscriptions:\n\n${projectList}`);
    return;
  }

  // Handle /stop
  if (text === "/stop") {
    const result = await prisma.telegramIntegration.updateMany({
      where: { chatId, isActive: true },
      data: { isActive: false },
    });

    if (result.count > 0) {
      await sendTelegramMessage(
        chatId,
        `Alerts stopped. ${result.count} project subscription(s) deactivated.`
      );
    } else {
      await sendTelegramMessage(chatId, `No active project subscriptions found for this chat.`);
    }
    return;
  }

  // Handle /help
  if (text === "/help") {
    await sendTelegramMessage(
      chatId,
      `Pulse Bot Commands:
/status - View active project subscriptions
/stop - Stop receiving alerts for this chat
/help - Show available commands`
    );
    return;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
