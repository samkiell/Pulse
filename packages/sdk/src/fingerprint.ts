import { createHash } from "node:crypto";

/**
 * Strips dynamic lines, line numbers, and file paths to create
 * a deterministic fingerprint of an error.
 */
export function generateFingerprint(name: string, message: string, stack?: string): string {
  const normalizedName = name.trim();
  
  if (!stack) {
    return createHash("sha256")
      .update(`${normalizedName}:${message.trim()}`)
      .digest("hex")
      .slice(0, 16);
  }

  // Extract frames, skip node internals and library wrappers where possible
  const frames = stack
    .split("\n")
    .slice(1) // skip the error title
    .map((line) => line.trim())
    .filter((line) => line.startsWith("at "))
    .map((line) => {
      // Remove line numbers and column numbers (e.g. :12:34)
      return line.replace(/:\d+:\d+/g, "").replace(/\s+/g, " ");
    })
    .slice(0, 3); // Take top 3 caller frames

  const signature = `${normalizedName}::${frames.join("|") || message.trim()}`;
  return createHash("sha256").update(signature).digest("hex").slice(0, 16);
}

// Optimized frame extraction