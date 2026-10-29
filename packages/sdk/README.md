# pulse

Lightweight Node.js error monitoring and crash alerting SDK for apps deployed on Rumpty Cloud.

## Installation

```bash
npm install pulse
```

## Quickstart

Initialize at the very top of your entrypoint before any other imports or application logic:

```typescript
import pulse from "pulse";

pulse.init({
  apiKey: process.env.PULSE_API_KEY!,
  endpoint: process.env.PULSE_ENDPOINT!,
  environment: process.env.NODE_ENV || "production",
});
```

## Express Middleware

Attach the error handler at the end of your middleware chain, after all route definitions:

```typescript
import express from "express";
import pulse from "pulse";

const app = express();

// ... routes ...

// Attach error middleware before default Express error handler
app.use(pulse.errorHandler());
```

The middleware automatically forwards allowed diagnostic headers:
- `user-agent`
- `content-type`
- `accept`
- `host`
- `referer`
- `x-request-id`
- `x-forwarded-for`

All other headers (such as `authorization` and `cookie`) are stripped before transmission.

## Manual Error Capture

```typescript
import pulse from "pulse";

try {
  await executeJob();
} catch (error) {
  pulse.captureError(error, {
    jobId: "job_12345",
    attempt: 3,
  });
}
```

## Configuration Reference

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `apiKey` | `string` | `""` | Project API key (`pulse_live_...`) or `PULSE_API_KEY`. Required. |
| `endpoint` | `string` | `""` | Ingest endpoint URL or `PULSE_ENDPOINT`. Required. |
| `environment` | `string` | `"production"` | Runtime environment name. |
| `release` | `string` | `""` | Application release version. |
| `debug` | `boolean` | `false` | Enable verbose internal logging. |
| `captureUncaughtExceptions` | `boolean` | `true` | Intercept uncaughtException events. |
| `captureUnhandledRejections` | `boolean` | `true` | Intercept unhandledRejection events. |
| `exitOnUncaughtException` | `boolean` | `true` | Exit process with status 1 on uncaught exception. |
| `maxQueueSize` | `number` | `200` | Maximum queued events before oldest are dropped (capped at 200). |
| `flushIntervalMs` | `number` | `2000` | Periodic buffer flush interval in milliseconds. |

## Process Lifecycle and Failure Handling

- **No Signal Interception:** The SDK does not listen for `SIGTERM` or `SIGINT`. Container orchestrators can shut down and redeploy applications without hangs.
- **Graceful Exit:** Buffered events are flushed on natural process `beforeExit`.
- **Fatal Crashes:** On `uncaughtException`, buffered events are flushed with a hard 3-second cap before `process.exit(1)`.
- **Network Timeouts:** Every ingest request enforces a 3-second abort signal (`AbortSignal.timeout(3000)`).
- **Fail-Soft Isolation:** The SDK catches internal errors. If the ingest server is unreachable or configuration is missing, the SDK logs an error and disables itself without throwing into host application code.
