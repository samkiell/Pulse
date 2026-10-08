import { generateFingerprint } from "./fingerprint";
import type {
  ErrorEventPayload,
  ErrorType,
  IngestResponse,
  PulseConfig,
} from "./types";

class PulseClient {
  private config: Required<PulseConfig> = {
    apiKey: "",
    endpoint: "https://pulse.rumpty.app/api/v1/ingest",
    environment: process.env.NODE_ENV || "production",
    release: process.env.APP_VERSION || "",
    debug: false,
    captureUncaughtExceptions: true,
    captureUnhandledRejections: true,
    exitOnUncaughtException: true,
    maxQueueSize: 50,
    flushIntervalMs: 2000,
  };

  private queue: ErrorEventPayload[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private initialized = false;

  /**
   * Initializes the Pulse monitoring client
   */
  public init(options: PulseConfig): void {
    if (this.initialized) {
      if (this.config.debug) {
        console.warn("[Pulse] SDK already initialized. Overwriting config.");
      }
    }

    this.config = {
      ...this.config,
      ...options,
      endpoint: options.endpoint || this.config.endpoint,
    };

    if (!this.config.apiKey) {
      console.error("[Pulse] Initialization failed: apiKey is required.");
      return;
    }

    this.setupGlobalHandlers();
    this.startPeriodicFlush();
    this.initialized = true;

    if (this.config.debug) {
      console.log(`[Pulse] Initialized for environment: ${this.config.environment}`);
    }
  }

  /**
   * Captures any Error or custom exception and queues it for dispatch
   */
  public captureError(
    err: unknown,
    metadata?: Record<string, any>,
    errorType: ErrorType = "custom"
  ): void {
    if (!this.initialized && !this.config.apiKey) {
      console.warn("[Pulse] Cannot capture error: SDK is not initialized with an API key.");
      return;
    }

    const payload = this.normalizeError(err, errorType, metadata);
    this.queue.push(payload);

    if (this.config.debug) {
      console.log(`[Pulse] Error queued (${payload.name}: ${payload.message}) [${payload.fingerprint}]`);
    }

    if (this.queue.length >= this.config.maxQueueSize || errorType === "uncaughtException") {
      this.flushSyncOrAsync();
    }
  }

  /**
   * Express / Connect error handling middleware
   * Usage: app.use(pulse.errorHandler())
   */
  public errorHandler() {
    return (err: any, req: any, res: any, next: (err?: any) => void) => {
      this.captureError(
        err,
        {
          route: req?.originalUrl || req?.url,
          method: req?.method,
          headers: req?.headers ? { ...req.headers, authorization: undefined, cookie: undefined } : undefined,
          ip: req?.ip,
        },
        "middleware"
      );
      next(err);
    };
  }

  /**
   * Immediately flushes all queued events to Pulse backend
   */
  public async flush(): Promise<void> {
    if (this.queue.length === 0) return;

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
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (this.config.debug) {
          console.error(`[Pulse] Ingest request failed with status ${response.status}: ${errorText}`);
        }
      }
    } catch (error) {
      if (this.config.debug) {
        console.error("[Pulse] Network error during event dispatch:", error);
      }
    }
  }

  private flushSyncOrAsync(): void {
    // Non-blocking flush
    void this.flush();
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

        // Ensure flush completes
        try {
          await this.flush();
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

    // Flush remaining on graceful termination
    const gracefulShutdown = async () => {
      await this.flush();
    };

    process.once("beforeExit", gracefulShutdown);
    process.once("SIGTERM", gracefulShutdown);
    process.once("SIGINT", gracefulShutdown);
  }

  private startPeriodicFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, this.config.flushIntervalMs);

    // Unref timer so it doesn't hold the Node process alive
    if (this.flushTimer && typeof this.flushTimer.unref === "function") {
      this.flushTimer.unref();
    }
  }
}

export const pulse = new PulseClient();
export default pulse;
export * from "./types";
export * from "./fingerprint";

// Configurable batch intervals