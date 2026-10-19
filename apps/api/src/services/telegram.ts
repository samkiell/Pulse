import { prisma } from "@pulse/db";
import { config } from "../config";

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
}

/**
 * Dispatches an alert to all active Telegram integrations linked to the project
 */
export async function sendTelegramAlert(
  projectId: string,
  payload: AlertNotificationPayload
): Promise<void> {
  if (!config.telegramBotToken) {
    console.warn("[Telegram] Alert skipped: TELEGRAM_BOT_TOKEN not configured.");
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

  const incidentUrl = `${config.dashboardUrl}/projects/${payload.projectSlug}/incidents/${payload.incidentId}`;

  const messageText = `🚨 <b>Pulse Crash Alert</b>
━━━━━━━━━━━━━━━━━━
📁 <b>Project:</b> ${escapeHtml(payload.projectName)} (<code>${escapeHtml(payload.environment)}</code>)
💥 <b>Error:</b> <code>${escapeHtml(payload.errorName)}</code>
📝 <b>Message:</b> <code>${escapeHtml(payload.errorMessage.slice(0, 250))}</code>
🔢 <b>Occurrences:</b> ${payload.occurrenceCount}

🧠 <b>AI Root-Cause Diagnosis:</b>
${escapeHtml(payload.aiDiagnosis || "Diagnosis pending...")}

💡 <b>Suggested Fix:</b>
<code>${escapeHtml(payload.suggestedFix || "Check stack trace in dashboard.")}</code>

🔗 <a href="${incidentUrl}">View Incident in Pulse Dashboard</a>`;

  for (const integration of integrations) {
    if (!integration.chatId) continue;
    try {
      await sendTelegramMessage(integration.chatId, messageText);
    } catch (err) {
      console.error(`[Telegram] Failed to send alert to chat ${integration.chatId}:`, err);
    }
  }
}

/**
 * Sends a message using Telegram Bot API
 */
export async function sendTelegramMessage(
  chatId: string | number,
  text: string
): Promise<void> {
  const url = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Telegram API error (${response.status}): ${errorText}`);
  }
}

/**
 * Handles incoming webhook updates from Telegram
 */
export async function handleTelegramUpdate(update: any): Promise<void> {
  const message = update.message;
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
        `👋 <b>Welcome to Pulse Monitor!</b>\n\nTo link your Telegram to a project, open your Pulse Dashboard and click <b>Connect Telegram</b> to generate your unique link command.`
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
        `❌ <b>Invalid or Expired Token</b>\n\nPlease generate a new Telegram link token from your Pulse project settings.`
      );
      return;
    }

    const chatTitle = message.chat.title || message.chat.username || message.chat.first_name || "Direct Chat";

    await prisma.telegramIntegration.update({
      where: { id: integration.id },
      data: {
        chatId,
        chatTitle,
        isActive: true,
      },
    });

    await sendTelegramMessage(
      chatId,
      `✅ <b>Pulse Connected!</b>\n\nThis chat is now subscribed to alerts for project <b>${escapeHtml(
        integration.project.name
      )}</b>.\n\nYou will receive instant crash notifications and AI root-cause summaries whenever an error is detected.`
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
      await sendTelegramMessage(chatId, `ℹ️ This chat is not currently linked to any active Pulse projects.`);
      return;
    }

    const projectList = linked.map((item) => `• <b>${escapeHtml(item.project.name)}</b>`).join("\n");
    await sendTelegramMessage(chatId, `📡 <b>Active Pulse Subscriptions:</b>\n\n${projectList}`);
    return;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
