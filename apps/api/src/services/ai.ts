import { z } from "zod";
import { config } from "../config";

export interface AiDiagnosisResult {
  diagnosis: string;
  suggestedFix: string;
  source: "rumpty" | "fallback-llm" | "heuristic";
}

const AiResponseSchema = z.object({
  diagnosis: z.string().min(1),
  suggestedFix: z.string().min(1),
});

let startupLogged = false;

/**
 * Logs active AI providers once at startup and warns if Rumpty model is missing.
 */
export function logAiProvidersAtStartup(): void {
  if (startupLogged) return;
  startupLogged = true;

  const providers: string[] = [];
  if (config.rumptyAiApiKey) {
    if (!config.rumptyAiModel) {
      console.warn(
        "[Pulse AI] Startup warning: RUMPTY_AI_API_KEY is configured but RUMPTY_AI_MODEL is missing."
      );
    }
    providers.push(`Rumpty (${config.rumptyAiModel || "unspecified-model"})`);
  }

  if (config.aiFallbackEndpoint && config.aiFallbackApiKey) {
    providers.push(`Fallback LLM (${config.aiFallbackModel || "unspecified-model"})`);
  }

  providers.push("Rule-based heuristic");
  console.log(`[Pulse AI] Diagnostic provider chain: ${providers.join(" -> ")}`);
}

/**
 * Scrubs sensitive secrets from text (stack traces, messages).
 */
export function scrubSecrets(input: string): string {
  if (!input) return "";

  let scrubbed = input;

  // 1. Bearer tokens
  scrubbed = scrubbed.replace(/Bearer\s+[a-zA-Z0-9_\-\.]+/gi, "Bearer [REDACTED]");

  // 2. Pulse live API keys
  scrubbed = scrubbed.replace(/pulse_live_[a-fA-F0-9]+/gi, "pulse_live_[REDACTED]");

  // 3. Email addresses
  scrubbed = scrubbed.replace(
    /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g,
    "[EMAIL_REDACTED]"
  );

  // 4. Long hex strings (32+ chars)
  scrubbed = scrubbed.replace(/\b[a-fA-F0-9]{32,}\b/g, "[HEX_REDACTED]");

  // 5. Long base64 strings (40+ base64 chars with optional padding)
  scrubbed = scrubbed.replace(/\b[A-Za-z0-9+/]{40,}={0,2}\b/g, "[BASE64_REDACTED]");

  // 6. Common secret key-value assignments: password, token, secret, authorization, cookie, key
  scrubbed = scrubbed.replace(
    /(["']?(?:password|token|secret|authorization|cookie|apiKey|key)["']?\s*[:=]\s*["']?)[^"'\s,;]+/gi,
    "$1[REDACTED]"
  );

  return scrubbed;
}

/**
 * Recursively scrubs sensitive keys from metadata objects.
 */
export function scrubMetadata(metadata: Record<string, any> | undefined): Record<string, any> | undefined {
  if (!metadata || typeof metadata !== "object") return metadata;

  const SENSITIVE_KEY_REGEX = /password|token|secret|authorization|cookie|key|credential/i;

  function sanitize(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === "string") return scrubSecrets(obj);
    if (typeof obj !== "object") return obj;

    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }

    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (SENSITIVE_KEY_REGEX.test(k)) {
        clean[k] = "[REDACTED]";
      } else {
        clean[k] = sanitize(v);
      }
    }
    return clean;
  }

  return sanitize(metadata);
}

/**
 * Parses and validates structured JSON response from an LLM.
 */
