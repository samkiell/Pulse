import { NextResponse } from "next/server";
import { prisma } from "@pulse/db";
import { runSchemaBootstrap } from "../db/init/route";

export const dynamic = "force-dynamic";

export async function GET() {
  let dbStatus = "unknown";
  let dbError: string | null = null;
  let userCount = 0;
  let autoBootstrapped = false;

  try {
    userCount = await prisma.user.count();
    dbStatus = "connected";
  } catch (err: any) {
    dbStatus = "error";
    dbError = err?.message || String(err);

    // If tables are missing, automatically bootstrap schema
    if (dbError && (dbError.includes("does not exist") || dbError.includes("relation"))) {
      try {
        const boot = await runSchemaBootstrap();
        if (boot.success) {
          dbStatus = "connected";
          userCount = boot.userCount;
          dbError = null;
          autoBootstrapped = true;
        }
      } catch (bootErr: any) {
        dbError = `Bootstrap failed: ${bootErr?.message || bootErr}`;
      }
    }
  }

  const clean = (s?: string) => Boolean(s?.replace(/^["']|["']$/g, "").trim());

  return NextResponse.json({
    status: dbStatus === "connected" ? "healthy" : "degraded",
    service: "pulse-web",
    database: {
      status: dbStatus,
      userCount,
      autoBootstrapped,
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
