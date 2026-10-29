# Pulse Demo Application

Sample Express application instrumented with `@samkiel/pulse-monitor` demonstrating crash and error telemetry capture.

## Setup

1. Install dependencies in the monorepo:

```bash
pnpm install
```

2. Configure environment variables in `.env` or set them directly:

```env
PORT=5000
PULSE_API_KEY=pulse_live_your_api_key_here
PULSE_ENDPOINT=http://localhost:3001/api/v1/ingest
NODE_ENV=development
APP_VERSION=1.0.0
```

3. Run the application:

```bash
# Development mode
pnpm --filter @pulse/demo-app dev

# Production build and run
pnpm --filter @pulse/demo-app build
pnpm --filter @pulse/demo-app start
```

## Available Endpoints

- `GET /health`: Returns `{ status: "ok" }`. Used for container liveness checks.
- `POST /boom`: Throws a standard Error inside the route handler. Caught and reported by `pulse.errorHandler()`.
- `POST /crash`: Triggers an `uncaughtException` in a timer after returning HTTP 200. Demonstrates process crash capture and immediate flush before exit.
- `POST /reject`: Triggers an unhandled promise rejection. Caught by the SDK process listener.
- `POST /db-fail`: Throws a simulated database connection error matching the `ECONNREFUSED` AI diagnosis heuristic.

## Example Requests

Trigger a handled route error:

```bash
curl -X POST http://localhost:5000/boom
```

Trigger an asynchronous process crash:

```bash
curl -X POST http://localhost:5000/crash
```

Trigger an unhandled promise rejection:

```bash
curl -X POST http://localhost:5000/reject
```

Trigger a connection failure heuristic:

```bash
curl -X POST http://localhost:5000/db-fail
```

