import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { Activity, ShieldAlert, Terminal } from "lucide-react";

export const metadata: Metadata = {
  title: "Pulse — Crash Alerting & AI Diagnosis for Rumpty Cloud",
  description: "Instant runtime error alerting and AI root-cause diagnosis delivered straight to Telegram.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#09090b] text-[#f4f4f5] antialiased flex flex-col font-sans">
        {/* Navigation Bar */}
        <header className="sticky top-0 z-50 border-b border-[#27272a] bg-[#09090b]/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 group-hover:bg-red-500/20 transition-colors">
                  <Activity className="w-5 h-5 animate-pulse" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold tracking-tight text-lg leading-tight text-white flex items-center gap-2">
                    Pulse
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 uppercase tracking-widest">
                      Live
                    </span>
                  </span>
                  <span className="text-xs text-[#a1a1aa] font-medium">Rumpty Cloud Observability</span>
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-full bg-[#18181b] border border-[#27272a] text-[#a1a1aa]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>Rumpty AI Inference Online</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-[#27272a] py-6 text-center text-xs text-[#71717a]">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>Pulse Observability Infrastructure • Built for Rumpty Cloud</span>
            <span className="font-mono text-[#52525b]">v1.0.0</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
