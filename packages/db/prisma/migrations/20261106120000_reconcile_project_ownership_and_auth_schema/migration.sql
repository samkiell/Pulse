-- 1. Ensure User table and indexes exist
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- 2. Ensure Account table and indexes exist
CREATE TABLE IF NOT EXISTS "Account" (
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
);
CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"("userId");

-- 3. Ensure Session table and indexes exist
CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");

-- 4. Ensure VerificationToken and Verification tables exist
CREATE TABLE IF NOT EXISTS "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

CREATE TABLE IF NOT EXISTS "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- 5. Reconcile Project columns safely
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "lastHeartbeatAt" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "appMetadata" JSONB;

-- 6. Backfill Project.ownerId safely without deleting records or inventing ownership
DO $$
DECLARE
    primary_user_id TEXT;
BEGIN
    -- Find the earliest registered legitimate user
    SELECT "id" INTO primary_user_id FROM "User" ORDER BY "createdAt" ASC LIMIT 1;

    IF primary_user_id IS NOT NULL THEN
        -- Associate any unowned projects with the legitimate user
        UPDATE "Project"
        SET "ownerId" = primary_user_id
        WHERE "ownerId" IS NULL;
    END IF;

    -- If all projects now have an owner, enforce NOT NULL
    IF NOT EXISTS (SELECT 1 FROM "Project" WHERE "ownerId" IS NULL) THEN
        ALTER TABLE "Project" ALTER COLUMN "ownerId" SET NOT NULL;
    END IF;

    -- Add foreign key constraint if it doesn't already exist and all references are valid
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Project_ownerId_fkey'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM "Project" p
            WHERE p."ownerId" IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u."id" = p."ownerId")
        ) AND EXISTS (
            SELECT 1 FROM "Project" WHERE "ownerId" IS NOT NULL
        ) THEN
            ALTER TABLE "Project"
            ADD CONSTRAINT "Project_ownerId_fkey"
            FOREIGN KEY ("ownerId") REFERENCES "User"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- 7. Ensure Project ownerId index exists
CREATE INDEX IF NOT EXISTS "Project_ownerId_idx" ON "Project"("ownerId");

-- 8. Ensure ApiKey columns and indexes exist
ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "keyHash" TEXT;
ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "keyPrefix" TEXT;

-- Reconcile legacy ApiKey.key if exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ApiKey' AND column_name = 'key'
    ) THEN
        -- If legacy 'key' column exists, populate keyPrefix if null
        UPDATE "ApiKey"
        SET "keyPrefix" = SUBSTRING("key" FROM 1 FOR 12)
        WHERE "keyPrefix" IS NULL AND "key" IS NOT NULL;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "ApiKey_keyHash_key" ON "ApiKey"("keyHash");
CREATE INDEX IF NOT EXISTS "ApiKey_projectId_idx" ON "ApiKey"("projectId");

-- 9. Ensure TelegramIntegration columns and indexes exist
ALTER TABLE "TelegramIntegration" ADD COLUMN IF NOT EXISTS "linkPin" TEXT;
CREATE INDEX IF NOT EXISTS "TelegramIntegration_linkPin_idx" ON "TelegramIntegration"("linkPin");
CREATE INDEX IF NOT EXISTS "TelegramIntegration_projectId_idx" ON "TelegramIntegration"("projectId");

-- 10. Ensure Account and Session foreign keys exist if not present
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Account_userId_fkey') THEN
        ALTER TABLE "Account"
        ADD CONSTRAINT "Account_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Session_userId_fkey') THEN
        ALTER TABLE "Session"
        ADD CONSTRAINT "Session_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
