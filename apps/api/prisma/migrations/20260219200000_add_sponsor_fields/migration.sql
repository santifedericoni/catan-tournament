-- Migration: add_sponsor_fields
-- Adds optional sponsor fields to the tournaments table

ALTER TABLE "tournaments"
  ADD COLUMN IF NOT EXISTS "sponsor_name" TEXT,
  ADD COLUMN IF NOT EXISTS "sponsor_logo_url" TEXT,
  ADD COLUMN IF NOT EXISTS "sponsor_url" TEXT;