function parseAndValidateLlmResponse(
  rawContent: string
): { diagnosis: string; suggestedFix: string } | null {
  try {
    // Strip markdown code fences
    const stripped = rawContent
      .replace(/^```json\s*/im, "")
      .replace(/^```\s*/im, "")
      .replace(/\s*```$/m, "")
      .trim();

    // Find JSON block
    const firstBrace = stripped.indexOf("{");
    const lastBrace = stripped.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      return null;
    }

    const jsonSub = stripped.slice(firstBrace, lastBrace + 1);
    const parsed = JSON.parse(jsonSub);
    const validated = AiResponseSchema.safeParse(parsed);

    if (!validated.success) {
      return null;
    }

    // Cap lengths: diagnosis max 600, suggestedFix max 1200
    const diagnosis = validated.data.diagnosis.slice(0, 600);
    const suggestedFix = validated.data.suggestedFix.slice(0, 1200);

    return { diagnosis, suggestedFix };
  } catch {
    return null;
  }
}

/**
 * Attempts inference against an OpenAI-compatible endpoint with a 6-second abort window.
 */
async function callLlmProvider(
  endpoint: string,
  apiKey: string,
  model: string,
  providerName: "rumpty" | "fallback-llm",
  userPrompt: string
): Promise<{ diagnosis: string; suggestedFix: string } | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  const systemPrompt = `You are Pulse AI, an expert systems and runtime debugger for Node.js apps.
Analyze the provided error, stack trace, and context.
Respond ONLY with a JSON object without any conversational text or markdown code fences:
{
  "diagnosis": "A crisp, 1-2 sentence root cause explanation (max 600 chars).",
  "suggestedFix": "Precise, actionable code snippet or configuration change to fix the issue (max 1200 chars)."
}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || undefined,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 600,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.warn(
        `[Pulse AI] Provider ${providerName} failed with status ${response.status}: ${errorText}`
      );
      return null;
    }

    const text = await response.text();
    const data = JSON.parse(text);
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      console.warn(`[Pulse AI] Provider ${providerName} returned empty content.`);
      return null;
    }

    const result = parseAndValidateLlmResponse(content);
    if (!result) {
      console.warn(`[Pulse AI] Provider ${providerName} returned invalid schema.`);
      return null;
    }

    return result;
  } catch (err: any) {
    console.warn(`[Pulse AI] Provider ${providerName} request failed: ${err.message || err}`);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Analyzes an error and stack trace across the provider chain:
 * Rumpty AI (6s) -> Fallback LLM (6s) -> Rule-based heuristic.
 */
export async function diagnoseError(
  errorName: string,
  errorMessage: string,
  stack?: string,
  metadata?: Record<string, any>
): Promise<AiDiagnosisResult> {
  logAiProvidersAtStartup();

  // Scrub secrets prior to sending context to external LLM providers
  const cleanName = scrubSecrets(errorName);
  const cleanMessage = scrubSecrets(errorMessage);
  const cleanStack = stack ? scrubSecrets(stack.split("\n").slice(0, 10).join("\n")) : undefined;
  const cleanMetadata = scrubMetadata(metadata);

  const userPrompt = JSON.stringify({
    name: cleanName,
    message: cleanMessage,
    stack: cleanStack,
    metadata: cleanMetadata,
  });

  // 1. Try Rumpty AI
  if (config.rumptyAiApiKey) {
    const rumptyResult = await callLlmProvider(
      config.rumptyAiEndpoint,
      config.rumptyAiApiKey,
      config.rumptyAiModel,
      "rumpty",
      userPrompt
    );

    if (rumptyResult) {
      return {
        ...rumptyResult,
        source: "rumpty",
      };
    }
  }

  // 2. Try Fallback LLM if configured
  if (config.aiFallbackEndpoint && config.aiFallbackApiKey) {
    const fallbackResult = await callLlmProvider(
      config.aiFallbackEndpoint,
      config.aiFallbackApiKey,
      config.aiFallbackModel,
      "fallback-llm",
      userPrompt
    );

    if (fallbackResult) {
      return {
        ...fallbackResult,
        source: "fallback-llm",
      };
    }
  }

  // 3. Fallback to rule-based heuristic
  const heuristic = generateRuleBasedDiagnosis(cleanName, cleanMessage, cleanStack);
  return {
    ...heuristic,
    source: "heuristic",
  };
}

/**
 * Pure heuristic diagnosis with tightened connection error detection.
 */
export function generateRuleBasedDiagnosis(
  name: string,
  message: string,
  stack?: string
): { diagnosis: string; suggestedFix: string } {
  // Tightened connection checks: match ECONNREFUSED, ETIMEDOUT, ENOTFOUND
  const isConnectionError =
    name.includes("ECONNREFUSED") ||
    name.includes("ETIMEDOUT") ||
    name.includes("ENOTFOUND") ||
    message.includes("ECONNREFUSED") ||
    message.includes("ETIMEDOUT") ||
    message.includes("ENOTFOUND");

  if (isConnectionError) {
    return {
      diagnosis:
        "Connection failed. Upstream target service or database is unreachable, timing out, or domain not resolved.",
      suggestedFix:
        "Verify target host, port, credentials, and ensure the target service instance is healthy and running on Rumpty.",
    };
  }

  if (name.includes("TypeError") || message.includes("undefined") || message.includes("null")) {
    return {
      diagnosis:
        "Attempted to access a property or execute a method on an undefined or null variable.",
      suggestedFix:
        "Check variable initialization before access or use optional chaining (?.) and nullish coalescing (??).",
    };
  }

  if (name.includes("SyntaxError")) {
    return {
      diagnosis: "Malformed syntax or failed JSON parsing of incoming data.",
      suggestedFix:
        "Wrap JSON.parse calls in try/catch or validate API inputs using schemas like Zod.",
    };
  }

  return {
    diagnosis: `Runtime crash triggered by ${name}: "${message.slice(0, 150)}"`,
    suggestedFix: `Inspect stack frames near ${
      stack ? stack.split("\n")[1]?.trim() || "origin" : "origin"
    } and add guard clauses.`,
  };
}
