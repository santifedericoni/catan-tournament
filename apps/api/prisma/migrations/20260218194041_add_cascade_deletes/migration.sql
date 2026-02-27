-- DropForeignKey
ALTER TABLE "matchup_history" DROP CONSTRAINT "matchup_history_round_id_fkey";

-- DropForeignKey
ALTER TABLE "matchup_history" DROP CONSTRAINT "matchup_history_tournament_id_fkey";

-- DropForeignKey
ALTER TABLE "results" DROP CONSTRAINT "results_table_id_fkey";

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matchup_history" ADD CONSTRAINT "matchup_history_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matchup_history" ADD CONSTRAINT "matchup_history_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
