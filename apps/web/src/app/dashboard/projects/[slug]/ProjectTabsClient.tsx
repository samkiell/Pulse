"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Tabs } from "@/components/ui/Tabs";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatusDot } from "@/components/ui/StatusDot";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { CopyButton } from "@/components/ui/CopyButton";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import {
  AlertTriangle,
  RotateCw,
  Send,
  Zap,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Search,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
} from "lucide-react";

export interface ProjectData {
  id: string;
  name: string;
  slug: string;
  createdAt: Date | string;
  connectionStatus: "Waiting for first event" | "Connected" | "Silent";
  stats: {
    openIncidents: number;
    events24h: number;
    alerts7d: number;
    lastEventAt: Date | string | null;
  };
  activeKey: {
    id: string;
    keyPrefix: string;
    name: string;
    createdAt: Date | string;
    lastUsedAt: Date | string | null;
  } | null;
  integrations: Array<{
    id: string;
    chatId: string | null;
    chatTitle: string | null;
    verificationToken: string;
    createdAt: Date | string;
    consumedAt: Date | string | null;
    deepLink: string;
  }>;
  incidents: Array<{
    id: string;
    title: string;
    fingerprint: string;
    status: string;
    severity: string;
    occurrenceCount: number;
    firstSeenAt: Date | string;
    lastSeenAt: Date | string;
    diagnosisSource: string | null;
  }>;
  botUsername: string;
  ingestEndpoint: string;
}

