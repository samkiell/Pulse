import { prisma } from "@pulse/db";
import { config } from "../config";
import { diagnoseError } from "./ai";
import { sendTelegramAlert } from "./telegram";

export interface IngestEventItem {
  errorType: string;
  name: string;
  message: string;
  stack?: string;
  fingerprint: string;
  environment?: string;
  release?: string;
  metadata?: Record<string, any>;
  timestamp?: string;
}

export interface IncidentAlertState {
  status: string;
  lastAlertedAt: Date;
}

export interface AlertDecision {
  shouldAlert: boolean;
  nextStatus: string;
  isRegression: boolean;
}

/**
 * Pure decision function determining whether an alert should fire.
 */
export function decideAlert(
  existing: IncidentAlertState | null | undefined,
  now: Date,
  windowMs: number
): AlertDecision {
  if (!existing) {
    return { shouldAlert: true, nextStatus: "OPEN", isRegression: false };
  }

  if (existing.status === "MUTED") {
    return { shouldAlert: false, nextStatus: "MUTED", isRegression: false };
  }

  if (existing.status === "RESOLVED") {
    return { shouldAlert: true, nextStatus: "OPEN", isRegression: true };
  }

  const timeSinceLastAlert = now.getTime() - new Date(existing.lastAlertedAt).getTime();
  const shouldAlert = timeSinceLastAlert > windowMs;
  return { shouldAlert, nextStatus: "OPEN", isRegression: false };
}

/**
 * Ingests events and executes anomaly detection and deduplication.
 */
export async function processIngestBatch(
  projectId: string,
  projectName: string,
  projectSlug: string,
  events: IngestEventItem[]
) {
  for (const event of events) {
    try {
      const errorType = event.errorType || "custom";
      const name = event.name || "Error";
      const message = event.message || "";
      const fingerprint = event.fingerprint;
      const environment = event.environment || "production";
      const timestamp = event.timestamp ? new Date(event.timestamp) : new Date();
      const now = new Date();
      const debounceWindowMs = config.alertDebounceWindowMinutes * 60 * 1000;
      const title = `${name}: ${message.slice(0, 100)}`;
      const severity =
        errorType === "uncaughtException" || errorType === "unhandledRejection"
          ? "CRITICAL"
          : "ERROR";

      // 1. Atomic upsert to prevent unique constraint crashes under concurrent ingest
      const incident = await prisma.incident.upsert({
        where: {
          projectId_fingerprint: {
            projectId,
            fingerprint,
          },
        },
        create: {
          projectId,
          fingerprint,
          title,
          status: "OPEN",
          severity,
          occurrenceCount: 1,
          firstSeenAt: now,
          lastSeenAt: now,
          lastAlertedAt: now,
        },
        update: {
          occurrenceCount: { increment: 1 },
          lastSeenAt: now,
        },
      });

      // 2. Save raw error event
      await prisma.errorEvent.create({
        data: {
          projectId,
          incidentId: incident.id,
          fingerprint,
          errorType,
          name,
          message,
          stack: event.stack,
          environment,
          release: event.release,
          metadata: event.metadata,
          timestamp,
        },
      });

      // 3. Status rules and atomic alert dispatch
      if (incident.occurrenceCount === 1) {
        // Brand new incident, alert immediately
        void triggerAlertWorkflow(
          projectId,
          projectName,
          projectSlug,
          incident.id,
          name,
          message,
          event.stack,
          event.metadata,
          1,
          environment
        );
      } else if (incident.status === "MUTED") {
        // MUTED status stays muted (count occurrences, no alert)
      } else if (incident.status === "RESOLVED") {
        // RESOLVED reopens to OPEN and alerts immediately (regression), ignoring debounce window
        await prisma.incident.update({
          where: { id: incident.id },
          data: {
            status: "OPEN",
            lastAlertedAt: now,
          },
        });

        void triggerAlertWorkflow(
          projectId,
          projectName,
          projectSlug,
          incident.id,
          name,
          message,
          event.stack,
          event.metadata,
          incident.occurrenceCount,
          environment,
          incident.aiDiagnosis || undefined,
          incident.suggestedFix || undefined,
          incident.diagnosisSource || undefined
        );
      } else {
        // OPEN follows the debounce window atomically
        const threshold = new Date(now.getTime() - debounceWindowMs);
        const updateResult = await prisma.incident.updateMany({
          where: {
            id: incident.id,
            lastAlertedAt: { lt: threshold },
          },
          data: {
            lastAlertedAt: now,
          },
        });

        if (updateResult.count === 1) {
          void triggerAlertWorkflow(
            projectId,
            projectName,
            projectSlug,
            incident.id,
            name,
            message,
            event.stack,
            event.metadata,
            incident.occurrenceCount,
            environment,
            incident.aiDiagnosis || undefined,
            incident.suggestedFix || undefined,
            incident.diagnosisSource || undefined
          );
        }
      }
    } catch (eventError) {
      console.error("[Pulse Ingest] Error processing event in batch:", eventError);
    }
  }
}

/**
 * Background worker: Runs AI root-cause diagnosis and dispatches Telegram notification
 */
async function triggerAlertWorkflow(
  projectId: string,
  projectName: string,
  projectSlug: string,
  incidentId: string,
  name: string,
  message: string,
  stack?: string,
  metadata?: Record<string, any>,
  occurrenceCount: number = 1,
  environment: string = "production",
  existingDiagnosis?: string,
  existingFix?: string,
  existingSource?: string
) {
  try {
    let diagnosis = existingDiagnosis;
    let suggestedFix = existingFix;
    let source = existingSource || "heuristic";

    // Re-run diagnosis if not cached or if cached source was heuristic
    if (!diagnosis || !suggestedFix || source === "heuristic") {
      const aiResult = await diagnoseError(name, message, stack, metadata);
      diagnosis = aiResult.diagnosis;
      suggestedFix = aiResult.suggestedFix;
      source = (aiResult as any).source || "heuristic";

      await prisma.incident.update({
        where: { id: incidentId },
        data: {
          aiDiagnosis: diagnosis,
          suggestedFix,
          diagnosisSource: source,
        },
      });
    }

    const isRuleBased = source === "heuristic";

    await sendTelegramAlert(projectId, {
      projectName,
      projectSlug,
      incidentId,
      errorName: name,
      errorMessage: message,
      occurrenceCount,
      environment,
      aiDiagnosis: diagnosis,
      suggestedFix,
      isRuleBased,
    });
  } catch (err) {
    console.error(`[Pulse Alert Worker] Failed for incident ${incidentId}:`, err);
  }
}
