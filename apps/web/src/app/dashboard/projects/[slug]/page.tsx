import { requireUser, requireOwnedProject, computeConnectionStatus } from "@/lib/auth-helpers";
import { prisma } from "@pulse/db";
import { ProjectTabsClient, ProjectData } from "./ProjectTabsClient";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await requireUser();
  const { slug } = await params;

  // Strict ownership check: returns 404 if missing or belongs to another user
  const project = await requireOwnedProject(user.id, slug);

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Stats queries
  const [events24hCount, alerts7dCount, lastEvent] = await Promise.all([
    prisma.errorEvent.count({
      where: {
        projectId: project.id,
        timestamp: { gte: twentyFourHoursAgo },
      },
    }),
    prisma.incident.count({
      where: {
        projectId: project.id,
        lastAlertedAt: { gte: sevenDaysAgo },
      },
    }),
    prisma.errorEvent.findFirst({
      where: { projectId: project.id },
      orderBy: { timestamp: "desc" },
      select: { timestamp: true },
    }),
  ]);

  // Incidents
  const incidents = await prisma.incident.findMany({
    where: { projectId: project.id },
    orderBy: { lastSeenAt: "desc" },
    select: {
      id: true,
      title: true,
      fingerprint: true,
      status: true,
      severity: true,
      occurrenceCount: true,
      firstSeenAt: true,
      lastSeenAt: true,
      diagnosisSource: true,
    },
  });

  const openIncidents = incidents.filter((i) => i.status === "OPEN").length;
  const connectionStatus = computeConnectionStatus(
    project._count.errorEvents,
    lastEvent?.timestamp
  );

  const activeKey = project.apiKeys[0] || null;
  const botUsername =
    process.env.TELEGRAM_BOT_USERNAME ||
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ||
    "rumptypulsebot";
  const ingestEndpoint =
    process.env.INTERNAL_INGEST_URL ||
    process.env.NEXT_PUBLIC_INGEST_URL ||
    "http://localhost:3001/api/v1/ingest";

  const projectData: ProjectData = {
    id: project.id,
    name: project.name,
    slug: project.slug,
    createdAt: project.createdAt,
    connectionStatus,
    stats: {
      openIncidents,
      events24h: events24hCount,
      alerts7d: alerts7dCount,
      lastEventAt: lastEvent?.timestamp || null,
    },
    activeKey: activeKey
      ? {
          id: activeKey.id,
          keyPrefix: activeKey.keyPrefix,
          name: activeKey.name,
          createdAt: activeKey.createdAt,
          lastUsedAt: activeKey.lastUsedAt,
        }
      : null,
    integrations: project.telegramIntegrations.map((t) => ({
      id: t.id,
      chatId: t.chatId,
      chatTitle: t.chatTitle,
      verificationToken: t.verificationToken,
      linkPin: t.linkPin,
      createdAt: t.createdAt,
      consumedAt: t.consumedAt,
      deepLink: `https://t.me/${botUsername}?start=${t.verificationToken}`,
    })),
    incidents,
    botUsername,
    ingestEndpoint,
  };

  return <ProjectTabsClient project={projectData} />;
}

