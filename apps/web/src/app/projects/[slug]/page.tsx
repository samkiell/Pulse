"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowLeft,
  Bot,
  CheckCircle2,
  Code2,
  Copy,
  ExternalLink,
  Flame,
  Key,
  Layers,
  MessageSquare,
  Play,
  RefreshCw,
  Send,
  Terminal,
  X,
  Zap,
} from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";

interface ErrorEvent {
  id: string;
  errorType: string;
  name: string;
  message: string;
  stack?: string;
  metadata?: any;
  timestamp: string;
}

interface Incident {
  id: string;
  fingerprint: string;
  title: string;
  status: "OPEN" | "RESOLVED" | "MUTED";
  severity: "CRITICAL" | "ERROR" | "WARNING";
  occurrenceCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  aiDiagnosis: string | null;
  suggestedFix: string | null;
  events: ErrorEvent[];
}

interface ProjectData {
  project: {
    id: string;
    name: string;
    slug: string;
    createdAt: string;
    apiKeys: { id: string; key: string; name: string; lastUsedAt: string | null }[];
    telegramIntegrations: { id: string; chatId: string | null; chatTitle: string | null; verificationToken: string }[];
    incidents: Incident[];
  };
  stats: {
    openIncidents: number;
    resolvedIncidents: number;
    totalErrors: number;
  };
}

