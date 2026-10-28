import { NextResponse } from "next/server";
import { prisma } from "@pulse/db";
import { createHash, randomBytes } from "node:crypto";

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  let ephemeralKeyId: string | null = null;
  try {
    const { slug } = await params;
    const body = await req.json().catch(() => ({}));
    const errorType = body.errorType || "uncaughtException";

    const project = await prisma.project.findUnique({
      where: { slug },
      include: {
        apiKeys: { where: { isActive: true }, take: 1 },
      },
    });

    if (!project || project.apiKeys.length === 0) {
      return NextResponse.json({ error: "Project or active API key not found" }, { status: 404 });
    }

    const rawSimKey = `pulse_live_${randomBytes(16).toString("hex")}`;
    const simKeyRecord = await prisma.apiKey.create({
      data: {
        projectId: project.id,
        keyHash: hashKey(rawSimKey),
        keyPrefix: rawSimKey.slice(0, 12),
        name: "Simulator Ephemeral Key",
      },
    });
    ephemeralKeyId = simKeyRecord.id;

    const apiPort = process.env.API_PORT || "4000";
    const apiIngestUrl =
      process.env.INTERNAL_INGEST_URL || `http://localhost:${apiPort}/api/v1/ingest`;

    const mockErrors: Record<string, any> = {
      uncaughtException: {
        name: "TypeError",
        message: "Cannot read properties of undefined (reading 'userAuthToken')",
        stack: `TypeError: Cannot read properties of undefined (reading 'userAuthToken')
    at AuthenticateSession (src/middleware/auth.ts:42:18)
    at Layer.handle [as handle_request] (node_modules/express/lib/router/layer.js:95:5)
    at next (node_modules/express/lib/router/route.js:144:13)
    at Route.dispatch (node_modules/express/lib/router/route.js:114:3)`,
        errorType: "uncaughtException",
      },
      unhandledRejection: {
        name: "DatabaseConnectionTimeout",
        message: "Failed to establish TCP connection to postgres.internal.rumpty.cloud:5432 after 5000ms",
        stack: `Error: Connection timeout
    at Client._connect (node_modules/pg/lib/client.js:132:19)
    at Connection.connect (node_modules/pg/lib/connection.js:63:17)
    at QueryExecutor.execute (src/db/pool.ts:24:9)`,
        errorType: "unhandledRejection",
      },
      crashLoop: {
        name: "OutOfMemoryError",
        message: "JavaScript heap out of memory. Allocation failed - process terminated",
        stack: `FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
    at v8::internal::V8::FatalProcessOutOfMemory (src/v8/v8.cc:184:3)
    at DataStreamBuffer.transform (src/services/stream.ts:89:12)`,
        errorType: "uncaughtException",
      },
    };

    const selectedMock = mockErrors[errorType] || mockErrors.uncaughtException;

    const response = await fetch(apiIngestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Pulse-API-Key": rawSimKey,
      },
      body: JSON.stringify({
        events: [
          {
            errorType: selectedMock.errorType,
            name: selectedMock.name,
            message: selectedMock.message,
            stack: selectedMock.stack,
            fingerprint: `sim_${errorType}_${Date.now().toString(36)}`,
            environment: "production",
            release: "v1.2.0-rumpty",
            metadata: {
              nodeVersion: process.version,
              rumptyRegion: "eu-west-1",
              simulatedBy: "dashboard",
            },
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: `Ingest API returned ${response.status}: ${errText}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    return NextResponse.json({ success: true, simulatedError: selectedMock.name, result: data });
  } catch (error: any) {
    console.error("[API simulate POST]", error);
    return NextResponse.json({ error: error.message || "Simulation failed" }, { status: 500 });
  } finally {
    if (ephemeralKeyId) {
      await prisma.apiKey.delete({ where: { id: ephemeralKeyId } }).catch(() => {});
    }
  }
}
