"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sanitized client log
    const sanitizedMsg = String(error?.message || error).replace(
      /postgresql:\/\/[^@\s]+@/gi,
      "postgresql://[REDACTED]@"
    );
    console.error("[Dashboard Error Boundary Caught]:", sanitizedMsg);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <Card className="max-w-md w-full p-6 flex flex-col items-center text-center gap-4 border-critical/30 bg-surface">
        <div className="w-12 h-12 rounded-full bg-critical/10 flex items-center justify-center text-critical">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold text-text">Unable to load dashboard data</h2>
          <p className="text-xs text-muted">
            The server encountered a problem querying your project records or verifying your session.
          </p>
        </div>

        {error.digest && (
          <div className="text-[10px] font-mono bg-bg/80 px-2 py-1 rounded text-muted">
            Digest: {error.digest}
          </div>
        )}

        <div className="flex items-center gap-3 mt-2">
          <Button variant="primary" size="sm" onClick={() => reset()}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            <span>Try Again</span>
          </Button>
          <Link href="/">
            <Button variant="secondary" size="sm">
              <Home className="w-3.5 h-3.5 mr-1" />
              <span>Home</span>
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

