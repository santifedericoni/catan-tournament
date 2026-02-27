-- Migration: add_role_enum_values
-- Adds OWNER and CO_ORGANIZER to TournamentRoleType enum.
-- Must run in its own migration (before add_features_v2) because PostgreSQL
-- requires enum value additions to be committed before they can be used.

ALTER TYPE "TournamentRoleType" ADD VALUE IF NOT EXISTS 'OWNER';
ALTER TYPE "TournamentRoleType" ADD VALUE IF NOT EXISTS 'CO_ORGANIZER';
