import { NextResponse } from "next/server";
import { prisma } from "@pulse/db";
import { randomBytes } from "node:crypto";

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
      "PulseAlertBot";
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
