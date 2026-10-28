"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Copy,
  ExternalLink,
  FolderGit2,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  apiKeys: {
    id: string;
    keyPrefix: string;
    maskedKey?: string;
    lastUsedAt: string | null;
  }[];
  telegramIntegrations: {
    id: string;
    chatId: string | null;
    chatTitle: string | null;
    verificationToken: string;
  }[];
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
  const [createdProjectKey, setCreatedProjectKey] = useState<{
    name: string;
    slug: string;
    apiKey: string;
    telegramDeepLink?: string;
  } | null>(null);

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
        const json = await res.json();
        setNewProjectName("");
        setIsModalOpen(false);
        setCreatedProjectKey({
          name: json.name,
          slug: json.slug,
          apiKey: json.apiKey,
          telegramDeepLink: json.telegramDeepLink,
        });
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

      {/* Grid of Projects */}
      {loading && projects.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-xl bg-[#18181b] border border-[#27272a]" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-[#27272a] bg-[#121215]">
          <FolderGit2 className="w-12 h-12 text-[#71717a] mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-semibold text-white">No Monitored Services Yet</h3>
          <p className="text-xs text-[#a1a1aa] max-w-sm mx-auto mt-1 mb-6">
            Get started by registering a service to receive crash notifications and AI incident diagnoses.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium text-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Register Your First Service</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const hasTelegram = project.telegramIntegrations.some((t) => t.chatId !== null);
            const activeKey = project.apiKeys[0]?.maskedKey || "No active key";

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

                  {/* API Key Display */}
                  <div className="mt-3">
                    <span className="text-[11px] text-[#71717a] font-mono block mb-1">API Key:</span>
                    <div className="flex items-center justify-between bg-[#18181b] border border-[#27272a] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#a1a1aa]">
                      <span className="truncate">{activeKey}</span>
                    </div>
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

      {/* Creation Success Modal with Full API Key (Shown Once) */}
      {createdProjectKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[#121215] border border-[#27272a] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  Service Created: {createdProjectKey.name}
                </h3>
                <p className="text-xs text-[#a1a1aa] mt-1">
                  Copy your API key now. For security, this key is hashed and will not be displayed again.
                </p>
              </div>
              <button
                onClick={() => setCreatedProjectKey(null)}
                className="text-[#71717a] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-mono text-[#71717a] uppercase tracking-wider block">
                API Key (Shown Once)
              </span>
              <div className="flex items-center justify-between bg-[#18181b] border border-emerald-500/30 rounded-lg p-3 font-mono text-xs text-white break-all">
                <span>{createdProjectKey.apiKey}</span>
                <button
                  onClick={() => copyToClipboard(createdProjectKey.apiKey, "created-key")}
                  className="ml-2 hover:text-emerald-400 text-[#a1a1aa] transition-colors shrink-0"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              {copiedKey === "created-key" && (
                <span className="text-[11px] text-emerald-400 font-mono block">
                  Copied to clipboard.
                </span>
              )}
            </div>

            {createdProjectKey.telegramDeepLink && (
              <div className="pt-2">
                <span className="text-xs font-mono text-[#71717a] uppercase tracking-wider block mb-1.5">
                  Telegram Alert Link
                </span>
                <a
                  href={createdProjectKey.telegramDeepLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Connect Telegram Bot</span>
                </a>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-[#27272a]">
              <Link
                href={`/projects/${createdProjectKey.slug}`}
                onClick={() => setCreatedProjectKey(null)}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition-colors"
              >
                Go to Project Dashboard →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#121215] border border-[#27272a] rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Connect New Service</h3>
            <p className="text-xs text-[#a1a1aa] mb-4">
              Enter the name of your service to generate an API key and Telegram connection token.
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
