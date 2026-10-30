import React from "react";
import { CopyButton } from "./CopyButton";

export function CodeBlock({
  code,
  language = "bash",
  title,
  className = "",
}: {
  code: string;
  language?: string;
  title?: string;
  className?: string;
}) {
  return (
    <div className={`rounded-md bg-surface border border-border overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-border bg-surface-2/60 text-xs text-muted font-mono">
        <span>{title || language}</span>
        <CopyButton text={code} />
      </div>
      <div className="p-3.5 overflow-x-auto">
        <pre className="font-mono text-xs text-text leading-relaxed whitespace-pre">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

