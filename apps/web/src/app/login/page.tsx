import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await auth();
  const { callbackUrl, error } = await searchParams;

  if (session?.user) {
    redirect(callbackUrl || "/dashboard");
  }

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col justify-between p-4 selection:bg-cyan/20 selection:text-cyan">
      <div className="max-w-md mx-auto w-full pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs text-muted hover:text-text transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to home</span>
        </Link>
      </div>

      <div className="max-w-md mx-auto w-full bg-surface border border-border rounded-lg p-6 sm:p-8 flex flex-col items-center text-center shadow-xl">
        <div className="mb-6">
          <Logo textClassName="text-xl font-bold" />
        </div>

        <h1 className="text-xl font-bold tracking-tight text-text">
          Sign in to Pulse
        </h1>

        <p className="mt-2 text-xs text-muted leading-relaxed max-w-sm">
          Pulse uses GitHub authentication for developers. Sign in to create projects, generate secure API keys, and receive instant Telegram alerts.
        </p>

        {error && (
          <div className="mt-4 w-full p-2.5 rounded-md bg-critical/10 border border-critical/30 text-critical text-xs">
            Authentication error: {error}. Please try again.
          </div>
        )}

        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: callbackUrl || "/dashboard" });
          }}
          className="mt-6 w-full"
        >
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full flex items-center justify-center gap-2.5 font-medium"
          >
            <svg
              className="w-4 h-4 fill-current"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span>Continue with GitHub</span>
          </Button>
        </form>

        <p className="mt-4 text-[11px] text-muted">
          No passwords. No marketing emails. Only GitHub account identity.
        </p>
      </div>

      <div className="max-w-md mx-auto w-full pb-8 text-center text-xs text-muted">
        <span>Pulse Monitoring Platform</span>
      </div>
    </div>
  );
}

