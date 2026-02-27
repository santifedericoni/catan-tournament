-- Migration: add_features_v2
-- Adds: PlayerSubmission model, Table result status, TIME_LIMIT ended reason
-- Note: OWNER/CO_ORGANIZER enum values were added in migration 20260219090000_add_role_enum_values

-- 1. Rename existing ORGANIZER roles → OWNER (creator becomes OWNER)
UPDATE "tournament_roles" SET "role" = 'OWNER' WHERE "role" = 'ORGANIZER';

-- 2. Create TableEndedReason enum
DO $$ BEGIN
  CREATE TYPE "TableEndedReason" AS ENUM ('NORMAL', 'TIME_LIMIT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Create TableResultStatus enum
DO $$ BEGIN
  CREATE TYPE "TableResultStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DISPUTED', 'OFFICIAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 4. Add new columns to tables
ALTER TABLE "tables"
  ADD COLUMN IF NOT EXISTS "result_status" "TableResultStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "ended_reason" "TableEndedReason",
  ADD COLUMN IF NOT EXISTS "officialized_by" TEXT,
  ADD COLUMN IF NOT EXISTS "officialized_at" TIMESTAMP(3);

-- 5. Create player_submissions table
CREATE TABLE IF NOT EXISTS "player_submissions" (
  "id" TEXT NOT NULL,
  "table_id" TEXT NOT NULL,
  "submitted_by" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "ended_reason" "TableEndedReason" NOT NULL DEFAULT 'NORMAL',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "player_submissions_pkey" PRIMARY KEY ("id")
);

-- 6. Unique constraint on (table_id, submitted_by)
ALTER TABLE "player_submissions"
  DROP CONSTRAINT IF EXISTS "player_submissions_table_id_submitted_by_key";
ALTER TABLE "player_submissions"
  ADD CONSTRAINT "player_submissions_table_id_submitted_by_key" UNIQUE ("table_id", "submitted_by");

-- 7. Index on table_id for fast lookups
CREATE INDEX IF NOT EXISTS "player_submissions_table_id_idx" ON "player_submissions"("table_id");

-- 8. Foreign keys for player_submissions
ALTER TABLE "player_submissions"
  DROP CONSTRAINT IF EXISTS "player_submissions_table_id_fkey";
ALTER TABLE "player_submissions"
  ADD CONSTRAINT "player_submissions_table_id_fkey"
  FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE CASCADE;

ALTER TABLE "player_submissions"
  DROP CONSTRAINT IF EXISTS "player_submissions_submitted_by_fkey";
ALTER TABLE "player_submissions"
  ADD CONSTRAINT "player_submissions_submitted_by_fkey"
  FOREIGN KEY ("submitted_by") REFERENCES "users"("id");
