import { NextResponse } from "next/server";
import { prisma } from "@pulse/db";
import { randomBytes } from "node:crypto";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const project = await prisma.project.findUnique({
      where: { slug },
      include: {
        telegramIntegrations: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const integration = project.telegramIntegrations[0] || null;
    return NextResponse.json({
      connected: Boolean(integration?.chatId && integration?.isActive),
      integration,
    });
  } catch (error) {
    console.error("[API get telegram integration GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch Telegram integration status" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await req.json();
    const { chatId, chatTitle, verificationToken } = body;

    if (!chatId && !verificationToken) {
      return NextResponse.json(
        { error: "chatId or verificationToken is required" },
        { status: 400 }
      );
    }

    const project = await prisma.project.findUnique({
      where: { slug },
      include: { telegramIntegrations: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    let integration;

    if (verificationToken) {
      integration = await prisma.telegramIntegration.findUnique({
        where: { verificationToken },
      });
      if (!integration || integration.projectId !== project.id) {
        return NextResponse.json({ error: "Invalid verification token" }, { status: 404 });
      }
    } else {
      integration = project.telegramIntegrations[0];
    }

    const cleanChatId = String(chatId).trim();

    if (integration) {
      integration = await prisma.telegramIntegration.update({
        where: { id: integration.id },
        data: {
          chatId: cleanChatId,
          chatTitle: chatTitle || "Direct Chat",
          isActive: true,
          consumedAt: new Date(),
        },
      });
    } else {
      integration = await prisma.telegramIntegration.create({
        data: {
          projectId: project.id,
          chatId: cleanChatId,
          chatTitle: chatTitle || "Direct Chat",
          verificationToken: `plink_${randomBytes(8).toString("hex")}`,
          isActive: true,
          consumedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      integration,
    });
  } catch (error) {
    console.error("[API update telegram integration PATCH]", error);
    return NextResponse.json(
      { error: "Failed to update Telegram integration" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const project = await prisma.project.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const verificationToken = `plink_${randomBytes(8).toString("hex")}`;

    const integration = await prisma.telegramIntegration.create({
      data: {
        projectId: project.id,
        verificationToken,
      },
      select: {
        id: true,
        verificationToken: true,
        createdAt: true,
        isActive: true,
      },
    });

    const botUsername =
      process.env.TELEGRAM_BOT_USERNAME ||
      process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ||
      "rumptypulsebot";
    const deepLink = `https://t.me/${botUsername}?start=${verificationToken}`;

    return NextResponse.json(
      {
        id: integration.id,
        verificationToken: integration.verificationToken,
        deepLink,
        createdAt: integration.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API create telegram token POST]", error);
    return NextResponse.json({ error: "Failed to generate Telegram token" }, { status: 500 });
  }
}
