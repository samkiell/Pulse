"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { CopyButton } from "@/components/ui/CopyButton";
import { useToast } from "@/components/ui/Toast";
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Key,
  Send,
  Radio,
  Zap,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";

export default function NewProjectWizard() {
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [label, setLabel] = useState("production");
  const [createdProject, setCreatedProject] = useState<{
    id: string;
    name: string;
    slug: string;
    apiKey: string;
    telegramDeepLink: string;
    ingestEndpoint: string;
  } | null>(null);

  // Live polling state
  const [pollingActive, setPollingActive] = useState(false);
  const [firstIncident, setFirstIncident] = useState<{ id: string; title: string } | null>(null);
  const [simulating, setSimulating] = useState(false);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), label: label.trim() }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed with status ${res.status}`);
      }

      const data = await res.json();
      setCreatedProject(data);
      setStep(2);
      toast("Project created successfully!", "success");
    } catch (err: any) {
      toast(err.message || "Failed to create project", "error");
    } finally {
      setLoading(false);
    }
  };

  // Poll for first incident when on Step 3
  useEffect(() => {
    if (step !== 3 || !createdProject || firstIncident) return;

    setPollingActive(true);
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/projects/${createdProject.slug}`);
        if (!res.ok) return;
        const projectData = await res.json();

        if (projectData.incidents && projectData.incidents.length > 0) {
          const inc = projectData.incidents[0];
          setFirstIncident({ id: inc.id, title: inc.title });
          setPollingActive(false);
          toast("First event received!", "success");
        }
      } catch (e) {
        // Continue polling
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [step, createdProject, firstIncident, toast]);

  const handleSimulateCrash = async () => {
    if (!createdProject) return;
    setSimulating(true);
    try {
      const res = await fetch(`/api/projects/${createdProject.slug}/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ errorType: "uncaughtException" }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Simulation failed");
      }

      toast("Simulated test crash sent!", "success");
    } catch (err: any) {
      toast(err.message || "Simulation error", "error");
    } finally {
      setSimulating(false);
    }
  };

  const installCommand = `npm install @samkiel/pulse`;
  const initSnippet = createdProject
    ? `import pulse from "@samkiel/pulse";

pulse.init({
  apiKey: "${createdProject.apiKey}",
  endpoint: "${createdProject.ingestEndpoint}",
  environment: "${label || "production"}",
});

// Attach Express error handler
app.use(pulse.errorHandler());`
    : "";

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-8">
      {/* Step Indicators */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text">Create Monitored Project</h1>
          <p className="text-xs text-muted mt-0.5">Setup your application in three simple steps</p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-muted">
          <span className={`px-2 py-0.5 rounded ${step === 1 ? "bg-cyan/10 text-cyan border border-cyan/30" : ""}`}>
            1. Details
          </span>
          <span>→</span>
          <span className={`px-2 py-0.5 rounded ${step === 2 ? "bg-cyan/10 text-cyan border border-cyan/30" : ""}`}>
            2. Install
          </span>
          <span>→</span>
          <span className={`px-2 py-0.5 rounded ${step === 3 ? "bg-cyan/10 text-cyan border border-cyan/30" : ""}`}>
            3. Verify
          </span>
        </div>
      </div>

      {/* Step 1: Project Details */}
      {step === 1 && (
        <Card>
          <form onSubmit={handleCreateProject} className="flex flex-col gap-5">
            <div>
              <h2 className="text-sm font-semibold text-text">Project Information</h2>
              <p className="text-xs text-muted mt-0.5">
                Give your project a name and an optional environment tag.
              </p>
            </div>

            <Input
              label="Project Name"
              placeholder="e.g. backend-api or payments-worker"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />

            <Input
              label="Environment Label (optional)"
              placeholder="e.g. production or staging"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              helperText="Identifies the deployment stage for alerts"
            />

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" variant="primary" size="sm" isLoading={loading} disabled={!name.trim()}>
                <span>Next: Setup SDK</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Step 2: Install & Initialize */}
      {step === 2 && createdProject && (
        <div className="flex flex-col gap-6">
          {/* Key Notice Banner */}
          <div className="p-4 rounded-lg bg-warning/10 border border-warning/30 flex items-start gap-3 text-xs text-warning">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Save your API key now:</span> This is the only time your full key will ever be displayed. Pulse hashes keys with SHA-256 for security and cannot recover it later.
            </div>
          </div>

          <Card className="flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-semibold text-text">Your Generated API Key</h2>
              <div className="flex items-center justify-between p-3 mt-2 rounded-md bg-surface-2 border border-border font-mono text-xs text-text overflow-x-auto">
                <span className="text-cyan truncate mr-2">{createdProject.apiKey}</span>
                <CopyButton text={createdProject.apiKey} label="Copy Key" />
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <h3 className="text-xs font-semibold text-text">1. Install the SDK</h3>
              <CodeBlock code={installCommand} language="bash" title="Terminal" />
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <h3 className="text-xs font-semibold text-text">2. Initialize in your code</h3>
              <CodeBlock code={initSnippet} language="javascript" title="server.js" />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </Button>
              <Button variant="primary" size="sm" onClick={() => setStep(3)}>
                <span>Next: Link Telegram & Verify</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Step 3: Link Telegram & Verify */}
      {step === 3 && createdProject && (
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-5">
            <div>
              <h2 className="text-sm font-semibold text-text">Connect Telegram Alerts (Optional)</h2>
              <p className="text-xs text-muted mt-0.5 leading-relaxed">
                Receive instant crash alerts in your Telegram personal chat or group.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 p-4 rounded-md bg-surface-2 border border-border">
              <div className="w-10 h-10 rounded-full bg-[#2AABEE]/15 border border-[#2AABEE]/30 text-[#2AABEE] flex items-center justify-center shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-text">Telegram Deep Link</span>
                <p className="text-[11px] text-muted truncate">
                  {createdProject.telegramDeepLink}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <CopyButton text={createdProject.telegramDeepLink} label="Copy Link" />
                <a
                  href={createdProject.telegramDeepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-[#2AABEE] hover:bg-[#2AABEE]/90 text-white font-medium text-xs transition-colors"
                >
                  <span>Open Telegram</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Waiting for first event panel */}
            <div className="p-5 rounded-lg border border-border bg-bg flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-3 w-3">
                    {pollingActive && !firstIncident && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan opacity-75" />
                    )}
                    <span
                      className={`relative inline-flex rounded-full h-3 w-3 ${
                        firstIncident ? "bg-ok" : "bg-cyan"
                      }`}
                    />
                  </span>
                  <span className="text-xs font-bold text-text">
                    {firstIncident
                      ? "Connected: First event received!"
                      : "Waiting for your first event..."}
                  </span>
                </div>

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

              {firstIncident ? (
                <div className="p-3 rounded-md bg-ok/10 border border-ok/30 flex items-center justify-between text-xs text-ok">
                  <span>Incident captured: {firstIncident.title}</span>
                  <Link
                    href={`/dashboard/projects/${createdProject.slug}/incidents/${firstIncident.id}`}
                    className="underline font-semibold"
                  >
                    View Incident →
                  </Link>
                </div>
              ) : (
                <p className="text-xs text-muted leading-relaxed">
                  Start your app or click &quot;Send test crash&quot; to test your pipeline. This panel polls every 3 seconds.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <Button
                variant="primary"
                size="md"
                onClick={() => router.push(`/dashboard/projects/${createdProject.slug}`)}
              >
                <span>Go to Project Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

