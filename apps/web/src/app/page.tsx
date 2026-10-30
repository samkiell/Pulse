import Link from "next/link";
import { auth } from "@/lib/auth";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { ArrowRight, CheckCircle2, Shield, Cpu, Layers, Terminal, Sparkles } from "lucide-react";

export default async function LandingPage() {
  const session = await auth();

  const installCode = `npm install @samkiel/pulse`;
  const initCode = `import pulse from "@samkiel/pulse";

pulse.init({
  apiKey: process.env.PULSE_API_KEY!,
  endpoint: "https://pulseapi.rumptycloud.app/api/v1/ingest",
});

// Attach Express error handler
app.use(pulse.errorHandler());`;

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col selection:bg-cyan/20 selection:text-cyan">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo />
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/docs"
              className="text-xs font-medium text-muted hover:text-text transition-colors"
            >
              Docs
            </Link>
            {session?.user ? (
              <Link href="/dashboard">
                <Button variant="primary" size="sm">
                  Go to Dashboard <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button variant="primary" size="sm">
                  Sign in with GitHub
                </Button>
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {/* Section 1: Hero */}
        <section className="pt-20 pb-16 px-4 max-w-4xl mx-auto text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-2 border border-border text-xs text-muted mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan" />
            <span>Built for apps deployed on Rumpty Cloud</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-text leading-[1.15] max-w-3xl">
            Know when your Rumpty app crashes, before your users tell you.
          </h1>

          <p className="mt-5 text-base sm:text-lg text-muted max-w-2xl leading-relaxed">
            Pulse sends a Telegram alert with the likely cause and a suggested fix the moment an error occurs in production.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <Link href={session?.user ? "/dashboard" : "/login"} className="w-full sm:w-auto">
              <Button variant="primary" size="lg" className="w-full sm:w-auto">
                {session?.user ? "Go to Dashboard" : "Sign in with GitHub"}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/docs" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                Read the docs
              </Button>
            </Link>
          </div>
        </section>

        {/* Section 2: The Gap */}
        <section className="py-16 px-4 border-y border-border bg-surface/50">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-xs uppercase tracking-wider text-muted font-mono font-semibold">
                The Observability Gap
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-surface border border-border rounded-lg p-6 flex flex-col gap-2">
                <span className="font-mono text-xs text-muted">01 / METRICS</span>
                <h3 className="text-sm font-semibold text-text">VM metrics are dashboard charts only</h3>
                <p className="text-xs text-muted leading-relaxed">
                  CPU and memory graphs show historical resource spikes but cannot tell you which line of code crashed or why.
                </p>
              </div>

              <div className="bg-surface border border-border rounded-lg p-6 flex flex-col gap-2">
                <span className="font-mono text-xs text-muted">02 / LOGS</span>
                <h3 className="text-sm font-semibold text-text">Deployment logs are build logs only</h3>
                <p className="text-xs text-muted leading-relaxed">
                  Platform build output shows compilation status, but runtime stack traces disappear into ephemeral stdout.
                </p>
              </div>

              <div className="bg-surface border border-border rounded-lg p-6 flex flex-col gap-2">
                <span className="font-mono text-xs text-muted">03 / ALERTS</span>
                <h3 className="text-sm font-semibold text-text">There are no runtime error alerts</h3>
                <p className="text-xs text-muted leading-relaxed">
                  Without active monitoring, unhandled exceptions and database disconnects go unnoticed until users complain.
                </p>
              </div>
            </div>

            <div className="mt-8 text-center">
              <p className="text-sm font-medium text-cyan">
                Pulse fills that gap with zero-config crash notifications.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: How It Works */}
        <section className="py-20 px-4 max-w-5xl mx-auto w-full">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-text">How it works</h2>
            <p className="text-xs text-muted mt-2">Three straightforward steps to production alerting</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="flex items-start gap-4 p-4 rounded-lg bg-surface border border-border">
                <div className="w-7 h-7 rounded-full bg-cyan/10 border border-cyan/30 text-cyan flex items-center justify-center font-mono text-xs font-bold shrink-0">
                  1
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text">Install the SDK</h3>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    Add the lightweight package to your Node.js or Express service. No heavy background agents required.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg bg-surface border border-border">
                <div className="w-7 h-7 rounded-full bg-violet/10 border border-violet/30 text-violet flex items-center justify-center font-mono text-xs font-bold shrink-0">
                  2
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text">Link Telegram</h3>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    Start the bot with your project link token. One project can notify multiple team members or dev channels.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg bg-surface border border-border">
                <div className="w-7 h-7 rounded-full bg-ok/10 border border-ok/30 text-ok flex items-center justify-center font-mono text-xs font-bold shrink-0">
                  3
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text">Get alerts</h3>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    Receive immediate alerts with root cause analysis and a copy-pasteable fix before users report downtime.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 flex flex-col gap-4">
              <div className="rounded-lg bg-surface border border-border overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface-2/60 text-xs font-mono text-muted">
                  <span>Terminal</span>
                  <CopyButton text={installCode} />
                </div>
                <div className="p-4 bg-bg font-mono text-xs text-text overflow-x-auto">
                  <code>{installCode}</code>
                </div>
              </div>

              <div className="rounded-lg bg-surface border border-border overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface-2/60 text-xs font-mono text-muted">
                  <span>server.js</span>
                  <CopyButton text={initCode} />
                </div>
                <div className="p-4 bg-bg font-mono text-xs text-text leading-relaxed overflow-x-auto">
                  <pre>
                    <code>{initCode}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Alert Preview */}
        <section className="py-16 px-4 border-t border-border bg-surface/30">
          <div className="max-w-4xl mx-auto flex flex-col items-center">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold tracking-tight text-text">Real-time Telegram Alert Preview</h2>
              <p className="text-xs text-muted mt-1">What your team actually receives on every critical crash</p>
            </div>

            {/* Telegram Message Recreation (HTML/CSS only, not an image) */}
            <div className="w-full max-w-lg bg-[#17212B] border border-[#2B5278] rounded-xl p-4 sm:p-5 shadow-2xl font-sans text-xs text-[#E4ECF2] flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-[#2B5278]/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#2AABEE] flex items-center justify-center text-white font-bold text-xs">
                    P
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-white">Pulse Bot</span>
                    <span className="text-[10px] text-[#708499]">bot</span>
                  </div>
                </div>
                <span className="text-[10px] text-[#708499] font-mono">15:42</span>
              </div>

              <div className="flex flex-col gap-2 leading-relaxed">
                <div className="font-bold text-sm text-[#FF5C6C] flex items-center gap-1.5">
                  <span>🚨 Pulse Crash Alert</span>
                </div>

                <div className="space-y-1 text-[11px] font-mono bg-[#0E1621] p-2.5 rounded border border-[#2B5278]/40">
                  <div><span className="text-[#708499]">Project:</span> auth-api (<code>production</code>)</div>
                  <div><span className="text-[#708499]">Error:</span> <span className="text-[#FF5C6C]">TypeError</span></div>
                  <div><span className="text-[#708499]">Message:</span> Cannot read properties of undefined (reading &apos;sessionToken&apos;)</div>
                  <div><span className="text-[#708499]">Occurrences:</span> 1</div>
                </div>

                <div className="mt-1">
                  <div className="text-[11px] font-semibold text-[#00E5FF] mb-0.5">
                    🧠 AI root cause:
                  </div>
                  <p className="text-[#B5C9DC] text-[11px]">
                    The incoming HTTP request is missing the authorization cookie or headers, causing req.auth to be undefined when reading session properties.
                  </p>
                </div>

                <div className="mt-1">
                  <div className="text-[11px] font-semibold text-[#2FD28A] mb-0.5">
                    💡 Suggested Fix:
                  </div>
                  <div className="bg-[#0E1621] p-2 rounded border border-[#2B5278]/40 font-mono text-[11px] text-[#A2D2FF] overflow-x-auto">
                    <code>const token = req.auth?.sessionToken ?? null;</code>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-[#2B5278]/40 flex justify-end">
                  <div className="px-3 py-1.5 rounded bg-[#2B5278]/40 text-[#64B5F6] hover:bg-[#2B5278]/60 font-medium text-[11px] inline-flex items-center gap-1">
                    View Incident in Pulse Dashboard →
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Features */}
        <section className="py-20 px-4 max-w-5xl mx-auto w-full">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-text">Engineered for production reliability</h2>
            <p className="text-xs text-muted mt-1">Lightweight observability with zero operational friction</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-5 rounded-lg bg-surface border border-border flex flex-col gap-2">
              <div className="w-8 h-8 rounded-md bg-cyan/10 border border-cyan/30 text-cyan flex items-center justify-center mb-1">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-text">Incident Deduplication</h3>
              <p className="text-xs text-muted leading-relaxed">
                Errors with matching normalized stack traces and fingerprints are grouped into single incidents, preventing notification storms.
              </p>
            </div>

            <div className="p-5 rounded-lg bg-surface border border-border flex flex-col gap-2">
              <div className="w-8 h-8 rounded-md bg-violet/10 border border-violet/30 text-violet flex items-center justify-center mb-1">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-text">AI Diagnosis with Fallback</h3>
              <p className="text-xs text-muted leading-relaxed">
                LLM-powered root cause analysis with automatic rule-based fallback guarantees you receive actionable insights within 6 seconds.
              </p>
            </div>

            <div className="p-5 rounded-lg bg-surface border border-border flex flex-col gap-2">
              <div className="w-8 h-8 rounded-md bg-ok/10 border border-ok/30 text-ok flex items-center justify-center mb-1">
                <Shield className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-text">Secret Scrubbing</h3>
              <p className="text-xs text-muted leading-relaxed">
                Bearer tokens, database credentials, API keys, and sensitive authorization cookies are redacted before reaching any AI model.
              </p>
            </div>

            <div className="p-5 rounded-lg bg-surface border border-border flex flex-col gap-2">
              <div className="w-8 h-8 rounded-md bg-info/10 border border-info/30 text-info flex items-center justify-center mb-1">
                <Terminal className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-text">One SDK Line for Express</h3>
              <p className="text-xs text-muted leading-relaxed">
                Plug into Express, Fastify, or plain Node.js in seconds. Unhandled rejections and uncaught exceptions are trapped automatically.
              </p>
            </div>

            <div className="p-5 rounded-lg bg-surface border border-border flex flex-col gap-2">
              <div className="w-8 h-8 rounded-md bg-warning/10 border border-warning/30 text-warning flex items-center justify-center mb-1">
                <Cpu className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-text">Zero Runtime Overhead</h3>
              <p className="text-xs text-muted leading-relaxed">
                Asynchronous event buffering caps at 200 items and drops gracefully on network timeouts without ever stalling your application loop.
              </p>
            </div>

            <div className="p-5 rounded-lg bg-surface border border-border flex flex-col gap-2">
              <div className="w-8 h-8 rounded-md bg-cyan/10 border border-cyan/30 text-cyan flex items-center justify-center mb-1">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-text">Open Source</h3>
              <p className="text-xs text-muted leading-relaxed">
                Full transparency. Self-host the ingestion server or use the cloud dashboard with complete control over your telemetry.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Section 6: Footer */}
      <footer className="border-t border-border bg-surface py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
          <div className="flex items-center gap-3">
            <Logo textClassName="text-sm font-semibold" />
            <span className="text-border">|</span>
            <span>Built for the Devcenter Hacktober Sprint on Rumpty Cloud</span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="https://github.com/samkiell/Pulse"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-text transition-colors"
            >
              GitHub Repository
            </Link>
            <Link href="/docs" className="hover:text-text transition-colors">
              Documentation
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
