-- AlterTable: remove scoring_rules from tournaments
ALTER TABLE "tournaments" DROP COLUMN "scoring_rules";

-- AlterTable: remove points_earned from results
ALTER TABLE "results" DROP COLUMN "points_earned";
