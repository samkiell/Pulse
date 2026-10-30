import React from "react";

export function Badge({
  children,
  variant = "default",
  className = "",
}: {
  children: React.ReactNode;
  variant?: "default" | "ok" | "warning" | "critical" | "info" | "ai" | "rule";
  className?: string;
}) {
  let style = "bg-surface-2 text-muted border-border";

  if (variant === "ok") {
    style = "bg-ok/10 text-ok border-ok/30";
  } else if (variant === "warning") {
    style = "bg-warning/10 text-warning border-warning/30";
  } else if (variant === "critical") {
    style = "bg-critical/10 text-critical border-critical/30";
  } else if (variant === "info") {
    style = "bg-info/10 text-info border-info/30";
  } else if (variant === "ai") {
    style = "bg-cyan/10 text-cyan border-cyan/30";
  } else if (variant === "rule") {
    style = "bg-violet/10 text-violet border-violet/30";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border ${style} ${className}`}
    >
      {children}
    </span>
  );
}

