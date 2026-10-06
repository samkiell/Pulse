export interface PulseConfig {
  apiKey: string;
  endpoint?: string;
  environment?: string;
  release?: string;
  debug?: boolean;
  captureUncaughtExceptions?: boolean;
  captureUnhandledRejections?: boolean;
  exitOnUncaughtException?: boolean;
  maxQueueSize?: number;
  flushIntervalMs?: number;
}

export type ErrorType =
  | "uncaughtException"
  | "unhandledRejection"
  | "middleware"
  | "custom";

export interface ErrorEventPayload {
  errorType: ErrorType;
  name: string;
  message: string;
  stack?: string;
  fingerprint: string;
  environment: string;
  release?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface IngestResponse {
  success: boolean;
  incidentId?: string;
  isNewIncident?: boolean;
  message?: string;
}
