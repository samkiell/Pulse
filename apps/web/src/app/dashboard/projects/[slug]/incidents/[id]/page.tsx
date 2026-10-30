import { notFound } from "next/navigation";
import { requireUser, requireOwnedIncident } from "@/lib/auth-helpers";
import { prisma } from "@pulse/db";
import { IncidentDetailClient, IncidentDetailData } from "./IncidentDetailClient";
import { OccurrencePoint } from "./OccurrencesChart";

export default async function IncidentPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const user = await requireUser();
  const { slug, id } = await params;

  // Strict ownership check: throws 404 if incident does not exist or does not belong to user
  const incident = await requireOwnedIncident(user.id, slug, id);

  const now = new Date();

  // Bucket events for 24h chart (hourly)
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const events24h = await prisma.errorEvent.findMany({
    where: {
      incidentId: incident.id,
      timestamp: { gte: twentyFourHoursAgo },
    },
    select: { timestamp: true },
  });

  const chart24h: OccurrencePoint[] = [];
  for (let i = 23; i >= 0; i--) {
    const bucketStart = new Date(now.getTime() - (i + 1) * 60 * 60 * 1000);
    const bucketEnd = new Date(now.getTime() - i * 60 * 60 * 1000);
    const count = events24h.filter(
      (e) => e.timestamp >= bucketStart && e.timestamp < bucketEnd
    ).length;
    const hourLabel = bucketStart.toLocaleTimeString([], { hour: "numeric", hour12: false });
    chart24h.push({ label: `${hourLabel}h`, count });
  }

  // Bucket events for 7d chart (daily)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const events7d = await prisma.errorEvent.findMany({
    where: {
      incidentId: incident.id,
      timestamp: { gte: sevenDaysAgo },
    },
    select: { timestamp: true },
  });

  const chart7d: OccurrencePoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const bucketStart = new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000);
    const bucketEnd = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const count = events7d.filter(
      (e) => e.timestamp >= bucketStart && e.timestamp < bucketEnd
    ).length;
    const dayLabel = bucketStart.toLocaleDateString([], { weekday: "short" });
    chart7d.push({ label: dayLabel, count });
  }

  const incidentData: IncidentDetailData = {
    id: incident.id,
    projectId: incident.projectId,
    projectSlug: incident.project.slug,
    projectName: incident.project.name,
    fingerprint: incident.fingerprint,
    title: incident.title,
    status: incident.status,
    severity: incident.severity,
    occurrenceCount: incident.occurrenceCount,
    firstSeenAt: incident.firstSeenAt,
    lastSeenAt: incident.lastSeenAt,
    lastAlertedAt: incident.lastAlertedAt,
    aiDiagnosis: incident.aiDiagnosis,
    suggestedFix: incident.suggestedFix,
    diagnosisSource: incident.diagnosisSource,
    events: incident.events.map((e) => ({
      id: e.id,
      errorType: e.errorType,
      name: e.name,
      message: e.message,
      stack: e.stack,
      environment: e.environment,
      release: e.release,
      metadata: e.metadata,
      timestamp: e.timestamp,
    })),
    chart24h,
    chart7d,
  };

  return <IncidentDetailClient incident={incidentData} />;
}

