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
    const errorType = event.errorType || "custom";
    const name = event.name || "Error";
    const message = event.message || "";
    const fingerprint = event.fingerprint;
    const environment = event.environment || "production";
    const timestamp = event.timestamp ? new Date(event.timestamp) : new Date();

    // 1. Find existing open incident for this fingerprint
    const existingIncident = await prisma.incident.findUnique({
      where: {
        projectId_fingerprint: {
          projectId,
          fingerprint,
        },
      },
    });

    const now = new Date();
    const debounceWindowMs = config.alertDebounceWindowMinutes * 60 * 1000;

    if (existingIncident) {
      // Incident already exists
      const timeSinceLastAlert = now.getTime() - new Date(existingIncident.lastAlertedAt).getTime();
      const shouldAlertAgain = timeSinceLastAlert > debounceWindowMs;

      // Update incident counts
      const updatedIncident = await prisma.incident.update({
        where: { id: existingIncident.id },
        data: {
          occurrenceCount: { increment: 1 },
          lastSeenAt: now,
          status: "OPEN", // Reopen if it was previously closed/resolved
          lastAlertedAt: shouldAlertAgain ? now : existingIncident.lastAlertedAt,
        },
      });

      // Save raw error event
      await prisma.errorEvent.create({
        data: {
          projectId,
          incidentId: updatedIncident.id,
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

      // Deduplication: Only dispatch alert if outside the debounce window
      if (shouldAlertAgain) {
        // Trigger alert in background
        void triggerAlertWorkflow(
          projectId,
          projectName,
          projectSlug,
          updatedIncident.id,
          name,
          message,
          event.stack,
          event.metadata,
          updatedIncident.occurrenceCount,
          environment,
          updatedIncident.aiDiagnosis || undefined,
          updatedIncident.suggestedFix || undefined
        );
      }
    } else {
      // 2. New Incident: First occurrence
      const title = `${name}: ${message.slice(0, 100)}`;
      const severity = errorType === "uncaughtException" || errorType === "unhandledRejection" ? "CRITICAL" : "ERROR";

      const newIncident = await prisma.incident.create({
        data: {
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
      });

      // Save raw error event
      await prisma.errorEvent.create({
        data: {
          projectId,
          incidentId: newIncident.id,
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

      // Trigger AI Diagnosis + Telegram Alert in background
      void triggerAlertWorkflow(
        projectId,
        projectName,
        projectSlug,
        newIncident.id,
        name,
        message,
        event.stack,
        event.metadata,
        1,
        environment
      );
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
  existingFix?: string
) {
  try {
    let diagnosis = existingDiagnosis;
    let suggestedFix = existingFix;

    // Run AI Diagnosis if not already cached
    if (!diagnosis || !suggestedFix) {
      const aiResult = await diagnoseError(name, message, stack, metadata);
      diagnosis = aiResult.diagnosis;
      suggestedFix = aiResult.suggestedFix;

      // Update incident with AI explanation
      await prisma.incident.update({
        where: { id: incidentId },
        data: {
          aiDiagnosis: diagnosis,
          suggestedFix,
        },
      });
    }

    // Send Telegram alert
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
    });
  } catch (err) {
    console.error(`[Pulse Alert Worker] Failed for incident ${incidentId}:`, err);
  }
}

// Sliding window deduplication logic