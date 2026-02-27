-- DropForeignKey
ALTER TABLE "results" DROP CONSTRAINT "results_user_id_fkey";

-- DropForeignKey
ALTER TABLE "table_seats" DROP CONSTRAINT "table_seats_user_id_fkey";

-- DropForeignKey
ALTER TABLE "tournament_registrations" DROP CONSTRAINT "tournament_registrations_user_id_fkey";

-- AlterTable
ALTER TABLE "results" ADD COLUMN "guest_player_id" TEXT,
ALTER COLUMN "user_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "table_seats" ADD COLUMN "guest_player_id" TEXT,
ALTER COLUMN "user_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "tournament_registrations" ADD COLUMN "guest_player_id" TEXT,
ALTER COLUMN "user_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "tournaments" ADD COLUMN "league_id" TEXT;

-- CreateTable
CREATE TABLE "leagues" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_by" TEXT NOT NULL,
    "format" "TournamentFormat" NOT NULL,
    "tiebreaker_order" JSONB NOT NULL DEFAULT '["victory_points","wins","opponent_strength","avg_position"]',
    "table_generation_mode" "TableGenerationMode" NOT NULL DEFAULT 'RANDOM',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leagues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "league_roles" (
    "id" TEXT NOT NULL,
    "league_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "TournamentRoleType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "league_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_players" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "league_id" TEXT,
    "tournament_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_players_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leagues_created_by_idx" ON "leagues"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "league_roles_league_id_user_id_key" ON "league_roles"("league_id", "user_id");

-- CreateIndex
CREATE INDEX "guest_players_league_id_idx" ON "guest_players"("league_id");

-- CreateIndex
CREATE INDEX "guest_players_tournament_id_idx" ON "guest_players"("tournament_id");

-- CreateIndex
CREATE UNIQUE INDEX "results_table_id_guest_player_id_key" ON "results"("table_id", "guest_player_id");

-- CreateIndex
CREATE UNIQUE INDEX "table_seats_table_id_guest_player_id_key" ON "table_seats"("table_id", "guest_player_id");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_registrations_tournament_id_guest_player_id_key" ON "tournament_registrations"("tournament_id", "guest_player_id");

-- CreateIndex
CREATE INDEX "tournaments_league_id_idx" ON "tournaments"("league_id");

-- AddForeignKey
ALTER TABLE "leagues" ADD CONSTRAINT "leagues_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_roles" ADD CONSTRAINT "league_roles_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_roles" ADD CONSTRAINT "league_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_players" ADD CONSTRAINT "guest_players_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_players" ADD CONSTRAINT "guest_players_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_seats" ADD CONSTRAINT "table_seats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_seats" ADD CONSTRAINT "table_seats_guest_player_id_fkey" FOREIGN KEY ("guest_player_id") REFERENCES "guest_players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_guest_player_id_fkey" FOREIGN KEY ("guest_player_id") REFERENCES "guest_players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
