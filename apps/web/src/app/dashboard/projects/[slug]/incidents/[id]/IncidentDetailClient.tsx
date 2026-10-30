"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { useToast } from "@/components/ui/Toast";
import { OccurrencesChart, OccurrencePoint } from "./OccurrencesChart";
import { StackTraceViewer } from "./StackTraceViewer";
import {
  ArrowLeft,
  CheckCircle,
  VolumeX,
  RotateCcw,
  Sparkles,
  Layers,
  Terminal,
  Activity,
  Calendar,
  Clock,
  Shield,
} from "lucide-react";

export interface IncidentDetailData {
  id: string;
  projectId: string;
  projectSlug: string;
  projectName: string;
  fingerprint: string;
  title: string;
  status: string;
  severity: string;
  occurrenceCount: number;
  firstSeenAt: Date | string;
  lastSeenAt: Date | string;
  lastAlertedAt: Date | string;
  aiDiagnosis: string | null;
  suggestedFix: string | null;
  diagnosisSource: string | null;
  events: Array<{
    id: string;
    errorType: string;
    name: string;
    message: string;
    stack: string | null;
    environment: string;
    release: string | null;
    metadata: any;
    timestamp: Date | string;
  }>;
  chart24h: OccurrencePoint[];
  chart7d: OccurrencePoint[];
}

export function IncidentDetailClient({ incident }: { incident: IncidentDetailData }) {
  const router = useRouter();
  const { toast } = useToast();

  const [status, setStatus] = useState(incident.status);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const latestEvent = incident.events[0] || null;

  const handleUpdateStatus = async (newStatus: "OPEN" | "RESOLVED" | "MUTED") => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(
        `/api/projects/${incident.projectSlug}/incidents/${incident.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!res.ok) throw new Error("Failed to update status");

      setStatus(newStatus);
      toast(`Incident marked as ${newStatus}`, "success");
      router.refresh();
    } catch (err: any) {
      toast(err.message || "Failed to update incident", "error");
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href={`/dashboard/projects/${incident.projectSlug}`}
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-text transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to {incident.projectName}</span>
        </Link>

        <span className="text-xs font-mono text-muted/70">
          ID: {incident.id.slice(0, 10)}...
        </span>
      </div>

      {/* Incident Header & Actions */}
      <Card className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Badge
              variant={
                status === "OPEN"
                  ? "critical"
                  : status === "RESOLVED"
                  ? "ok"
                  : "default"
              }
              className="text-xs px-3 py-1"
            >
              {status}
            </Badge>

            <span className="text-xs font-mono text-muted">
              {incident.occurrenceCount} occurrences
            </span>
          </div>

          {/* Incident Action Buttons */}
          <div className="flex items-center gap-2">
            {status !== "RESOLVED" && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleUpdateStatus("RESOLVED")}
                isLoading={updatingStatus}
                className="text-ok hover:bg-ok/10 hover:border-ok/30"
              >
                <CheckCircle className="w-3.5 h-3.5 text-ok" />
                <span>Resolve</span>
              </Button>
            )}

            {status !== "MUTED" && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleUpdateStatus("MUTED")}
                isLoading={updatingStatus}
                className="text-muted hover:text-text"
              >
                <VolumeX className="w-3.5 h-3.5" />
                <span>Mute</span>
              </Button>
            )}

            {status !== "OPEN" && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleUpdateStatus("OPEN")}
                isLoading={updatingStatus}
                className="text-cyan hover:bg-cyan/10"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reopen</span>
              </Button>
            )}
          </div>
        </div>

        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-text leading-snug">
            {incident.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-xs font-mono text-muted">
            <span>First seen: <RelativeTime date={incident.firstSeenAt} /></span>
            <span>•</span>
            <span>Last seen: <RelativeTime date={incident.lastSeenAt} /></span>
            <span>•</span>
            <span>Fingerprint: <code>{incident.fingerprint}</code></span>
          </div>
        </div>
      </Card>

      {/* AI Root Cause Card */}
      <Card className="border-cyan/30 bg-surface">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan" />
            <h3 className="text-sm font-semibold text-text">Root Cause Analysis</h3>
          </div>
          <Badge variant={incident.diagnosisSource === "rumpty" ? "ai" : "rule"}>
            {incident.diagnosisSource === "rumpty" ? "AI" : "Rule-based"}
          </Badge>
        </div>

        <p className="mt-3 text-xs text-text leading-relaxed">
          {incident.aiDiagnosis || "Analyzing error context..."}
        </p>

        {/* Suggested Fix */}
        {incident.suggestedFix && (
          <div className="mt-4 pt-4 border-t border-border flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ok">Suggested Fix</span>
              <CopyButton text={incident.suggestedFix} label="Copy Fix" />
            </div>
            <div className="bg-bg border border-border rounded-md p-3 font-mono text-xs text-cyan overflow-x-auto leading-relaxed">
              <code>{incident.suggestedFix}</code>
            </div>
          </div>
        )}
      </Card>

      {/* Occurrences Chart */}
      <Card>
        <OccurrencesChart
          points24h={incident.chart24h}
          points7d={incident.chart7d}
        />
      </Card>

      {/* Stack Trace Viewer */}
      <StackTraceViewer stack={latestEvent?.stack} />

      {/* Metadata Table */}
      {latestEvent?.metadata && (
        <Card>
          <CardHeader
            title="Context & Metadata"
            description="Scrubbed environment and request attributes captured at time of crash."
          />
          <div className="bg-bg border border-border rounded-md p-3 overflow-x-auto">
            <pre className="font-mono text-xs text-text leading-relaxed">
              <code>{JSON.stringify(latestEvent.metadata, null, 2)}</code>
            </pre>
          </div>
        </Card>
      )}

      {/* Recent Events List */}
      <Card>
        <CardHeader
          title={`Recent Error Events (${incident.events.length})`}
          description="Most recent occurrences grouped under this incident fingerprint."
        />
        <div className="divide-y divide-border border border-border rounded-md overflow-hidden bg-surface">
          {incident.events.map((event) => (
            <div
              key={event.id}
              className="p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-text truncate font-medium">
                  {event.name}: {event.message.slice(0, 120)}
                </span>
                <span className="text-[11px] font-mono text-muted">
                  env: <code>{event.environment}</code> {event.release ? `• release: ${event.release}` : ""}
                </span>
              </div>
              <span className="text-muted font-mono text-[11px] shrink-0">
                <RelativeTime date={event.timestamp} />
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

