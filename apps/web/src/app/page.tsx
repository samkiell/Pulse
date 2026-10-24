"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Copy,
  ExternalLink,
  FolderGit2,
  Key,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  ShieldAlert,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  apiKeys: { id: string; key: string; lastUsedAt: string | null }[];
  telegramIntegrations: { id: string; chatId: string | null; chatTitle: string | null; verificationToken: string }[];
  _count: {
    incidents: number;
    errorEvents: number;
  };
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error("Failed to fetch projects", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      setCreating(true);
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProjectName.trim() }),
      });

      if (res.ok) {
        setNewProjectName("");
        setIsModalOpen(false);
        fetchProjects();
      }
    } catch (err) {
      console.error("Failed to create project", err);
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Top Banner / Heading */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#27272a] pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            Monitored Services
            <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded-full bg-[#18181b] border border-[#27272a] text-[#a1a1aa]">
              {projects.length} {projects.length === 1 ? "project" : "projects"}
            </span>
          </h1>
          <p className="text-sm text-[#a1a1aa] mt-1">
            Real-time runtime crash alerts and AI root-cause diagnostics for your Rumpty Cloud deployments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchProjects}
            className="p-2 rounded-lg bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-[#a1a1aa] transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium text-sm transition-colors shadow-lg shadow-red-500/10"
          >
            <Plus className="w-4 h-4" />
            <span>Connect New Service</span>
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-52 rounded-xl bg-[#18181b]/50 border border-[#27272a] animate-pulse"
            />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-[#27272a] bg-[#18181b]/20">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4">
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-white">No services monitored yet</h3>
          <p className="text-sm text-[#71717a] max-w-sm mx-auto mt-1 mb-6">
            Connect your first Rumpty Cloud app in under 5 minutes to receive instant crash notifications with AI diagnosis.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Project</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const hasTelegram = project.telegramIntegrations.some((t) => t.chatId !== null);
            const apiKey = project.apiKeys[0]?.key || "";

            return (
              <div
                key={project.id}
                className="group relative rounded-xl border border-[#27272a] bg-[#121215] hover:border-[#3f3f46] transition-all p-5 flex flex-col justify-between shadow-sm hover:shadow-md"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#18181b] border border-[#27272a] flex items-center justify-center text-[#e4e4e7]">
                        <FolderGit2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-white group-hover:text-red-400 transition-colors">
                          {project.name}
                        </h2>
                        <span className="text-xs font-mono text-[#71717a]">{project.slug}</span>
                      </div>
                    </div>

                    <Link
                      href={`/projects/${project.slug}`}
                      className="p-1.5 rounded-md hover:bg-[#27272a] text-[#71717a] hover:text-white transition-colors"
                      title="Open project"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>

                  {/* Status indicators */}
                  <div className="grid grid-cols-2 gap-2 my-4 pt-2 border-t border-[#1f1f23]">
                    <div className="bg-[#18181b]/70 rounded-lg p-2.5 border border-[#27272a]/70">
                      <span className="text-[11px] text-[#71717a] uppercase font-mono tracking-wider block mb-0.5">
                        Incidents
                      </span>
                      <span className="text-lg font-bold text-white flex items-center gap-1.5">
                        {project._count.incidents}
                        {project._count.incidents > 0 && (
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        )}
                      </span>
                    </div>

                    <div className="bg-[#18181b]/70 rounded-lg p-2.5 border border-[#27272a]/70">
                      <span className="text-[11px] text-[#71717a] uppercase font-mono tracking-wider block mb-0.5">
                        Telegram Bot
                      </span>
                      <div className="flex items-center gap-1.5 mt-1">
                        {hasTelegram ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Connected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-400/90 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Unlinked
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* API Key Snippet */}
                  <div className="mt-3">
                    <span className="text-[11px] text-[#71717a] font-mono block mb-1">API Key:</span>
                    <div className="flex items-center justify-between bg-[#18181b] border border-[#27272a] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#a1a1aa]">
                      <span className="truncate">
                        {apiKey ? `${apiKey.slice(0, 14)}••••••••` : "No active key"}
                      </span>
                      {apiKey && (
                        <button
                          onClick={() => copyToClipboard(apiKey, project.id)}
                          className="hover:text-white transition-colors ml-2"
                          title="Copy API Key"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {copiedKey === project.id && (
                      <span className="text-[10px] text-emerald-400 font-mono mt-1 block">
                        Copied to clipboard!
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-5 pt-3 border-t border-[#1f1f23] flex items-center justify-between text-xs">
                  <span className="text-[#71717a]">
                    Total Events: <strong className="text-[#e4e4e7]">{project._count.errorEvents}</strong>
                  </span>
                  <Link
                    href={`/projects/${project.slug}`}
                    className="text-red-400 hover:text-red-300 font-medium flex items-center gap-1 transition-colors"
                  >
                    View Incidents →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#121215] border border-[#27272a] rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Connect New Service</h3>
            <p className="text-xs text-[#a1a1aa] mb-4">
              Enter the name of your service (e.g. "payment-api", "auth-worker") to generate an API key and Telegram connection token.
            </p>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#71717a] mb-1.5 uppercase tracking-wider">
                  Service Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. backend-api"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#18181b] border border-[#27272a] text-white text-sm focus:outline-none focus:border-red-500 font-sans"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm text-[#a1a1aa] hover:text-white hover:bg-[#18181b] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newProjectName.trim()}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-medium text-sm transition-colors"
                >
                  {creating ? "Creating..." : "Create Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
