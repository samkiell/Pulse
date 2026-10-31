import { NextResponse } from "next/server";
import { prisma } from "@pulse/db";

export const dynamic = "force-dynamic";

export const DDL_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`,
  `CREATE TABLE IF NOT EXISTS "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"("userId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId")`,
  `CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionToken_key" ON "Session"("sessionToken")`,
  `CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId")`,
  `CREATE TABLE IF NOT EXISTS "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token")`,
  `CREATE TABLE IF NOT EXISTS "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastHeartbeatAt" TIMESTAMP(3),
    "appMetadata" JSONB,
    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Project_slug_key" ON "Project"("slug")`,
  `CREATE INDEX IF NOT EXISTS "Project_ownerId_idx" ON "Project"("ownerId")`,
  `CREATE TABLE IF NOT EXISTS "ApiKey" (
    "id" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Default Key',
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ApiKey_keyHash_key" ON "ApiKey"("keyHash")`,
  `CREATE INDEX IF NOT EXISTS "ApiKey_projectId_idx" ON "ApiKey"("projectId")`,
  `CREATE TABLE IF NOT EXISTS "TelegramIntegration" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "chatId" TEXT,
    "chatTitle" TEXT,
    "verificationToken" TEXT NOT NULL,
    "linkPin" TEXT,
    "consumedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TelegramIntegration_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "TelegramIntegration_verificationToken_key" ON "TelegramIntegration"("verificationToken")`,
  `CREATE INDEX IF NOT EXISTS "TelegramIntegration_verificationToken_idx" ON "TelegramIntegration"("verificationToken")`,
  `CREATE INDEX IF NOT EXISTS "TelegramIntegration_linkPin_idx" ON "TelegramIntegration"("linkPin")`,
  `CREATE INDEX IF NOT EXISTS "TelegramIntegration_projectId_idx" ON "TelegramIntegration"("projectId")`,
  `CREATE TABLE IF NOT EXISTS "Incident" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "severity" TEXT NOT NULL DEFAULT 'CRITICAL',
    "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAlertedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aiDiagnosis" TEXT,
    "suggestedFix" TEXT,
    "diagnosisSource" TEXT,
    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "Incident_projectId_status_idx" ON "Incident"("projectId", "status")`,
  `CREATE INDEX IF NOT EXISTS "Incident_lastSeenAt_idx" ON "Incident"("lastSeenAt")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Incident_projectId_fingerprint_key" ON "Incident"("projectId", "fingerprint")`,
  `CREATE TABLE IF NOT EXISTS "ErrorEvent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "incidentId" TEXT,
    "fingerprint" TEXT NOT NULL,
    "errorType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "environment" TEXT NOT NULL DEFAULT 'production',
    "release" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ErrorEvent_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "ErrorEvent_projectId_timestamp_idx" ON "ErrorEvent"("projectId", "timestamp")`,
  `CREATE INDEX IF NOT EXISTS "ErrorEvent_fingerprint_idx" ON "ErrorEvent"("fingerprint")`,
];

export async function runSchemaBootstrap(): Promise<{ success: boolean; userCount: number }> {
  for (const sql of DDL_STATEMENTS) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (err: any) {
      console.warn("[DB Init] Notice executing DDL statement:", err?.message || err);
    }
  }
  const userCount = await prisma.user.count().catch(() => -1);
  return { success: userCount >= 0, userCount };
}

export async function GET() {
  const result = await runSchemaBootstrap();
  return NextResponse.json({
    status: result.success ? "success" : "error",
    message: result.success
      ? "Database schema initialized successfully"
      : "Failed to query User table after initialization",
    userCount: result.userCount,
    timestamp: new Date().toISOString(),
  });
}
