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
import { QRCodeView } from "@/components/ui/QRCode";
import { Badge } from "@/components/ui/Badge";
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
  Smartphone,
  Hash,
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
    linkPin?: string;
    ingestEndpoint: string;
  } | null>(null);

  // Live polling state
  const [pollingActive, setPollingActive] = useState(false);
  const [firstIncident, setFirstIncident] = useState<{ id: string; title: string } | null>(null);
  const [telegramStatus, setTelegramStatus] = useState<{
    connected: boolean;
    chatTitle?: string | null;
    chatId?: string | null;
  }>({ connected: false });
  const [appConnected, setAppConnected] = useState(false);
  const [appMeta, setAppMeta] = useState<any>(null);
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

  // Poll for Telegram link & App telemetry when on Step 3
  useEffect(() => {
    if (step !== 3 || !createdProject) return;

    setPollingActive(true);
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/projects/${createdProject.slug}`);
        if (!res.ok) return;
        const projectData = await res.json();
        const p = projectData.project || projectData;

        // Check Telegram status
        const tg = p?.telegramIntegrations?.[0];
        if (tg && (tg.consumedAt || tg.chatId)) {
          setTelegramStatus((prev) => {
            if (!prev.connected) {
              toast("Telegram alerts connected!", "success");
            }
            return {
              connected: true,
              chatTitle: tg.chatTitle,
              chatId: tg.chatId,
            };
          });
        }

        // Check App / SDK heartbeat
        if (p?.lastHeartbeatAt || (p?.incidents && p.incidents.length > 0)) {
          setAppConnected((prev) => {
            if (!prev) {
              toast("App telemetry verified through SDK!", "success");
            }
            return true;
          });
          if (p.appMetadata) {
            setAppMeta(p.appMetadata);
          }
        }

        if (p?.incidents && p.incidents.length > 0 && !firstIncident) {
          const inc = p.incidents[0];
          setFirstIncident({ id: inc.id, title: inc.title });
        }
      } catch (e) {
        // Continue polling
      }
    }, 2000);

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
          <Card className="flex flex-col gap-6">
            <div>
              <h2 className="text-sm font-semibold text-text">Connect Telegram Alerts (Optional)</h2>
              <p className="text-xs text-muted mt-0.5 leading-relaxed">
                Receive instant crash alerts in your Telegram personal chat or group.
              </p>
            </div>

            {/* Telegram Link Card */}
            {telegramStatus.connected ? (
              <div className="p-4 rounded-lg bg-ok/10 border border-ok/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-ok/20 text-ok flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-ok flex items-center gap-1.5">
                      Telegram Alerts Connected!
                    </span>
                    <p className="text-xs text-muted mt-0.5">
                      Linked to: <strong className="text-text">{telegramStatus.chatTitle || "Chat"}</strong> ({telegramStatus.chatId})
                    </p>
                  </div>
                </div>
                <Badge variant="ok">Live Alerts Active</Badge>
              </div>
            ) : (
              <div className="flex flex-col gap-4 p-4 rounded-lg bg-surface-2 border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2AABEE] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#2AABEE]" />
                    </span>
                    <span className="text-xs font-bold text-text">Choose how to connect:</span>
                  </div>
                  <span className="text-[11px] text-muted font-mono">Waiting for link...</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-5 pt-1">
                  {/* QR Code */}
                  <div className="flex flex-col items-center gap-1.5 shrink-0">
                    <QRCodeView text={createdProject.telegramDeepLink} size={125} />
                    <span className="text-[11px] text-muted text-center flex items-center gap-1">
                      <Smartphone className="w-3 h-3 text-[#2AABEE]" />
                      <span>Scan with phone</span>
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="hidden sm:flex flex-col items-center justify-center self-stretch py-2">
                    <div className="w-px flex-1 bg-border" />
                    <span className="text-[10px] text-muted uppercase font-bold py-1">OR</span>
                    <div className="w-px flex-1 bg-border" />
                  </div>

                  {/* 6-Digit PIN & Direct Link */}
                  <div className="flex-1 flex flex-col gap-3 w-full">
                    {createdProject.linkPin && (
                      <div className="p-3 rounded-md bg-surface border border-border flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-muted tracking-wider flex items-center gap-1">
                            <Hash className="w-3 h-3 text-cyan" />
                            <span>6-Digit Pairing PIN</span>
                          </span>
                          <div className="text-lg font-mono font-bold text-cyan tracking-widest mt-0.5">
                            {createdProject.linkPin.slice(0, 3)} {createdProject.linkPin.slice(3)}
                          </div>
                          <p className="text-[11px] text-muted mt-0.5">
                            Send this PIN to <strong>@rumptypulsebot</strong>
                          </p>
                        </div>
                        <CopyButton text={createdProject.linkPin} label="Copy PIN" />
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <a
                        href={createdProject.telegramDeepLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md bg-[#2AABEE] hover:bg-[#2AABEE]/90 text-white font-medium text-xs transition-colors"
                      >
                        <span>Open Telegram Desktop</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <CopyButton text={createdProject.telegramDeepLink} label="Copy Link" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Application Health & Deployment Panel */}
            <div className="p-5 rounded-lg border border-border bg-bg flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-3 w-3">
                    {pollingActive && !appConnected && !firstIncident && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan opacity-75" />
                    )}
                    <span
                      className={`relative inline-flex rounded-full h-3 w-3 ${
                        appConnected || firstIncident ? "bg-ok" : "bg-cyan"
                      }`}
                    />
                  </span>
                  <span className="text-xs font-bold text-text">
                    {appConnected || firstIncident
                      ? "App Connected: Deployment telemetry verified!"
                      : "Waiting for app startup or crash events..."}
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

              {appConnected && appMeta && (
                <div className="p-3 rounded-md bg-ok/10 border border-ok/30 flex items-center justify-between text-xs text-ok">
                  <span>
                    Deployment verified: <strong>{appMeta.environment || "production"}</strong> ({appMeta.runtime || "Node.js"})
                  </span>
                  <span className="text-[11px] text-muted">Heartbeat active</span>
                </div>
              )}

              {firstIncident && (
                <div className="p-3 rounded-md bg-warning/10 border border-warning/30 flex items-center justify-between text-xs text-warning">
                  <span>Incident captured: {firstIncident.title}</span>
                  <Link
                    href={`/dashboard/projects/${createdProject.slug}/incidents/${firstIncident.id}`}
                    className="underline font-semibold"
                  >
                    View Incident →
                  </Link>
                </div>
              )}

              {!appConnected && !firstIncident && (
                <p className="text-xs text-muted leading-relaxed">
                  Start your application with the SDK snippet from Step 2 (which sends a boot handshake), or click &quot;Send test crash&quot; to test your pipeline.
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

