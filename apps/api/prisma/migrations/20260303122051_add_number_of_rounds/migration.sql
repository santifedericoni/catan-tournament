-- AlterTable
ALTER TABLE "tournaments" ADD COLUMN     "number_of_rounds" INTEGER;

-- AddForeignKey
ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_guest_player_id_fkey" FOREIGN KEY ("guest_player_id") REFERENCES "guest_players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
