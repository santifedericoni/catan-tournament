/*
  Warnings:

  - The values [ORGANIZER] on the enum `TournamentRoleType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TournamentRoleType_new" AS ENUM ('OWNER', 'CO_ORGANIZER', 'STAFF');
ALTER TABLE "tournament_roles" ALTER COLUMN "role" TYPE "TournamentRoleType_new" USING ("role"::text::"TournamentRoleType_new");
ALTER TYPE "TournamentRoleType" RENAME TO "TournamentRoleType_old";
ALTER TYPE "TournamentRoleType_new" RENAME TO "TournamentRoleType";
DROP TYPE "TournamentRoleType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "player_submissions" DROP CONSTRAINT "player_submissions_submitted_by_fkey";

-- DropForeignKey
ALTER TABLE "player_submissions" DROP CONSTRAINT "player_submissions_table_id_fkey";

-- AlterTable
ALTER TABLE "player_submissions" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "player_submissions" ADD CONSTRAINT "player_submissions_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_submissions" ADD CONSTRAINT "player_submissions_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
