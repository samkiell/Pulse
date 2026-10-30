import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-bg text-text antialiased font-sans selection:bg-cyan/20 selection:text-cyan">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
