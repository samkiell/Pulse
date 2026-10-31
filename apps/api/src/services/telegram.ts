import { prisma } from "@pulse/db";
import { config } from "../config";
import { queryRumptyAiChat, PULSE_AI_CHAT_SYSTEM_PROMPT } from "./ai";

export const PULSE_BOT_COMMANDS = [
  { command: "status", description: "View active projects & system health" },
  { command: "latest", description: "View most recent crash & AI diagnosis" },
  { command: "projects", description: "List all connected projects" },
  { command: "link", description: "Link project via 6-digit PIN" },
  { command: "stop", description: "Pause alert notifications for this chat" },
  { command: "resume", description: "Resume alert notifications" },
  { command: "help", description: "Show commands and guide" },
];

/**
 * Registers all bot commands with Telegram so the native menu button appears.
 */
export async function registerTelegramCommands(): Promise<boolean> {
  if (!config.telegramBotToken) return false;
  const base = (config.telegramApiBase || "https://api.telegram.org").replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/bot${config.telegramBotToken}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commands: PULSE_BOT_COMMANDS }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
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

  const incidentUrl = `${config.dashboardUrl}/dashboard/projects/${payload.projectSlug}/incidents/${payload.incidentId}`;
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

  // Extract link token or 6-digit PIN from multiple user formats:
  // 1. /start plink_xxx, /link plink_xxx, /link 123456
  // 2. Direct token paste: plink_xxx
  // 3. Direct 6-digit PIN: "123456" or "123-456"
  const plinkMatch = text.match(/\b(plink_[a-zA-Z0-9_-]+)\b/i);
  const cleanDigits = text.replace(/[-\s]/g, "");
  const directPinMatch = cleanDigits.match(/\b\d{6}\b/);

  let explicitToken: string | null = null;
  let explicitPin: string | null = null;

  if (text.startsWith("/start") || text.startsWith("/connect") || text.startsWith("/link")) {
    const parts = text.split(/\s+/);
    const candidate = parts[1]?.trim();
    if (candidate) {
      const candidateDigits = candidate.replace(/[-\s]/g, "");
      if (/^\d{6}$/.test(candidateDigits)) {
        explicitPin = candidateDigits;
      } else {
        explicitToken = candidate;
      }
    }
  } else if (plinkMatch) {
    explicitToken = plinkMatch[1];
  } else if (directPinMatch && cleanDigits.length <= 8) {
    explicitPin = directPinMatch[0];
  }

  // 1. Handle token verification and chat linking
  if (explicitToken || explicitPin) {
    const integration = await prisma.telegramIntegration.findFirst({
      where: {
        OR: [
          ...(explicitToken ? [{ verificationToken: explicitToken }] : []),
          ...(explicitPin ? [{ linkPin: explicitPin }] : []),
        ],
      },
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

  // 2. Handle /start without token
  if (text === "/start" || text.startsWith("/start ")) {
    await sendTelegramMessage(
      chatId,
      `👋 <b>Pulse Monitor</b>
━━━━━━━━━━━━━━━━━━
Real-time runtime error observability & AI diagnosis.

<b>Quick Commands:</b>
• <code>/link &lt;pin&gt;</code> - Link a project via 6-digit PIN
• <code>/status</code> - View active subscriptions & health
• <code>/latest</code> - View latest crash & AI diagnosis
• <code>/projects</code> - List connected projects
• <code>/stop</code> - Pause alerts for this chat
• <code>/resume</code> - Resume alerts for this chat
• <code>/help</code> - Show full command list

<i>To link a project, send your 6-digit PIN from the Pulse Dashboard.</i>`
    );
    return;
  }

  // 3. Handle /link without arguments
  if (text === "/link") {
    await sendTelegramMessage(
      chatId,
      `🔗 <b>Link Project to Chat</b>\n\nSend <code>/link &lt;6-digit-PIN&gt;</code> (e.g. <code>/link 482195</code>) using the PIN shown on your Pulse Dashboard.`
    );
    return;
  }

  // 4. Handle /status
  if (text === "/status") {
    const linked = await prisma.telegramIntegration.findMany({
      where: { chatId },
      include: {
        project: {
          include: {
            incidents: {
              where: { status: "OPEN" },
              select: { id: true },
            },
          },
        },
      },
    });

    if (linked.length === 0) {
      await sendTelegramMessage(
        chatId,
        `This chat is not currently linked to any Pulse projects.\n\nSend <code>/link &lt;pin&gt;</code> with your 6-digit PIN from the Pulse dashboard to connect.`
      );
      return;
    }

    const activeCount = linked.filter((l) => l.isActive).length;
    const projectSummary = linked
      .map((item) => {
        const state = item.isActive ? "🟢 Active" : "⏸️ Paused";
        const openCount = item.project.incidents.length;
        const health = openCount === 0 ? "healthy" : `${openCount} open issue(s)`;
        return `• <b>${escapeHtml(item.project.name)}</b>: ${state} (${health})`;
      })
      .join("\n");

    await sendTelegramMessage(
      chatId,
      `📊 <b>Pulse Status</b>
━━━━━━━━━━━━━━━━━━
Subscriptions: <b>${activeCount} of ${linked.length} active</b>

${projectSummary}

<i>Send /latest to inspect the most recent crash.</i>`
    );
    return;
  }

  // 5. Handle /latest
  if (text === "/latest") {
    const linked = await prisma.telegramIntegration.findMany({
      where: { chatId, isActive: true },
      select: { projectId: true },
    });

    if (linked.length === 0) {
      await sendTelegramMessage(
        chatId,
        `No active project linked to this chat. Send <code>/link &lt;pin&gt;</code> to connect.`
      );
      return;
    }

    const projectIds = linked.map((l) => l.projectId);
    const latestIncident = await prisma.incident.findFirst({
      where: { projectId: { in: projectIds } },
      orderBy: { lastSeenAt: "desc" },
      include: { project: true },
    });

    if (!latestIncident) {
      await sendTelegramMessage(
        chatId,
        `✅ <b>All systems normal!</b>\n\nNo crash incidents recorded yet for your linked projects.`
      );
      return;
    }

    const incidentUrl = `${config.dashboardUrl}/dashboard/projects/${latestIncident.project.slug}/incidents/${latestIncident.id}`;
    const msg = `🚨 <b>Latest Incident: ${escapeHtml(latestIncident.project.name)}</b>
━━━━━━━━━━━━━━━━━━
💥 <b>Error:</b> <code>${escapeHtml(latestIncident.title.slice(0, 180))}</code>
🔢 <b>Occurrences:</b> ${latestIncident.occurrenceCount} | Status: <b>${latestIncident.status}</b>
🕒 <b>Last seen:</b> ${new Date(latestIncident.lastSeenAt).toLocaleTimeString()}

🧠 <b>AI Root Cause:</b>
${escapeHtml(latestIncident.aiDiagnosis || "Pending diagnosis...")}

💡 <b>Suggested Fix:</b>
<code>${escapeHtml(latestIncident.suggestedFix || "Check stack trace in dashboard.")}</code>

🔗 <a href="${incidentUrl}">View in Pulse Dashboard</a>`;

    await sendTelegramMessage(chatId, msg);
    return;
  }

  // 6. Handle /projects
  if (text === "/projects") {
    const integrations = await prisma.telegramIntegration.findMany({
      where: { chatId },
      include: {
        project: {
          include: {
            _count: {
              select: { incidents: true },
            },
          },
        },
      },
    });

    if (integrations.length === 0) {
      await sendTelegramMessage(
        chatId,
        `No projects linked to this chat yet. Send <code>/link &lt;pin&gt;</code> to connect one.`
      );
      return;
    }

    const lines = integrations.map((i) => {
      const statusIcon = i.isActive ? "🟢" : "⚪";
      return `${statusIcon} <b>${escapeHtml(i.project.name)}</b> (<code>${i.project.slug}</code>)\n   • Incidents: ${i.project._count.incidents} | Alerts: ${i.isActive ? "Active" : "Paused"}`;
    });

    await sendTelegramMessage(
      chatId,
      `📁 <b>Linked Projects (${integrations.length}):</b>\n\n${lines.join("\n\n")}`
    );
    return;
  }

  // 7. Handle /stop or /mute
  if (text === "/stop" || text === "/mute") {
    const result = await prisma.telegramIntegration.updateMany({
      where: { chatId, isActive: true },
      data: { isActive: false },
    });

    if (result.count > 0) {
      await sendTelegramMessage(
        chatId,
        `🔕 <b>Alerts Paused</b>\n\nNotifications paused for ${result.count} project(s). Send <code>/resume</code> anytime to turn them back on.`
      );
    } else {
      await sendTelegramMessage(chatId, `No active project subscriptions found for this chat.`);
    }
    return;
  }

  // 8. Handle /resume
  if (text === "/resume") {
    const result = await prisma.telegramIntegration.updateMany({
      where: { chatId, isActive: false },
      data: { isActive: true },
    });

    if (result.count > 0) {
      await sendTelegramMessage(
        chatId,
        `🔔 <b>Alerts Resumed</b>\n\nReactivated notifications for ${result.count} project(s).`
      );
    } else {
      await sendTelegramMessage(
        chatId,
        `Alerts are already active for all linked projects in this chat.`
      );
    }
    return;
  }

  // 9. Handle /help
  if (text === "/help") {
    await sendTelegramMessage(
      chatId,
      `🤖 <b>Pulse Bot Commands:</b>
━━━━━━━━━━━━━━━━━━
• <code>/status</code> - View active subscriptions & system health
• <code>/latest</code> - View most recent error & AI diagnosis
• <code>/projects</code> - List all projects linked to this chat
• <code>/link &lt;pin&gt;</code> - Link project using 6-digit PIN
• <code>/stop</code> - Pause alerts for this chat
• <code>/resume</code> - Resume alerts for this chat
• <code>/help</code> - Show this command menu

💬 <b>AI Chat Assistant:</b>
You can chat with me directly! Send any question about your errors, bugs, or system health.`
    );
    return;
  }

  // 10. Conversational AI Chat via Rumpty AI
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
              title: true,
              status: true,
              occurrenceCount: true,
              aiDiagnosis: true,
            },
          },
        },
      },
    },
  });

  let systemPrompt = PULSE_AI_CHAT_SYSTEM_PROMPT;

  const isCasualGreeting = /^(yo|hey|hi|hello|sup|beans|gm|gn)\b/i.test(text);

  if (linked.length > 0 && !isCasualGreeting) {
    const contextLines = linked.map((item) => {
      const incidentsList = item.project.incidents
        .slice(0, 2)
        .map(
          (inc) =>
            `- ${inc.title.slice(0, 80)} (${inc.status}, ${inc.occurrenceCount}x)`
        )
        .join("\n");
      return `Project "${item.project.name}":\n${incidentsList || "All systems green."}`;
    });
    systemPrompt += `\n\nUser's linked projects context:\n${contextLines.join("\n\n")}`;
  }

  try {
    const aiReply = await queryRumptyAiChat(text, systemPrompt);
    await sendTelegramMessage(chatId, aiReply);
  } catch (err: any) {
    logger.error("Failed to generate or deliver AI reply to Telegram", {
      chatId,
      error: err?.message || String(err),
    });
    await sendTelegramMessage(chatId, "pulse is online. what are we debugging?").catch(() => {});
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
