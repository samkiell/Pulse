"use client";

import React, { useState } from "react";
import { CopyButton } from "@/components/ui/CopyButton";
import { ChevronDown, ChevronRight, Eye, EyeOff } from "lucide-react";

export function StackTraceViewer({ stack }: { stack?: string | null }) {
  const [hideLibraryFrames, setHideLibraryFrames] = useState(false);

  if (!stack) {
    return (
      <div className="p-4 text-xs font-mono text-muted bg-surface-2/40 border border-border rounded-md">
        No stack trace captured for this incident.
      </div>
    );
  }

  const lines = stack.split("\n");
  const firstLine = lines[0];
  const frameLines = lines.slice(1);

  const parsedFrames = frameLines.map((line) => {
    const isLibrary = line.includes("node_modules") || line.includes("node:internal") || line.includes("(node:");
    return {
      raw: line,
      isLibrary,
    };
  });

  const libraryCount = parsedFrames.filter((f) => f.isLibrary).length;

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-surface border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-2/60 text-xs">
        <span className="font-mono text-muted font-medium">Stack Trace</span>
        <div className="flex items-center gap-3">
          {libraryCount > 0 && (
            <button
              type="button"
              onClick={() => setHideLibraryFrames(!hideLibraryFrames)}
              className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-text font-mono transition-colors"
            >
              {hideLibraryFrames ? <Eye className="w-3.5 h-3.5 text-cyan" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{hideLibraryFrames ? `Show library frames (${libraryCount})` : `Hide library frames (${libraryCount})`}</span>
            </button>
          )}
          <CopyButton text={stack} label="Copy Trace" />
        </div>
      </div>

      <div className="p-4 font-mono text-xs leading-relaxed overflow-x-auto bg-bg">
        {/* Error Header */}
        <div className="text-critical font-bold pb-2 border-b border-border/40">
          {firstLine}
        </div>

        {/* Stack Frames */}
        <div className="pt-2 flex flex-col gap-1">
          {parsedFrames.map((frame, idx) => {
            if (hideLibraryFrames && frame.isLibrary) {
              return null;
            }

            return (
              <div
                key={idx}
                className={`flex items-start gap-2 py-0.5 px-2 rounded ${
                  frame.isLibrary
                    ? "text-muted/60 hover:text-muted"
                    : "text-text font-medium bg-cyan/5 border-l-2 border-cyan pl-2"
                }`}
              >
                <span className="text-[10px] text-muted/40 select-none w-5 text-right shrink-0">
                  {idx + 1}
                </span>
                <span className="break-all">{frame.raw.trim()}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

