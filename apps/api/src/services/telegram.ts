import { prisma } from "@pulse/db";
import { config } from "../config";
import { queryRumptyAiChat } from "./ai";
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

  const makeRequest = async (useHtml = true) => {
    const payload: Record<string, any> = {
      chat_id: chatId,
      text: truncatedText,
      disable_web_page_preview: true,
    };
    if (useHtml) {
      payload.parse_mode = "HTML";
    }
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  };

  let response = await makeRequest(true);

  // If HTML entity parsing fails (400), fall back to plain text delivery
  if (response.status === 400) {
    response = await makeRequest(false);
  }

  // If rate limited (429), wait retry_after seconds once, then give up
  if (response.status === 429) {
    try {
      const data = (await response.json()) as any;
      const retryAfter = data?.parameters?.retry_after || 1;
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      response = await makeRequest(true);
      if (response.status === 400) {
        response = await makeRequest(false);
      }
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
 * Sends a chat action (e.g. typing) to Telegram
 */
export async function sendTelegramChatAction(
  chatId: string | number,
  action: "typing" = "typing"
): Promise<void> {
  if (!config.telegramBotToken) return;
  const base = (config.telegramApiBase || "https://api.telegram.org").replace(/\/$/, "");
  const url = `${base}/bot${config.telegramBotToken}/sendChatAction`;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action }),
    });
  } catch {
    // Ignore action delivery failure
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

  // Extract link token from multiple user formats:
  // 1. /start plink_xxx or /connect plink_xxx
  // 2. Direct token paste: plink_xxx
  const plinkMatch = text.match(/\b(plink_[a-zA-Z0-9_-]+)\b/i);
  let explicitToken: string | null = null;

  if (text.startsWith("/start") || text.startsWith("/connect") || text.startsWith("/link")) {
    const parts = text.split(/\s+/);
    if (parts[1]?.trim()) {
      explicitToken = parts[1].trim();
    }
  } else if (plinkMatch) {
    explicitToken = plinkMatch[1];
  }

  // 1. Handle token verification and chat linking
  if (explicitToken) {
    const integration = await prisma.telegramIntegration.findUnique({
      where: { verificationToken: explicitToken },
      include: { project: true },
    });

    if (!integration) {
      await sendTelegramMessage(
        chatId,
        `❌ <b>Invalid Link Token</b>\n\nThe provided token was not found. Please open your Pulse Dashboard, go to your Project > <b>Telegram Bot</b> tab, and generate a new connection token.`
      );
      return;
    }

    if (integration.consumedAt) {
      await sendTelegramMessage(
        chatId,
        `⚠️ <b>Token Already Used</b>\n\nThis token was already redeemed. Please generate a fresh token from your Pulse dashboard.`
      );
      return;
    }

    const isExpired = Date.now() - new Date(integration.createdAt).getTime() > 24 * 60 * 60 * 1000;
    if (isExpired) {
      await sendTelegramMessage(
        chatId,
        `⚠️ <b>Token Expired</b>\n\nLink tokens expire after 24 hours. Please generate a fresh token from your Pulse dashboard.`
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
      `✅ <b>Pulse Successfully Connected!</b>
━━━━━━━━━━━━━━━━━━
📁 <b>Project:</b> <b>${escapeHtml(integration.project.name)}</b>
🆔 <b>Chat ID:</b> <code>${chatId}</code>
🔔 <b>Alerts:</b> Active (real-time error notifications enabled)

This chat is now subscribed to live crash alerts and AI root-cause diagnosis.

💡 <i>Tip: You can chat with me directly! Ask me about recent errors, debugging tips, or system health.</i>`
    );
    return;
  }

  // 2. Handle /start without a token
  if (text.startsWith("/start")) {
    await sendTelegramMessage(
      chatId,
      `👋 <b>Welcome to Pulse Monitor!</b>

I monitor runtime errors, track incidents, and provide real-time AI root-cause diagnosis powered by Rumpty Cloud.

To connect this chat to your project, simply send your <b>Project Link Token</b>:
• Paste the token directly: <code>plink_xxxxxxxx</code>
• Or send: <code>/start plink_xxxxxxxx</code>

<i>You can get this token anytime from your Pulse Dashboard under the <b>Telegram Bot</b> tab.</i>`
    );
    return;
  }

  // 3. Handle /status
  if (text === "/status") {
    const linked = await prisma.telegramIntegration.findMany({
      where: { chatId, isActive: true },
      include: { project: true },
    });

    if (linked.length === 0) {
      await sendTelegramMessage(
        chatId,
        `This chat is not currently linked to any active Pulse projects.\n\nSend <code>/start &lt;token&gt;</code> with your token from the Pulse dashboard to connect.`
      );
      return;
    }

    const projectList = linked.map((item) => `• <b>${escapeHtml(item.project.name)}</b>`).join("\n");
    await sendTelegramMessage(chatId, `Active Pulse Subscriptions:\n\n${projectList}`);
    return;
  }

  // 4. Handle /stop
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

  // 5. Handle /help
  if (text === "/help") {
    await sendTelegramMessage(
      chatId,
      `<b>Pulse Bot Commands:</b>
• <code>/status</code>: View active project subscriptions
• <code>/stop</code>: Stop receiving alerts for this chat
• <code>/help</code>: Show this help guide

💬 <b>AI Chat Assistant:</b>
You can chat with me directly! Ask me questions about debugging, error resolution, or system diagnostics.`
    );
    return;
  }

  // 6. Conversational AI Chat via Rumpty AI
  void sendTelegramChatAction(chatId, "typing");

  const linked = await prisma.telegramIntegration.findMany({
    where: { chatId, isActive: true },
    include: {
      project: {
        include: {
          incidents: {
            orderBy: { lastSeenAt: "desc" },
            take: 3,
            select: {
              errorName: true,
              errorMessage: true,
              status: true,
              occurrenceCount: true,
            },
          },
        },
      },
    },
  });

  let systemPrompt =
    "You are Pulse AI, an intelligent DevOps, observability, and debugging assistant developed by SAMKIEL and powered by Rumpty Cloud. You help developers troubleshoot runtime errors, analyze logs, and optimize application resilience. Keep your answers concise, direct, technical, and under 1200 characters. Use simple HTML tags supported by Telegram (<b>bold</b>, <code>code</code>) when appropriate, and avoid raw markdown that could break formatting.";

  if (linked.length > 0) {
    const contextLines = linked.map((item) => {
      const incidentsList = item.project.incidents
        .map(
          (inc) =>
            `- ${inc.errorName} (${inc.status}, ${inc.occurrenceCount}x): ${inc.errorMessage.slice(0, 100)}`
        )
        .join("\n");
      return `Project "${item.project.name}":\n${incidentsList || "No recent incidents recorded."}`;
    });
    systemPrompt += `\n\nUser's linked projects and recent incidents:\n${contextLines.join("\n\n")}`;
  }

  const aiReply = await queryRumptyAiChat(text, systemPrompt);
  await sendTelegramMessage(chatId, aiReply);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
