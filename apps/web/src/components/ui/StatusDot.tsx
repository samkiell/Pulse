import React from "react";

export type StatusVariant = "ok" | "warning" | "critical" | "muted" | "info";

export function StatusDot({
  status,
  className = "w-2 h-2",
  pulse = false,
}: {
  status: StatusVariant | string;
  className?: string;
  pulse?: boolean;
}) {
  let color = "bg-muted";
  if (status === "ok" || status === "Connected" || status === "RESOLVED") {
    color = "bg-ok";
  } else if (status === "warning" || status === "Silent" || status === "WARNING") {
    color = "bg-warning";
  } else if (status === "critical" || status === "OPEN" || status === "CRITICAL") {
    color = "bg-critical";
  } else if (status === "info" || status === "Waiting for first event") {
    color = "bg-info";
  }

  return (
    <span className="relative inline-flex items-center justify-center">
      {pulse && (
        <span
          className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${color}`}
        />
      )}
      <span className={`inline-block rounded-full ${color} ${className}`} />
    </span>
  );
}
