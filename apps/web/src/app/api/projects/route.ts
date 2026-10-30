import { NextResponse } from "next/server";
import { prisma } from "@pulse/db";
import { createHash, randomBytes } from "node:crypto";
import {
  requireApiUser,
  generateProjectSlug,
  MAX_PROJECTS_PER_USER,
} from "@/lib/auth-helpers";

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export async function GET() {
  try {
    const { user, unauthorizedResponse } = await requireApiUser();
    if (unauthorizedResponse) return unauthorizedResponse;

    const projects = await prisma.project.findMany({
      where: { ownerId: user.id },
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
    const { user, unauthorizedResponse } = await requireApiUser();
    if (unauthorizedResponse) return unauthorizedResponse;

    // Check project limit
    const existingCount = await prisma.project.count({
      where: { ownerId: user.id },
    });

    if (existingCount >= MAX_PROJECTS_PER_USER) {
      return NextResponse.json(
        { error: `Project limit reached. Maximum ${MAX_PROJECTS_PER_USER} projects allowed per account.` },
        { status: 400 }
      );
    }

    const body = await req.json();
    const name = body.name?.trim();
    const label = body.label?.trim();

    if (!name) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }

    const slug = generateProjectSlug(name);
    const rawApiKey = `pulse_live_${randomBytes(16).toString("hex")}`;
    const keyHash = hashKey(rawApiKey);
    const keyPrefix = rawApiKey.slice(0, 12);
    const telegramToken = `plink_${randomBytes(8).toString("hex")}`;

    const project = await prisma.project.create({
      data: {
        name,
        slug,
        ownerId: user.id,
        apiKeys: {
          create: {
            keyHash,
            keyPrefix,
            name: label ? `${label} Key` : "Default API Key",
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
      "rumptypulsebot";
    const telegramDeepLink = `https://t.me/${botUsername}?start=${telegramToken}`;
    const ingestEndpoint =
      process.env.INTERNAL_INGEST_URL ||
      process.env.NEXT_PUBLIC_INGEST_URL ||
      "http://localhost:3001/api/v1/ingest";

    return NextResponse.json(
      {
        ...project,
        apiKey: rawApiKey,
        telegramDeepLink,
        ingestEndpoint,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API projects POST]", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
