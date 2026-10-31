import { NextResponse } from "next/server";
import { prisma } from "@pulse/db";

export const dynamic = "force-dynamic";

export async function GET() {
  let dbStatus = "unknown";
  let dbError: string | null = null;
  let userCount = 0;

  try {
    userCount = await prisma.user.count();
    dbStatus = "connected";
  } catch (err: any) {
    dbStatus = "error";
    dbError = err?.message || String(err);
  }

  const clean = (s?: string) => Boolean(s?.replace(/^["']|["']$/g, "").trim());

  return NextResponse.json({
    status: dbStatus === "connected" ? "healthy" : "degraded",
    service: "pulse-web",
    database: {
      status: dbStatus,
      userCount,
      error: dbError,
    },
    auth: {
      authSecretConfigured: clean(process.env.AUTH_SECRET) || clean(process.env.NEXTAUTH_SECRET),
      githubIdConfigured: clean(process.env.AUTH_GITHUB_ID) || clean(process.env.GITHUB_ID),
      githubSecretConfigured: clean(process.env.AUTH_GITHUB_SECRET) || clean(process.env.GITHUB_SECRET),
      authUrl: process.env.AUTH_URL || process.env.NEXTAUTH_URL || "unset",
      authTrustHost: process.env.AUTH_TRUST_HOST || "unset",
    },
    timestamp: new Date().toISOString(),
  });
}
