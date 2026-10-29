import { NextResponse } from "next/server";
import { prisma } from "@pulse/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const project = await prisma.project.findUnique({
      where: { slug },
      include: {
        apiKeys: {
          where: { isActive: true },
          select: { id: true, keyPrefix: true, name: true, lastUsedAt: true, createdAt: true },
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
            updatedAt: true,
          },
        },
        incidents: {
          orderBy: { lastSeenAt: "desc" },
          include: {
            events: {
              take: 5,
              orderBy: { timestamp: "desc" },
            },
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const openIncidentsCount = project.incidents.filter((i) => i.status === "OPEN").length;
    const totalOccurrences = project.incidents.reduce((acc, curr) => acc + curr.occurrenceCount, 0);

    const botUsername =
      process.env.TELEGRAM_BOT_USERNAME ||
      process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ||
      "rumptypulsebot";

    const sanitizedProject = {
      ...project,
      apiKeys: project.apiKeys.map((k) => ({
        ...k,
        maskedKey: `${k.keyPrefix}••••••••••••••••••••••••`,
      })),
      telegramIntegrations: project.telegramIntegrations.map((t) => ({
        ...t,
        deepLink: `https://t.me/${botUsername}?start=${t.verificationToken}`,
      })),
    };

    return NextResponse.json({
      project: sanitizedProject,
      stats: {
        openIncidents: openIncidentsCount,
        resolvedIncidents: project.incidents.length - openIncidentsCount,
        totalErrors: totalOccurrences,
      },
    });
  } catch (error) {
    console.error("[API project by slug GET]", error);
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}