export function ProjectTabsClient({ project }: { project: ProjectData }) {
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("incidents");

  // Incidents Tab State
  const [incidentFilter, setIncidentFilter] = useState<"ALL" | "OPEN" | "RESOLVED" | "MUTED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Key Rotation State
  const [rotateDialogOpen, setRotateDialogOpen] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [newRotatedKey, setNewRotatedKey] = useState<string | null>(null);

  // Telegram Integration State
  const [generatingTelegramToken, setGeneratingTelegramToken] = useState(false);
  const [newTelegramLink, setNewTelegramLink] = useState<string | null>(null);
  const [integrationsList, setIntegrationsList] = useState(project.integrations);

  // Settings State
  const [renameInput, setRenameInput] = useState(project.name);
  const [renaming, setRenaming] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Simulator State
  const [simulating, setSimulating] = useState(false);

  // Filtered Incidents
  const filteredIncidents = project.incidents.filter((inc) => {
    if (incidentFilter !== "ALL" && inc.status !== incidentFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return inc.title.toLowerCase().includes(q) || inc.fingerprint.toLowerCase().includes(q);
    }
    return true;
  });

  const totalPages = Math.ceil(filteredIncidents.length / pageSize) || 1;
  const paginatedIncidents = filteredIncidents.slice((page - 1) * pageSize, page * pageSize);

  // Handle Key Rotation
  const handleRotateKey = async () => {
    setRotating(true);
    try {
      const res = await fetch(`/api/projects/${project.slug}/keys`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to rotate key");
      const data = await res.json();
      setNewRotatedKey(data.key);
      setRotateDialogOpen(false);
      toast("Key rotated successfully. Old key is revoked.", "success");
      router.refresh();
    } catch (err: any) {
      toast(err.message || "Key rotation failed", "error");
    } finally {
      setRotating(false);
    }
  };

  // Handle Generate Telegram Link
  const handleGenerateTelegramLink = async () => {
    setGeneratingTelegramToken(true);
    try {
      const res = await fetch(`/api/projects/${project.slug}/telegram`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to generate token");
      const data = await res.json();
      setNewTelegramLink(data.deepLink);
      setIntegrationsList((prev) => [data, ...prev]);
      toast("Fresh Telegram deep link generated (valid 24h)", "success");
    } catch (err: any) {
      toast(err.message || "Failed to generate Telegram token", "error");
    } finally {
      setGeneratingTelegramToken(false);
    }
  };

  // Handle Unlink Telegram Chat
  const handleUnlinkTelegram = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${project.slug}/telegram?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to unlink chat");
      setIntegrationsList((prev) => prev.filter((i) => i.id !== id));
      toast("Chat unlinked successfully", "success");
    } catch (err: any) {
      toast(err.message || "Error unlinking chat", "error");
    }
  };

  // Handle Send Test Crash
  const handleSimulateCrash = async () => {
    setSimulating(true);
    try {
      const res = await fetch(`/api/projects/${project.slug}/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ errorType: "uncaughtException" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Simulation failed");
      }
      toast("Test crash dispatched to internal ingestion engine", "success");
      router.refresh();
    } catch (err: any) {
      toast(err.message || "Simulation error", "error");
    } finally {
      setSimulating(false);
    }
  };

  // Handle Rename Project
  const handleRenameProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameInput.trim()) return;
    setRenaming(true);
    try {
      const res = await fetch(`/api/projects/${project.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameInput.trim() }),
      });
      if (!res.ok) throw new Error("Failed to rename project");
      toast("Project renamed successfully", "success");
      router.refresh();
    } catch (err: any) {
      toast(err.message || "Error renaming project", "error");
    } finally {
      setRenaming(false);
    }
  };

  // Handle Delete Project
  const handleDeleteProject = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${project.slug}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete project");
      toast("Project deleted successfully", "success");
      router.push("/dashboard");
    } catch (err: any) {
      toast(err.message || "Error deleting project", "error");
      setDeleting(false);
    }
  };

  const tabs = [
    { id: "incidents", label: "Incidents", badge: project.stats.openIncidents },
    { id: "setup", label: "Setup" },
    { id: "alerts", label: "Alerts", badge: integrationsList.filter((i) => i.consumedAt).length },
    { id: "settings", label: "Settings" },
  ];

  const installSnippet = `npm install @samkiel/pulse-monitor`;
  const expressSnippet = `import express from "express";
import pulse from "@samkiel/pulse-monitor";

const app = express();

pulse.init({
  apiKey: process.env.PULSE_API_KEY!,
  endpoint: "${project.ingestEndpoint}",
});

// Attach Pulse error middleware AFTER all route handlers
app.use(pulse.errorHandler());`;

  const manualCaptureSnippet = `import pulse from "@samkiel/pulse-monitor";

pulse.captureException(new Error("Database connection timeout"), {
  service: "${project.name}",
  region: "eu-west-1",
});`;

  return (
    <div className="flex flex-col gap-6">
      {/* Project Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text">
            {project.name}
          </h1>
          <Badge
            variant={
              project.connectionStatus === "Connected"
                ? "ok"
                : project.connectionStatus === "Silent"
                ? "warning"
                : "info"
            }
          >
            <StatusDot status={project.connectionStatus} />
            <span>{project.connectionStatus}</span>
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSimulateCrash}
            isLoading={simulating}
          >
            <Zap className="w-3.5 h-3.5 text-warning" />
            <span>Send test crash</span>
          </Button>
        </div>
      </div>

      {/* Tabs Bar */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* TAB 1: Incidents */}
      {activeTab === "incidents" && (
        <div className="flex flex-col gap-6">
          {/* Stat Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="flex flex-col gap-1 p-4">
              <span className="text-[10px] text-muted font-mono uppercase">Open Incidents</span>
              <span
                className={`text-2xl font-bold font-mono tabular-nums ${
                  project.stats.openIncidents > 0 ? "text-critical" : "text-text"
                }`}
              >
                {project.stats.openIncidents}
              </span>
            </Card>

            <Card className="flex flex-col gap-1 p-4">
              <span className="text-[10px] text-muted font-mono uppercase">Events (24h)</span>
              <span className="text-2xl font-bold font-mono text-text tabular-nums">
                {project.stats.events24h}
              </span>
            </Card>

            <Card className="flex flex-col gap-1 p-4">
              <span className="text-[10px] text-muted font-mono uppercase">Alerts Sent (7d)</span>
              <span className="text-2xl font-bold font-mono text-text tabular-nums">
                {project.stats.alerts7d}
              </span>
            </Card>

            <Card className="flex flex-col gap-1 p-4">
              <span className="text-[10px] text-muted font-mono uppercase">Last Event</span>
              <span className="text-xs font-mono text-muted tabular-nums mt-1.5">
                {project.stats.lastEventAt ? (
                  <RelativeTime date={project.stats.lastEventAt} />
                ) : (
                  "Never"
                )}
              </span>
            </Card>
          </div>

          {/* Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1 bg-surface-2 p-1 rounded-md border border-border w-fit text-xs">
              {(["ALL", "OPEN", "RESOLVED", "MUTED"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setIncidentFilter(status);
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    incidentFilter === status
                      ? "bg-surface text-text shadow-sm"
                      : "text-muted hover:text-text"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="relative max-w-xs w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Search error message..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="h-9 w-full rounded-md bg-surface border border-border pl-9 pr-3 text-xs text-text placeholder:text-muted focus:border-cyan focus:outline-none"
              />
            </div>
          </div>

          {/* Incidents Table (Responsive: Stacked Cards on Mobile) */}
          {paginatedIncidents.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No incidents found"
              description={
                searchQuery
                  ? "No errors matched your query."
                  : "No errors matching the selected filter in this project."
              }
            />
          ) : (
            <div className="border border-border rounded-lg bg-surface overflow-hidden">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-surface-2/60 text-muted uppercase font-mono text-[10px] border-b border-border">
                    <tr>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Error & Message</th>
                      <th className="px-4 py-3 text-center">Occurrences</th>
                      <th className="px-4 py-3">First Seen</th>
                      <th className="px-4 py-3">Last Seen</th>
                      <th className="px-4 py-3">Diagnosis</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedIncidents.map((inc) => (
                      <tr
                        key={inc.id}
                        onClick={() => router.push(`/dashboard/projects/${project.slug}/incidents/${inc.id}`)}
                        className="hover:bg-surface-2/50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              inc.status === "OPEN"
                                ? "critical"
                                : inc.status === "RESOLVED"
                                ? "ok"
                                : "default"
                            }
                          >
                            {inc.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 max-w-sm truncate">
                          <span className="font-semibold text-text truncate block">
                            {inc.title}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-text tabular-nums">
                          {inc.occurrenceCount}
                        </td>
                        <td className="px-4 py-3 text-muted font-mono text-[11px]">
                          <RelativeTime date={inc.firstSeenAt} />
                        </td>
                        <td className="px-4 py-3 text-muted font-mono text-[11px]">
                          <RelativeTime date={inc.lastSeenAt} />
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={inc.diagnosisSource === "rumpty" ? "ai" : "rule"}>
                            {inc.diagnosisSource === "rumpty" ? "AI" : "Rule-based"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Stacked Cards View (<375px safe) */}
              <div className="md:hidden divide-y divide-border">
                {paginatedIncidents.map((inc) => (
                  <div
                    key={inc.id}
                    onClick={() => router.push(`/dashboard/projects/${project.slug}/incidents/${inc.id}`)}
                    className="p-4 flex flex-col gap-2.5 active:bg-surface-2 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={
                          inc.status === "OPEN"
                            ? "critical"
                            : inc.status === "RESOLVED"
                            ? "ok"
                            : "default"
                        }
                      >
                        {inc.status}
                      </Badge>
                      <Badge variant={inc.diagnosisSource === "rumpty" ? "ai" : "rule"}>
                        {inc.diagnosisSource === "rumpty" ? "AI" : "Rule-based"}
                      </Badge>
                    </div>

                    <h4 className="text-xs font-semibold text-text line-clamp-2">
                      {inc.title}
                    </h4>

                    <div className="flex items-center justify-between text-[11px] font-mono text-muted pt-1 border-t border-border/60">
                      <span>Occurrences: <strong className="text-text tabular-nums">{inc.occurrenceCount}</strong></span>
                      <span><RelativeTime date={inc.lastSeenAt} /></span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Bar */}
              {totalPages > 1 && (
                <div className="px-4 py-3 border-t border-border bg-surface-2/40 flex items-center justify-between text-xs text-muted">
                  <span>
                    Page <strong className="text-text">{page}</strong> of <strong className="text-text">{totalPages}</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Setup */}
      {activeTab === "setup" && (
        <div className="flex flex-col gap-6 max-w-3xl">
          {/* Active Key Display */}
          <Card>
            <CardHeader
              title="Active API Key"
              description="Used to authenticate events sent by the Pulse SDK from your backend service."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setRotateDialogOpen(true)}
                  className="flex items-center gap-1.5"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Rotate key</span>
                </Button>
              }
            />

            {newRotatedKey ? (
              <div className="p-4 rounded-lg bg-warning/10 border border-warning/30 flex flex-col gap-2 mb-4">
                <span className="text-xs font-bold text-warning">
                  Your New API Key (shown once):
                </span>
                <div className="flex items-center justify-between p-2 rounded bg-surface border border-border font-mono text-xs text-cyan overflow-x-auto">
                  <span className="truncate mr-2">{newRotatedKey}</span>
                  <CopyButton text={newRotatedKey} label="Copy Key" />
                </div>
                <span className="text-[11px] text-muted">
                  Copy and update your environment variables now. The old key stopped working immediately.
                </span>
              </div>
            ) : null}

            {project.activeKey ? (
              <div className="p-3.5 rounded-md bg-surface-2 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                <div className="flex flex-col gap-1">
                  <span className="text-muted text-[11px]">Key Prefix</span>
                  <span className="text-text font-bold">
                    {project.activeKey.keyPrefix}••••••••••••••••••••••••
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted text-[11px]">Created</span>
                  <span className="text-text">
                    <RelativeTime date={project.activeKey.createdAt} />
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted text-[11px]">Last Used</span>
                  <span className="text-text">
                    {project.activeKey.lastUsedAt ? (
                      <RelativeTime date={project.activeKey.lastUsedAt} />
                    ) : (
                      "Never"
                    )}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-critical">No active API key found. Please rotate to generate a key.</div>
            )}
          </Card>

          {/* SDK Code Snippets */}
          <Card className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-text">SDK Integration</h3>
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted">Install Package</span>
              <CodeBlock code={installSnippet} language="bash" title="Terminal" />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted">Express Middleware Integration</span>
              <CodeBlock code={expressSnippet} language="javascript" title="server.js" />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted">Manual Error Capture</span>
              <CodeBlock code={manualCaptureSnippet} language="javascript" title="service.js" />
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: Alerts */}
      {activeTab === "alerts" && (
        <div className="flex flex-col gap-6 max-w-3xl">
          <Card>
            <CardHeader
              title="Telegram Alert Connections"
              description={`Linked Telegram chats receive instant crash notifications from @${project.botUsername}.`}
              action={
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleGenerateTelegramLink}
                  isLoading={generatingTelegramToken}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Link another chat</span>
                </Button>
              }
            />

            {newTelegramLink && (
              <div className="p-4 rounded-md bg-surface-2 border border-border flex flex-col gap-2 mb-5">
                <span className="text-xs font-bold text-text">New Single-Use Deep Link (Valid 24h):</span>
                <div className="flex items-center justify-between p-2 rounded bg-surface border border-border text-xs font-mono text-cyan overflow-x-auto">
                  <span className="truncate mr-2">{newTelegramLink}</span>
                  <CopyButton text={newTelegramLink} label="Copy Link" />
                </div>
                <div className="flex items-center justify-end pt-1">
                  <a
                    href={newTelegramLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-cyan hover:underline"
                  >
                    <span>Open in Telegram</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

            {/* Chats List */}
            {integrationsList.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted border border-dashed border-border rounded-md">
                No Telegram chats linked yet. Click &quot;Link another chat&quot; to generate an invitation link.
              </div>
            ) : (
              <div className="divide-y divide-border border border-border rounded-md overflow-hidden bg-surface">
                {integrationsList.map((chat) => (
                  <div
                    key={chat.id}
                    className="flex items-center justify-between p-3.5 text-xs gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[#2AABEE]/15 text-[#2AABEE] flex items-center justify-center shrink-0">
                        <Send className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-text truncate">
                          {chat.chatTitle || (chat.chatId ? `Chat ${chat.chatId}` : "Pending Token")}
                        </span>
                        <span className="text-[11px] font-mono text-muted">
                          {chat.consumedAt ? (
                            <>Linked <RelativeTime date={chat.consumedAt} /></>
                          ) : (
                            <span className="text-warning">Awaiting start command in Telegram</span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={chat.consumedAt ? "ok" : "warning"}>
                        {chat.consumedAt ? "Active" : "Pending"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnlinkTelegram(chat.id)}
                        className="text-critical hover:bg-critical/10"
                      >
                        Unlink
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 4: Settings */}
      {activeTab === "settings" && (
        <div className="flex flex-col gap-6 max-w-3xl">
          {/* Rename Project */}
          <Card>
            <CardHeader
              title="Project Details"
              description="Update your project display name."
            />
            <form onSubmit={handleRenameProject} className="flex flex-col gap-4">
              <Input
                label="Project Name"
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                required
              />
              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={renaming}
                  disabled={renameInput.trim() === project.name || !renameInput.trim()}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>

          {/* Delete Project */}
          <Card className="border-critical/30 bg-critical/5">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-critical">
                <AlertTriangle className="w-4 h-4" />
                <h3 className="text-sm font-semibold">Danger Zone: Delete Project</h3>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Permanently delete this project along with all associated API keys, incident records, stack traces, and Telegram connections. This cannot be undone.
              </p>
              <div className="pt-2">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setDeleteConfirmName("");
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Project</span>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Rotate Key Confirmation Dialog */}
      <ConfirmDialog
        isOpen={rotateDialogOpen}
        title="Rotate API Key"
        description="Are you sure you want to rotate this project's API key? The old key will stop working immediately. You will need to update the key in your deployed environment."
        confirmText="Rotate and Revoke Old Key"
        confirmVariant="danger"
        onConfirm={handleRotateKey}
        onCancel={() => setRotateDialogOpen(false)}
        isLoading={rotating}
      />

      {/* Delete Project Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title="Delete Project"
        description={`This action will permanently delete "${project.name}" and all associated data. Enter the project name to confirm.`}
        confirmText="Permanently Delete Project"
        confirmVariant="danger"
        confirmMatchText={project.name}
        matchValue={deleteConfirmName}
        onMatchValueChange={setDeleteConfirmName}
        onConfirm={handleDeleteProject}
        onCancel={() => setDeleteDialogOpen(false)}
        isLoading={deleting}
      />
    </div>
  );
}

