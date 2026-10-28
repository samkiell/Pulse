import { generateFingerprint } from "./fingerprint";
import type {
  ErrorEventPayload,
  ErrorType,
  PulseConfig,
} from "./types";

const ALLOWED_HEADERS = new Set([
  "user-agent",
  "content-type",
  "accept",
  "host",
  "referer",
  "x-request-id",
  "x-forwarded-for",
]);

export function sanitizeHeaders(
  headers: Record<string, any> | undefined
): Record<string, string> | undefined {
  if (!headers || typeof headers !== "object") return undefined;
  const filtered: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    if (ALLOWED_HEADERS.has(lowerKey) && typeof value === "string") {
      filtered[lowerKey] = value;
    }
  }
  return filtered;
}

export class PulseClient {
  private config: Required<PulseConfig> = {
    apiKey: "",
    endpoint: "",
    environment: process.env.NODE_ENV || "production",
    release: process.env.APP_VERSION || "",
    debug: false,
    captureUncaughtExceptions: true,
    captureUnhandledRejections: true,
    exitOnUncaughtException: true,
    maxQueueSize: 200,
    flushIntervalMs: 2000,
  };

  private queue: ErrorEventPayload[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private initialized = false;
  private enabled = false;
  private handlersRegistered = false;

  /**
   * Initializes the Pulse monitoring client.
   * Safe and idempotent: does not throw into host application.
   */
  public init(options: PulseConfig): void {
    try {
      const endpoint = options.endpoint || process.env.PULSE_ENDPOINT;
      const apiKey = options.apiKey || process.env.PULSE_API_KEY;

      if (!endpoint) {
        console.error(
          "[Pulse] Initialization failed: endpoint is required (pass endpoint option or set PULSE_ENDPOINT). SDK disabled."
        );
        this.enabled = false;
        return;
      }

      if (!apiKey) {
        console.error("[Pulse] Initialization failed: apiKey is required. SDK disabled.");
        this.enabled = false;
        return;
      }

      this.config = {
        ...this.config,
        ...options,
        apiKey,
        endpoint,
        maxQueueSize: Math.min(options.maxQueueSize || 200, 200),
      };

      this.enabled = true;

      // Register process handlers once across multiple init calls
      if (!this.handlersRegistered) {
        this.setupGlobalHandlers();
        this.handlersRegistered = true;
      }

      this.startPeriodicFlush();
      this.initialized = true;

      if (this.config.debug) {
        console.log(`[Pulse] Initialized for environment: ${this.config.environment}`);
      }
    } catch (err) {
      console.error("[Pulse] Unexpected error during initialization:", err);
      this.enabled = false;
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Captures any Error or custom exception and queues it for dispatch.
   */
  public captureError(
    err: unknown,
    metadata?: Record<string, any>,
    errorType: ErrorType = "custom"
  ): void {
    if (!this.enabled) {
      return;
    }

    try {
      const payload = this.normalizeError(err, errorType, metadata);

      // Cap queue at 200 events (drop oldest to preserve memory bounds)
      const cap = Math.min(this.config.maxQueueSize, 200);
      while (this.queue.length >= cap) {
        this.queue.shift();
      }

      this.queue.push(payload);

      if (this.config.debug) {
        console.log(
          `[Pulse] Error queued (${payload.name}: ${payload.message}) [${payload.fingerprint}]`
        );
      }

      if (errorType === "uncaughtException") {
        void this.flush();
      }
    } catch (error) {
      if (this.config.debug) {
        console.error("[Pulse] Failed to capture error:", error);
      }
    }
  }

  /**
   * Express / Connect error handling middleware.
   * Usage: app.use(pulse.errorHandler())
   */
  public errorHandler() {
    return (err: any, req: any, res: any, next: (err?: any) => void) => {
      try {
        this.captureError(
          err,
          {
            route: req?.originalUrl || req?.url,
            method: req?.method,
            headers: sanitizeHeaders(req?.headers),
            ip: req?.ip,
          },
          "middleware"
        );
      } catch {
        // Never interrupt error pipeline
      }
      next(err);
    };
  }

  /**
   * Flushes queued events to the ingest backend.
   * Enforces 3000ms abort timeout on all requests.
   */
  public async flush(): Promise<void> {
    if (!this.enabled || this.queue.length === 0) return;

    const eventsToSend = [...this.queue];
    this.queue = [];

    try {
      const response = await fetch(this.config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Pulse-API-Key": this.config.apiKey,
        },
        body: JSON.stringify({ events: eventsToSend }),
        signal: AbortSignal.timeout(3000),
      });

      if (!response.ok && this.config.debug) {
        const errorText = await response.text().catch(() => "");
        console.error(
          `[Pulse] Ingest request failed with status ${response.status}: ${errorText}`
        );
      }
    } catch (error) {
      if (this.config.debug) {
        console.error("[Pulse] Network error during event dispatch:", error);
      }
    }
  }

  private normalizeError(
    err: unknown,
    errorType: ErrorType,
    metadata?: Record<string, any>
  ): ErrorEventPayload {
    let name = "Error";
    let message = "Unknown error";
    let stack: string | undefined;

    if (err instanceof Error) {
      name = err.name || "Error";
      message = err.message || "";
      stack = err.stack;
    } else if (typeof err === "string") {
      message = err;
    } else if (typeof err === "object" && err !== null) {
      name = (err as any).name || "ObjectError";
      message = (err as any).message || JSON.stringify(err);
      stack = (err as any).stack;
    }

    const fingerprint = generateFingerprint(name, message, stack);

    return {
      errorType,
      name,
      message,
      stack,
      fingerprint,
      environment: this.config.environment,
      release: this.config.release || undefined,
      metadata,
      timestamp: new Date().toISOString(),
    };
  }

  private setupGlobalHandlers(): void {
    if (this.config.captureUncaughtExceptions) {
      process.on("uncaughtException", async (error: Error) => {
        console.error("[Pulse] Captured uncaughtException:", error);
        this.captureError(error, undefined, "uncaughtException");

        // Flush with a hard 3 second cap before exiting
        try {
          await Promise.race([
            this.flush(),
            new Promise((resolve) => setTimeout(resolve, 3000)),
          ]);
        } catch {
          // ignore flush error on shutdown
        }

        if (this.config.exitOnUncaughtException) {
          process.exit(1);
        }
      });
    }

    if (this.config.captureUnhandledRejections) {
      process.on("unhandledRejection", (reason: unknown) => {
        console.error("[Pulse] Captured unhandledRejection:", reason);
        this.captureError(reason, undefined, "unhandledRejection");
      });
    }

    // Flush remaining events before natural Node process exit
    // Note: Do not attach SIGTERM or SIGINT handlers to avoid blocking orchestrator shutdown
    process.once("beforeExit", async () => {
      await this.flush();
    });
  }

  private startPeriodicFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, this.config.flushIntervalMs);

    if (this.flushTimer && typeof this.flushTimer.unref === "function") {
      this.flushTimer.unref();
    }
  }
}

export const pulse = new PulseClient();
export default pulse;
export * from "./types";
export * from "./fingerprint";
