-- AlterTable
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "lastHeartbeatAt" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "appMetadata" JSONB;

-- AlterTable
ALTER TABLE "TelegramIntegration" ADD COLUMN IF NOT EXISTS "linkPin" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TelegramIntegration_linkPin_idx" ON "TelegramIntegration"("linkPin");

