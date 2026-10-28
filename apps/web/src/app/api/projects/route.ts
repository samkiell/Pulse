import { NextResponse } from "next/server";
import { prisma } from "@pulse/db";
import { createHash, randomBytes } from "node:crypto";

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        apiKeys: {
          where: { isActive: true },
          select: { id: true, keyPrefix: true, lastUsedAt: true, createdAt: true, name: true },
        },
        telegramIntegrations: {
          where: { isActive: true },
          select: {
            id: true,
            chatId: true,
            chatTitle: true,
            verificationToken: true,
            createdAt: true,
            consumedAt: true,
          },
        },
        _count: {
          select: {
            incidents: true,
            errorEvents: true,
          },
        },
      },
    });

    const sanitized = projects.map((project) => ({
      ...project,
      apiKeys: project.apiKeys.map((k) => ({
        ...k,
        maskedKey: `${k.keyPrefix}••••••••••••••••••••••••`,
      })),
    }));

    return NextResponse.json(sanitized);
  } catch (error) {
    console.error("[API projects GET]", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }

    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const randomSuffix = randomBytes(2).toString("hex");
    const slug = `${baseSlug}-${randomSuffix}`;

    const rawApiKey = `pulse_live_${randomBytes(16).toString("hex")}`;
    const keyHash = hashKey(rawApiKey);
    const keyPrefix = rawApiKey.slice(0, 12);
    const telegramToken = `plink_${randomBytes(8).toString("hex")}`;

    const project = await prisma.project.create({
      data: {
        name,
        slug,
        apiKeys: {
          create: {
            keyHash,
            keyPrefix,
            name: "Default API Key",
          },
        },
        telegramIntegrations: {
          create: {
            verificationToken: telegramToken,
          },
        },
      },
      include: {
        apiKeys: {
          select: { id: true, keyPrefix: true, lastUsedAt: true, createdAt: true, name: true },
        },
        telegramIntegrations: true,
      },
    });

    const botUsername =
      process.env.TELEGRAM_BOT_USERNAME ||
      process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ||
      "PulseAlertBot";
    const telegramDeepLink = `https://t.me/${botUsername}?start=${telegramToken}`;

    return NextResponse.json(
      {
        ...project,
        apiKey: rawApiKey,
        telegramDeepLink,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API projects POST]", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
