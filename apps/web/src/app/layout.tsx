import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  title: "Pulse: Crash Alerting & AI Diagnosis for Rumpty Cloud",
  description:
    "Know when your Rumpty app crashes, before your users tell you. Pulse sends a Telegram alert with the likely cause and a suggested fix.",
  openGraph: {
    title: "Pulse: Crash Alerting & AI Diagnosis for Rumpty Cloud",
    description:
      "Know when your Rumpty app crashes, before your users tell you. Pulse sends a Telegram alert with the likely cause and a suggested fix.",
    siteName: "Pulse",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pulse: Crash Alerting & AI Diagnosis for Rumpty Cloud",
    description:
      "Know when your Rumpty app crashes, before your users tell you. Pulse sends a Telegram alert with the likely cause and a suggested fix.",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-bg text-text antialiased font-sans selection:bg-cyan/20 selection:text-cyan">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
