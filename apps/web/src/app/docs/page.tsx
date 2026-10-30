import Link from "next/link";
import { auth } from "@/lib/auth";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";

export default async function DocsPage() {
  const session = await auth();

  const installCode = `npm install @samkiel/pulse-monitor`;

  const expressSnippet = `import express from "express";
import pulse from "@samkiel/pulse-monitor";

const app = express();

// 1. Initialize Pulse early in lifecycle
pulse.init({
  apiKey: process.env.PULSE_API_KEY!,
  endpoint: "https://pulseapi.rumptycloud.app/api/v1/ingest",
  environment: process.env.NODE_ENV || "production",
  release: "v1.0.0",
});

app.use(express.json());

app.get("/api/users", async (req, res) => {
  throw new Error("Database query failed unexpectedly");
});

// 2. Attach Pulse error middleware AFTER all routes
app.use(pulse.errorHandler());

app.listen(3000, () => {
  console.log("Server running on port 3000");
});`;

  const manualCaptureSnippet = `import pulse from "@samkiel/pulse-monitor";

try {
  await processPayment(orderId);
} catch (error) {
  // Capture handled or caught exception with custom context
  pulse.captureException(error, {
    orderId,
    amount: 49.99,
    userId: "usr_9981",
  });
}`;

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col selection:bg-cyan/20 selection:text-cyan">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <Logo />
            </Link>
            <span className="text-border">/</span>
            <span className="text-xs font-mono text-muted uppercase tracking-wider">Docs</span>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/" className="text-xs text-muted hover:text-text transition-colors">
              Home
            </Link>
            {session?.user ? (
              <Link href="/dashboard">
                <Button variant="primary" size="sm">
                  Dashboard <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button variant="primary" size="sm">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Docs Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 py-12 w-full flex flex-col gap-12">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-cyan/10 border border-cyan/20 text-cyan text-xs font-mono mb-3">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Developer Reference</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text">
            Pulse SDK Documentation
          </h1>
          <p className="mt-2 text-sm text-muted leading-relaxed">
            Everything you need to monitor Node.js applications on Rumpty Cloud with instant Telegram alerts and AI root-cause diagnosis.
          </p>
        </div>

        {/* Section 1: Quickstart */}
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-text border-b border-border pb-2">
            1. Quickstart
          </h2>
          <p className="text-xs text-muted leading-relaxed">
            Install the client package from npm into your backend service:
          </p>
          <CodeBlock code={installCode} language="bash" title="Terminal" />
        </section>

        {/* Section 2: Configuration */}
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-text border-b border-border pb-2">
            2. Configuration Options
          </h2>
          <p className="text-xs text-muted leading-relaxed">
            Options passed to <code>pulse.init(options)</code>:
          </p>

          <div className="border border-border rounded-lg overflow-x-auto bg-surface">
            <table className="w-full text-xs text-left">
              <thead className="bg-surface-2 text-muted uppercase font-mono text-[11px] border-b border-border">
                <tr>
                  <th className="px-4 py-3">Option</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Required</th>
                  <th className="px-4 py-3">Default</th>
                  <th className="px-4 py-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono text-[11px]">
                <tr>
                  <td className="px-4 py-3 text-cyan">apiKey</td>
                  <td className="px-4 py-3 text-muted">string</td>
                  <td className="px-4 py-3 text-ok">Yes</td>
                  <td className="px-4 py-3 text-muted">-</td>
                  <td className="px-4 py-3 font-sans text-xs text-text">Your project API key (e.g. pulse_live_...)</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-cyan">endpoint</td>
                  <td className="px-4 py-3 text-muted">string</td>
                  <td className="px-4 py-3 text-ok">Yes</td>
                  <td className="px-4 py-3 text-muted">-</td>
                  <td className="px-4 py-3 font-sans text-xs text-text">The ingest API URL (or PULSE_ENDPOINT env)</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-cyan">environment</td>
                  <td className="px-4 py-3 text-muted">string</td>
                  <td className="px-4 py-3 text-muted">No</td>
                  <td className="px-4 py-3 text-muted">&quot;production&quot;</td>
                  <td className="px-4 py-3 font-sans text-xs text-text">Deployment environment tag</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-cyan">release</td>
                  <td className="px-4 py-3 text-muted">string</td>
                  <td className="px-4 py-3 text-muted">No</td>
                  <td className="px-4 py-3 text-muted">undefined</td>
                  <td className="px-4 py-3 font-sans text-xs text-text">Git commit hash or release version tag</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-cyan">maxQueueSize</td>
                  <td className="px-4 py-3 text-muted">number</td>
                  <td className="px-4 py-3 text-muted">No</td>
                  <td className="px-4 py-3 text-muted">200</td>
                  <td className="px-4 py-3 font-sans text-xs text-text">Max un-flushed events held in memory</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-cyan">debug</td>
                  <td className="px-4 py-3 text-muted">boolean</td>
                  <td className="px-4 py-3 text-muted">No</td>
                  <td className="px-4 py-3 text-muted">false</td>
                  <td className="px-4 py-3 font-sans text-xs text-text">Enables diagnostic logging to stderr</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 3: Express Middleware */}
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-text border-b border-border pb-2">
            3. Express Middleware Example
          </h2>
          <p className="text-xs text-muted leading-relaxed">
            Attach <code>pulse.errorHandler()</code> after route definitions to automatically intercept synchronous and asynchronous route errors:
          </p>
          <CodeBlock code={expressSnippet} language="javascript" title="server.js" />
        </section>

        {/* Section 4: Manual Capture */}
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-text border-b border-border pb-2">
            4. Manual Exception Capture
          </h2>
          <p className="text-xs text-muted leading-relaxed">
            Capture caught errors manually with custom contextual metadata:
          </p>
          <CodeBlock code={manualCaptureSnippet} language="javascript" title="service.js" />
        </section>

        {/* Section 5: Behavior on Failure */}
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-text border-b border-border pb-2">
            5. Behavior on Failure & Non-Blocking Resilience
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-surface border border-border rounded-lg p-4 flex flex-col gap-2">
              <h3 className="text-xs font-bold text-text font-mono uppercase">Queue Capping</h3>
              <p className="text-xs text-muted leading-relaxed">
                If the Pulse ingest service is unreachable or slow, events buffer in an in-memory ring capped strictly at 200 items. Excess items are dropped cleanly without memory leaks.
              </p>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4 flex flex-col gap-2">
              <h3 className="text-xs font-bold text-text font-mono uppercase">Timeout Abort</h3>
              <p className="text-xs text-muted leading-relaxed">
                HTTP ingest dispatches use a 3-second hard timeout. If the ingest server hangs, the flush aborts immediately so the host application event loop never freezes.
              </p>
            </div>
          </div>
        </section>

        {/* Section 6: FAQ */}
        <section className="flex flex-col gap-4 mb-8">
          <h2 className="text-lg font-bold text-text border-b border-border pb-2">
            6. Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="text-xs font-semibold text-text">How does Telegram chat linking work?</h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                In your project dashboard under the Alerts tab, click &quot;Link another chat&quot; to generate a single-use token valid for 24 hours. Click the deep link or send <code>/start &lt;token&gt;</code> to @rumptypulsebot in Telegram to bind your chat.
              </p>
            </div>

            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="text-xs font-semibold text-text">Are API keys stored in plain text?</h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                No. Full API keys are displayed only once upon project creation or key rotation. Keys are hashed with SHA-256 before being stored in PostgreSQL.
              </p>
            </div>

            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="text-xs font-semibold text-text">How does AI diagnosis handle sensitive tokens?</h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Pulse scrubs Bearer tokens, passwords, cookies, email addresses, and hex keys from error messages, stack traces, and metadata prior to inference. If AI inference fails or times out, a local deterministic rule-based engine provides immediate fallback diagnosis.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface py-6 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
          <span>Pulse Observability Platform</span>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-text transition-colors">
              Home
            </Link>
            <Link href="/login" className="hover:text-text transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

