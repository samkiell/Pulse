import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Exempt health endpoint and static Next.js assets
  if (
    pathname === "/api/health" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const isProd = process.env.NODE_ENV === "production";

  // In local development, bypass basic auth unless explicitly enabled
  if (!isProd && process.env.ENABLE_DEV_AUTH !== "true") {
    return NextResponse.next();
  }
  const expectedPassword = process.env.DASHBOARD_PASSWORD;
  const expectedUser = process.env.DASHBOARD_USER || "admin";

  if (isProd && !expectedPassword) {
    return new NextResponse(
      "Service Unavailable: DASHBOARD_PASSWORD must be configured in production",
      {
        status: 503,
        headers: { "content-type": "text/plain" },
      }
    );
  }

  const effectivePassword = expectedPassword || "admin";

  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return new NextResponse("Authentication required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Pulse Dashboard"' },
    });
  }

  const base64Credentials = authHeader.slice(6).trim();
  let credentials = "";
  try {
    credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
  } catch {
    return new NextResponse("Invalid authorization encoding", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Pulse Dashboard"' },
    });
  }

  const colonIdx = credentials.indexOf(":");
  if (colonIdx === -1) {
    return new NextResponse("Invalid credentials format", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Pulse Dashboard"' },
    });
  }

  const user = credentials.slice(0, colonIdx);
  const pass = credentials.slice(colonIdx + 1);

  const userMatches = safeCompare(user, expectedUser);
  const passMatches = safeCompare(pass, effectivePassword);

  if (!userMatches || !passMatches) {
    return new NextResponse("Unauthorized", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Pulse Dashboard"' },
    });
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