export default function ProjectDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [data, setData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"incidents" | "sdk" | "telegram" | "simulate">("incidents");
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [simMessage, setSimMessage] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${slug}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        // Refresh selected incident if open
        if (selectedIncident) {
          const fresh = json.project.incidents.find((i: Incident) => i.id === selectedIncident.id);
          if (fresh) setSelectedIncident(fresh);
        }
      }
    } catch (err) {
      console.error("Failed to load project details", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [slug]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const toggleIncidentStatus = async (incident: Incident) => {
    const newStatus = incident.status === "OPEN" ? "RESOLVED" : "OPEN";
    try {
      const res = await fetch(`/api/projects/${slug}/incidents/${incident.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const handleSimulateError = async (type: string) => {
    try {
      setSimulating(true);
      setSimMessage(null);
      const res = await fetch(`/api/projects/${slug}/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ errorType: type }),
      });
      const result = await res.json();
      if (res.ok) {
        setSimMessage(`Simulated error dispatched! Incident created/updated.`);
        setTimeout(() => fetchData(), 500);
      } else {
        setSimMessage(`Error: ${result.error || "Simulation failed"}`);
      }
    } catch (err: any) {
      setSimMessage(`Simulation failed: ${err.message}`);
    } finally {
      setSimulating(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-[#18181b] rounded-lg" />
        <div className="h-64 bg-[#18181b] rounded-xl border border-[#27272a]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold text-white mb-2">Project Not Found</h2>
        <Link href="/" className="text-red-400 hover:underline text-sm">
          Return to Projects
        </Link>
      </div>
    );
  }

  const project = data.project;
  const apiKey = project.apiKeys[0]?.key || "";
  const telegram = project.telegramIntegrations[0];
  const isTelegramConnected = Boolean(telegram?.chatId);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#27272a] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/"
              className="text-xs font-medium text-[#71717a] hover:text-white flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Projects
            </Link>
            <span className="text-[#3f3f46]">/</span>
            <span className="text-xs font-mono text-red-400">{project.slug}</span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            {project.name}
            {data.stats.openIncidents > 0 ? (
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                {data.stats.openIncidents} Open {data.stats.openIncidents === 1 ? "Incident" : "Incidents"}
              </span>
            ) : (
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3" />
                All Systems Normal
              </span>
            )}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2 rounded-lg bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-[#a1a1aa] transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setActiveTab("simulate")}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-white text-xs font-medium transition-colors"
          >
            <Play className="w-3.5 h-3.5 text-amber-400" />
            <span>Test Simulator</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#27272a] text-sm font-medium">
        <button
          onClick={() => setActiveTab("incidents")}
          className={`pb-3 px-3 relative transition-colors ${
            activeTab === "incidents"
              ? "text-white font-semibold"
              : "text-[#71717a] hover:text-[#d4d4d8]"
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-4 h-4" />
            <span>Incidents ({project.incidents.length})</span>
          </div>
          {activeTab === "incidents" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("sdk")}
          className={`pb-3 px-3 relative transition-colors ${
            activeTab === "sdk"
              ? "text-white font-semibold"
              : "text-[#71717a] hover:text-[#d4d4d8]"
          }`}
        >
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4" />
            <span>SDK Integration</span>
          </div>
          {activeTab === "sdk" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("telegram")}
          className={`pb-3 px-3 relative transition-colors ${
            activeTab === "telegram"
              ? "text-white font-semibold"
              : "text-[#71717a] hover:text-[#d4d4d8]"
          }`}
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            <span>Telegram Bot</span>
            {isTelegramConnected ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </div>
          {activeTab === "telegram" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("simulate")}
          className={`pb-3 px-3 relative transition-colors ${
            activeTab === "simulate"
              ? "text-white font-semibold"
              : "text-[#71717a] hover:text-[#d4d4d8]"
          }`}
        >
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Crash Simulator</span>
          </div>
          {activeTab === "simulate" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 rounded-full" />
          )}
        </button>
      </div>

      {/* Tab Content: Incidents Feed */}
      {activeTab === "incidents" && (
        <div className="space-y-4">
          {project.incidents.length === 0 ? (
            <div className="text-center py-16 rounded-xl border border-[#27272a] bg-[#121215]">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white">No Incidents Recorded</h3>
              <p className="text-xs text-[#71717a] max-w-sm mx-auto mt-1 mb-4">
                Your application has not reported any crashes yet, or you can trigger a test crash using the simulator.
              </p>
              <button
                onClick={() => setActiveTab("simulate")}
                className="px-4 py-2 rounded-lg bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-white text-xs font-medium transition-colors"
              >
                Launch Crash Simulator
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#27272a] border border-[#27272a] rounded-xl bg-[#121215] overflow-hidden">
              {project.incidents.map((incident) => {
                const isOpen = incident.status === "OPEN";
                return (
                  <div
                    key={incident.id}
                    onClick={() => setSelectedIncident(incident)}
                    className="p-4 sm:p-5 hover:bg-[#18181b]/50 cursor-pointer transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded ${
                            isOpen
                              ? "bg-red-500/10 text-red-400 border border-red-500/30"
                              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          }`}
                        >
                          {incident.status}
                        </span>

                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#27272a] text-[#a1a1aa]">
                          {incident.severity}
                        </span>

                        <span className="text-xs text-[#71717a] font-mono">
                          Last seen {formatTimeAgo(incident.lastSeenAt)}
                        </span>
                      </div>

                      <h2 className="text-sm font-semibold text-white truncate hover:text-red-400 transition-colors">
                        {incident.title}
                      </h2>

                      {incident.aiDiagnosis && (
                        <p className="text-xs text-[#a1a1aa] line-clamp-1 flex items-center gap-1.5">
                          <span className="text-[10px] uppercase font-mono px-1 py-0.2 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            AI Diagnosis
                          </span>
                          {incident.aiDiagnosis}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 self-end md:self-center shrink-0">
                      <div className="text-right">
                        <span className="text-xs font-mono text-[#71717a] block">Occurrences</span>
                        <span className="text-sm font-bold text-white font-mono">
                          {incident.occurrenceCount}x
                        </span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleIncidentStatus(incident);
                        }}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors ${
                          isOpen
                            ? "bg-[#18181b] hover:bg-[#27272a] border-[#27272a] text-emerald-400"
                            : "bg-[#18181b] hover:bg-[#27272a] border-[#27272a] text-[#a1a1aa]"
                        }`}
                      >
                        {isOpen ? "Mark Resolved" : "Reopen"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: SDK Integration */}
      {activeTab === "sdk" && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl border border-[#27272a] bg-[#121215] space-y-5">
            <div>
              <h3 className="text-base font-semibold text-white">SDK Quickstart</h3>
              <p className="text-xs text-[#a1a1aa] mt-1">
                Drop `pulse-monitor` into your Node.js application deployed on Rumpty Cloud.
              </p>
            </div>

            {/* Step 1 */}
            <div>
              <span className="text-xs font-mono uppercase text-[#71717a] tracking-wider block mb-2">
                1. Install SDK
              </span>
              <div className="flex items-center justify-between bg-[#18181b] border border-[#27272a] rounded-lg p-3 font-mono text-xs text-white">
                <code>npm install pulse-monitor</code>
                <button
                  onClick={() => copyToClipboard("npm install pulse-monitor", "install")}
                  className="hover:text-red-400 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Step 2 */}
            <div>
              <span className="text-xs font-mono uppercase text-[#71717a] tracking-wider block mb-2">
                2. Initialize in your App Entry (e.g. index.ts / server.js)
              </span>
              <div className="relative bg-[#18181b] border border-[#27272a] rounded-lg p-4 font-mono text-xs text-[#e4e4e7] overflow-x-auto">
                <button
                  onClick={() =>
                    copyToClipboard(
                      `import pulse from "pulse-monitor";\n\npulse.init({\n  apiKey: "${apiKey}",\n  endpoint: "${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/ingest"\n});`,
                      "code-init"
                    )
                  }
                  className="absolute top-3 right-3 hover:text-red-400 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <pre>{`import pulse from "pulse-monitor";

// Initialize at the very top of your entrypoint
pulse.init({
  apiKey: "${apiKey}",
  endpoint: "${typeof window !== "undefined" ? window.location.origin : ""}/api/v1/ingest",
  environment: process.env.NODE_ENV || "production"
});`}</pre>
              </div>
            </div>

            {/* Step 3 */}
            <div>
              <span className="text-xs font-mono uppercase text-[#71717a] tracking-wider block mb-2">
                3. Attach Express / Fastify Error Middleware (Optional)
              </span>
              <div className="relative bg-[#18181b] border border-[#27272a] rounded-lg p-4 font-mono text-xs text-[#e4e4e7] overflow-x-auto">
                <pre>{`// In Express: attach at the end of routes
app.use(pulse.errorHandler());`}</pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Telegram Bot */}
      {activeTab === "telegram" && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl border border-[#27272a] bg-[#121215] space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Bot className="w-5 h-5 text-red-400" />
                  Telegram Crash Alerting
                </h3>
                <p className="text-xs text-[#a1a1aa] mt-1">
                  Connect your Telegram account or channel to receive instant crash alerts with AI diagnoses.
                </p>
              </div>

              <div>
                {isTelegramConnected ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    Connected ({telegram?.chatTitle || "Chat"})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-medium">
                    <AlertTriangle className="w-4 h-4" />
                    Pending Verification
                  </span>
                )}
              </div>
            </div>

            <div className="border border-[#27272a] rounded-lg p-4 bg-[#18181b]/50 space-y-4">
              <span className="text-xs font-mono text-[#71717a] uppercase tracking-wider block">
                How to Connect:
              </span>
              <ol className="text-xs text-[#d4d4d8] space-y-3 list-decimal list-inside">
                <li>
                  Open Telegram and search for <strong>@PulseMonitorBot</strong> (or open link).
                </li>
                <li>
                  Send this one-time command to link this project:
                  <div className="mt-2 flex items-center justify-between bg-[#121215] border border-[#27272a] rounded-lg p-3 font-mono text-xs text-white">
                    <code>/start {telegram?.verificationToken}</code>
                    <button
                      onClick={() =>
                        copyToClipboard(`/start ${telegram?.verificationToken}`, "tg-token")
                      }
                      className="hover:text-red-400 transition-colors ml-2"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </li>
                <li>
                  The bot will reply with a confirmation message, and runtime alerts will start flowing immediately!
                </li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Crash Simulator */}
      {activeTab === "simulate" && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl border border-[#27272a] bg-[#121215] space-y-5">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-400" />
                Live Runtime Crash Simulator
              </h3>
              <p className="text-xs text-[#a1a1aa] mt-1">
                Test the ingestion engine, anomaly detection, AI diagnosis, and Telegram dispatch without deploying broken code.
              </p>
            </div>

            {simMessage && (
              <div className="p-3 rounded-lg bg-[#18181b] border border-[#27272a] text-xs font-mono text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>{simMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <button
                disabled={simulating}
                onClick={() => handleSimulateError("uncaughtException")}
                className="p-4 rounded-xl border border-[#27272a] bg-[#18181b] hover:border-red-500/50 hover:bg-[#18181b]/80 transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-red-400 font-semibold uppercase">
                    Uncaught Exception
                  </span>
                  <Play className="w-3.5 h-3.5 text-[#71717a] group-hover:text-red-400" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">TypeError: null pointer</h4>
                <p className="text-[11px] text-[#71717a]">
                  Triggers immediate AI diagnosis and instant Telegram push notification.
                </p>
              </button>

              <button
                disabled={simulating}
                onClick={() => handleSimulateError("unhandledRejection")}
                className="p-4 rounded-xl border border-[#27272a] bg-[#18181b] hover:border-amber-500/50 hover:bg-[#18181b]/80 transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-amber-400 font-semibold uppercase">
                    Unhandled Rejection
                  </span>
                  <Play className="w-3.5 h-3.5 text-[#71717a] group-hover:text-amber-400" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">DB Connection Timeout</h4>
                <p className="text-[11px] text-[#71717a]">
                  Simulates managed database outage or network unreachable on Rumpty.
                </p>
              </button>

              <button
                disabled={simulating}
                onClick={() => handleSimulateError("crashLoop")}
                className="p-4 rounded-xl border border-[#27272a] bg-[#18181b] hover:border-purple-500/50 hover:bg-[#18181b]/80 transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-purple-400 font-semibold uppercase">
                    Crash Loop / OOM
                  </span>
                  <Play className="w-3.5 h-3.5 text-[#71717a] group-hover:text-purple-400" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">Heap Out of Memory</h4>
                <p className="text-[11px] text-[#71717a]">
                  Tests sliding-window deduplication so repeated crashes don't spam.
                </p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incident Detail Inspection Drawer / Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-3xl max-h-[90vh] bg-[#121215] border border-[#27272a] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#27272a] flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded ${
                      selectedIncident.status === "OPEN"
                        ? "bg-red-500/10 text-red-400 border border-red-500/30"
                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    }`}
                  >
                    {selectedIncident.status}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#27272a] text-[#a1a1aa]">
                    {selectedIncident.severity}
                  </span>
                  <span className="text-xs font-mono text-[#71717a]">
                    First seen {formatTimeAgo(selectedIncident.firstSeenAt)} • {selectedIncident.occurrenceCount} occurrences
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white">{selectedIncident.title}</h2>
              </div>

              <button
                onClick={() => setSelectedIncident(null)}
                className="p-1.5 rounded-lg hover:bg-[#27272a] text-[#71717a] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* AI Diagnosis Card */}
              <div className="p-5 rounded-xl border border-purple-500/30 bg-purple-950/10 shadow-lg shadow-purple-500/5 space-y-3">
                <div className="flex items-center gap-2 text-purple-400">
                  <Bot className="w-5 h-5" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider">
                    Rumpty AI Root-Cause Diagnosis
                  </span>
                </div>
                <p className="text-sm text-purple-200/90 leading-relaxed">
                  {selectedIncident.aiDiagnosis || "Diagnosis pending or unavailable."}
                </p>

                {selectedIncident.suggestedFix && (
                  <div className="mt-3 pt-3 border-t border-purple-500/20">
                    <span className="text-[11px] font-mono text-purple-300 uppercase tracking-wider block mb-1">
                      Recommended Fix:
                    </span>
                    <div className="bg-[#09090b] border border-purple-500/20 rounded-lg p-3 font-mono text-xs text-purple-100 overflow-x-auto">
                      <code>{selectedIncident.suggestedFix}</code>
                    </div>
                  </div>
                )}
              </div>

              {/* Stack Trace */}
              {selectedIncident.events[0]?.stack && (
                <div>
                  <span className="text-xs font-mono text-[#71717a] uppercase tracking-wider block mb-2">
                    Stack Trace
                  </span>
                  <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-4 font-mono text-xs text-red-300/90 overflow-x-auto whitespace-pre leading-relaxed">
                    {selectedIncident.events[0].stack}
                  </div>
                </div>
              )}

              {/* Raw Event Context */}
              {selectedIncident.events[0]?.metadata && (
                <div>
                  <span className="text-xs font-mono text-[#71717a] uppercase tracking-wider block mb-2">
                    Captured Metadata
                  </span>
                  <pre className="bg-[#09090b] border border-[#27272a] rounded-xl p-4 font-mono text-xs text-[#a1a1aa] overflow-x-auto">
                    {JSON.stringify(selectedIncident.events[0].metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#27272a] bg-[#18181b]/50 flex items-center justify-between">
              <span className="text-xs font-mono text-[#71717a]">
                Fingerprint: <code>{selectedIncident.fingerprint}</code>
              </span>

              <button
                onClick={() => {
                  toggleIncidentStatus(selectedIncident);
                }}
                className="px-4 py-2 rounded-lg bg-[#27272a] hover:bg-[#3f3f46] text-white font-medium text-xs transition-colors"
              >
                {selectedIncident.status === "OPEN" ? "Mark as Resolved" : "Reopen Incident"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Simulator controls and handlers