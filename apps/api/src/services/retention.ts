import { prisma } from "@pulse/db";
import { config } from "../config";
import { logger } from "../lib/logger";

export async function runRetentionJob(): Promise<{ prunedOldCount: number; prunedOverflowCount: number }> {
  try {
    const days = config.retentionDays || 30;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // 1. Delete events older than RETENTION_DAYS
    const oldDeleteResult = await prisma.errorEvent.deleteMany({
      where: {
        timestamp: { lt: cutoff },
      },
    });

    // 2. Keep at most newest 100 events per incident
    const incidentsWithEvents = await prisma.incident.findMany({
      select: {
        id: true,
        _count: {
          select: { events: true },
        },
      },
      where: {
        events: {
          some: {},
        },
      },
    });

    let prunedOverflowCount = 0;

    for (const incident of incidentsWithEvents) {
      if (incident._count.events > 100) {
        // Retrieve ids past the 100 newest events
        const overflow = await prisma.errorEvent.findMany({
          where: { incidentId: incident.id },
          orderBy: { timestamp: "desc" },
          skip: 100,
          select: { id: true },
        });

        if (overflow.length > 0) {
          const ids = overflow.map((o) => o.id);
          const delRes = await prisma.errorEvent.deleteMany({
            where: {
              id: { in: ids },
            },
          });
          prunedOverflowCount += delRes.count;
        }
      }
    }

    logger.info("Retention job completed successfully", {
      prunedOlderThanDays: days,
      prunedOldCount: oldDeleteResult.count,
      prunedOverflowCount,
    });

    return {
      prunedOldCount: oldDeleteResult.count,
      prunedOverflowCount,
    };
  } catch (error: any) {
    logger.error("Retention job execution failed", {
      error: error.message || String(error),
    });
    return { prunedOldCount: 0, prunedOverflowCount: 0 };
  }
}

/**
 * Starts the daily retention background schedule (runs immediately and every 24 hours).
 */
export function startRetentionSchedule(): NodeJS.Timeout {
  // Run on startup
  void runRetentionJob();

  // Run every 24 hours
  const intervalMs = 24 * 60 * 60 * 1000;
  const timer = setInterval(() => {
    void runRetentionJob();
  }, intervalMs);

  if (typeof timer.unref === "function") {
    timer.unref();
  }

  return timer;
}
