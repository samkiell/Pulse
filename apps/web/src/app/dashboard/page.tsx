import Link from "next/link";
import { requireUser, computeConnectionStatus } from "@/lib/auth-helpers";
import { prisma } from "@pulse/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatusDot } from "@/components/ui/StatusDot";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { FolderKanban, Plus, Send, AlertTriangle, ArrowRight } from "lucide-react";

export default async function DashboardOverviewPage() {
  const user = await requireUser();

  const projects = await prisma.project.findMany({
    where: { ownerId: user.id },
    include: {
      incidents: {
        where: { status: "OPEN" },
        select: { id: true },
      },
      errorEvents: {
        orderBy: { timestamp: "desc" },
        take: 1,
        select: { timestamp: true },
      },
      telegramIntegrations: {
        where: { isActive: true, consumedAt: { not: null } },
        select: { id: true },
      },
      _count: {
        select: { errorEvents: true, incidents: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const projectCards = projects.map((p) => {
    const totalEvents = p._count.errorEvents;
    const lastEventAt = p.errorEvents[0]?.timestamp;
    const connectionStatus = computeConnectionStatus(totalEvents, lastEventAt);
    const openIncidentsCount = p.incidents.length;
    const telegramChatsCount = p.telegramIntegrations.length;

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      connectionStatus,
      openIncidentsCount,
      telegramChatsCount,
      lastEventAt,
      createdAt: p.createdAt,
    };
  });

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text">
            Projects Overview
          </h1>
          <p className="text-xs text-muted mt-1">
            Real-time status, active crashes, and Telegram connections for your deployed services
          </p>
        </div>

        {projects.length > 0 && (
          <Link href="/dashboard/new">
            <Button variant="primary" size="sm">
              <Plus className="w-3.5 h-3.5" />
              <span>Create Project</span>
            </Button>
          </Link>
        )}
      </div>

      {/* Projects List or Empty State */}
      {projectCards.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects configured"
          description="Create your first monitored application to receive an API key and start streaming error alerts."
          action={
            <Link href="/dashboard/new">
              <Button variant="primary" size="md">
                <Plus className="w-4 h-4" />
                <span>Create your first project</span>
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projectCards.map((p) => {
            let statusBadgeVariant: "ok" | "warning" | "info" = "info";
            if (p.connectionStatus === "Connected") statusBadgeVariant = "ok";
            if (p.connectionStatus === "Silent") statusBadgeVariant = "warning";

            return (
              <Link
                key={p.id}
                href={`/dashboard/projects/${p.slug}`}
                className="group block"
              >
                <Card
                  hover
                  className="h-full flex flex-col justify-between group-hover:border-border/90"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-base font-semibold text-text group-hover:text-cyan transition-colors truncate">
                        {p.name}
                      </h2>
                      <Badge variant={statusBadgeVariant}>
                        <StatusDot status={p.connectionStatus} />
                        <span>{p.connectionStatus}</span>
                      </Badge>
                    </div>

                    <div className="text-[11px] font-mono text-muted truncate">
                      slug: {p.slug}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border grid grid-cols-3 gap-2 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-muted uppercase font-mono">
                        Open
                      </span>
                      <span
                        className={`text-sm font-bold font-mono tabular-nums ${
                          p.openIncidentsCount > 0 ? "text-critical" : "text-text"
                        }`}
                      >
                        {p.openIncidentsCount}
                      </span>
                    </div>

                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-muted uppercase font-mono">
                        Telegram
                      </span>
                      <span className="text-sm font-bold font-mono text-text tabular-nums">
                        {p.telegramChatsCount}
                      </span>
                    </div>

                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-muted uppercase font-mono">
                        Last Event
                      </span>
                      <span className="text-xs font-mono text-muted tabular-nums">
                        {p.lastEventAt ? (
                          <RelativeTime date={p.lastEventAt} />
                        ) : (
                          "None"
                        )}
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

