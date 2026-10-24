import { NextResponse } from "next/server";
import { prisma } from "@pulse/db";
import { randomBytes } from "node:crypto";

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        apiKeys: { where: { isActive: true }, select: { id: true, key: true, lastUsedAt: true } },
        telegramIntegrations: { where: { isActive: true }, select: { id: true, chatId: true, chatTitle: true, verificationToken: true } },
        _count: {
          select: {
            incidents: true,
            errorEvents: true,
          },
        },
      },
    });

    return NextResponse.json(projects);
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
    
    // Ensure unique slug
    const randomSuffix = randomBytes(2).toString("hex");
    const slug = `${baseSlug}-${randomSuffix}`;

    const rawApiKey = `pulse_live_${randomBytes(16).toString("hex")}`;
    const telegramToken = `plink_${randomBytes(8).toString("hex")}`;

    const project = await prisma.project.create({
      data: {
        name,
        slug,
        apiKeys: {
          create: {
            key: rawApiKey,
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
        apiKeys: true,
        telegramIntegrations: true,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("[API projects POST]", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
