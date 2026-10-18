import { config } from "../config";

export interface AiDiagnosisResult {
  diagnosis: string;
  suggestedFix: string;
}

/**
 * Analyzes an error and stack trace using Rumpty AI Inference.
 * Produces a concise root cause diagnosis and suggested fix.
 */
export async function diagnoseError(
  errorName: string,
  errorMessage: string,
  stack?: string,
  metadata?: Record<string, any>
): Promise<AiDiagnosisResult> {
  if (!config.rumptyAiApiKey) {
    return generateFallbackDiagnosis(errorName, errorMessage, stack);
  }

  const systemPrompt = `You are Pulse AI, an expert systems and runtime debugger for Node.js applications deployed on Rumpty Cloud.
Analyze the provided error, stack trace, and context.
Respond ONLY with a JSON object in this exact schema without any markdown wrappers:
{
  "diagnosis": "A crisp, 1-2 sentence explanation of what failed and why (root cause).",
  "suggestedFix": "Precise, actionable code snippet or configuration change to fix the issue."
}`;

  const userContent = JSON.stringify({
    name: errorName,
    message: errorMessage,
    stack: stack ? stack.split("\n").slice(0, 10).join("\n") : undefined,
    metadata,
  });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000); // 6s timeout max

    const response = await fetch(config.rumptyAiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.rumptyAiApiKey}`,
      },
      body: JSON.stringify({
        model: config.rumptyAiModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        temperature: 0.2,
        max_tokens: 500,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`[Pulse AI] Inference failed (${response.status}): ${await response.text()}`);
      return generateFallbackDiagnosis(errorName, errorMessage, stack);
    }

    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return generateFallbackDiagnosis(errorName, errorMessage, stack);
    }

    // Attempt to extract and parse JSON response even if wrapped in markdown or conversational text
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return generateFallbackDiagnosis(errorName, errorMessage, stack);
    }
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      diagnosis: parsed.diagnosis || "Unspecified runtime exception.",
      suggestedFix: parsed.suggestedFix || "Inspect stack trace and handle edge cases.",
    };
  } catch (err) {
    console.error("[Pulse AI] Error invoking AI diagnosis:", err);
    return generateFallbackDiagnosis(errorName, errorMessage, stack);
  }
}

function generateFallbackDiagnosis(
  name: string,
  message: string,
  stack?: string
): AiDiagnosisResult {
  if (name.includes("TypeError") || message.includes("undefined") || message.includes("null")) {
    return {
      diagnosis: `Attempted to access a property or execute a method on an undefined or null variable.`,
      suggestedFix: `Check variable initialization before access or use optional chaining (?.) and nullish coalescing (??).`,
    };
  }

  if (name.includes("ECONNREFUSED") || message.includes("connect")) {
    return {
      diagnosis: `Connection refused. The target upstream service or database is unreachable or offline.`,
      suggestedFix: `Verify host, port, credentials, and ensure the target database/service instance is running on Rumpty.`,
    };
  }

  if (name.includes("SyntaxError")) {
    return {
      diagnosis: `Malformed syntax or failed JSON parsing of incoming data.`,
      suggestedFix: `Wrap JSON.parse calls in try/catch or validate API inputs using schemas like Zod.`,
    };
  }

  return {
    diagnosis: `Runtime crash triggered by ${name}: "${message.slice(0, 150)}"`,
    suggestedFix: `Inspect the stack frames near ${stack ? stack.split("\n")[1]?.trim() || "origin" : "origin"} and add guard clauses.`,
  };
}
