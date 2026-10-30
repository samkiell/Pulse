import { NextResponse } from "next/server";
import { prisma } from "@pulse/db";
import { randomBytes } from "node:crypto";
import { requireApiUser, getOwnedProject } from "@/lib/auth-helpers";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { user, unauthorizedResponse } = await requireApiUser();
    if (unauthorizedResponse) return unauthorizedResponse;

    const { slug } = await params;
    const project = await getOwnedProject(user.id, slug);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const integrations = await prisma.telegramIntegration.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "desc" },
    });

    const botUsername =
      process.env.TELEGRAM_BOT_USERNAME ||
      process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ||
      "rumptypulsebot";

    return NextResponse.json({
      botUsername,
      integrations: integrations.map((i) => ({
        ...i,
        deepLink: `https://t.me/${botUsername}?start=${i.verificationToken}`,
      })),
    });
  } catch (error) {
    console.error("[API get telegram integrations GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch Telegram integration status" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { user, unauthorizedResponse } = await requireApiUser();
    if (unauthorizedResponse) return unauthorizedResponse;

    const { slug } = await params;
    const project = await getOwnedProject(user.id, slug);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Generate fresh single-use verification token valid for 24h
    const verificationToken = `plink_${randomBytes(8).toString("hex")}`;

    const integration = await prisma.telegramIntegration.create({
      data: {
        projectId: project.id,
        verificationToken,
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
        botUsername,
        createdAt: integration.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API create telegram token POST]", error);
    return NextResponse.json({ error: "Failed to generate Telegram token" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { user, unauthorizedResponse } = await requireApiUser();
    if (unauthorizedResponse) return unauthorizedResponse;

    const { slug } = await params;
    const project = await getOwnedProject(user.id, slug);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const integrationId = searchParams.get("id");

    if (!integrationId) {
      return NextResponse.json({ error: "Integration ID is required" }, { status: 400 });
    }

    // Ensure integration belongs to this project
    const integration = await prisma.telegramIntegration.findFirst({
      where: { id: integrationId, projectId: project.id },
    });

    if (!integration) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    }

    await prisma.telegramIntegration.delete({
      where: { id: integration.id },
    });

    return NextResponse.json({ success: true, message: "Chat unlinked successfully" });
  } catch (error) {
    console.error("[API delete telegram integration DELETE]", error);
    return NextResponse.json({ error: "Failed to unlink chat" }, { status: 500 });
  }
}
