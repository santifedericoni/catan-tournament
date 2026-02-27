import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EloCalculator } from './elo.calculator';

@Injectable()
export class RatingService {
  private readonly logger = new Logger(RatingService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Calculate and apply Elo updates for all players in a finished tournament.
   * Called once when tournament transitions to FINISHED.
   */
  async processTournamentRatings(tournamentId: string): Promise<void> {
    const tables = await this.prisma.table.findMany({
      where: {
        round: {
          stage: { tournamentId },
          status: 'COMPLETED',
        },
      },
      include: {
        results: {
          where: { isConfirmed: true },
          include: {
            user: {
              include: { stats: true },
            },
          },
        },
      },
    });

    if (tables.length === 0) {
      this.logger.warn(`No completed tables found for tournament ${tournamentId}`);
      return;
    }

    // Aggregate all Elo deltas per user across all tables
    const userDeltas = new Map<string, { totalDelta: number; oldRating: number; gamesPlayed: number }>();

    for (const table of tables) {
      if (table.results.length < 2) continue;

      // Guests don't accumulate ELO — skip results without a real user
      const playerResults = table.results
        .filter((r) => r.userId !== null && r.user !== null)
        .map((r) => ({
          userId: r.userId!,
          position: r.position,
          currentRating: r.user!.stats?.eloRating ?? 1000,
          gamesPlayed: r.user!.stats?.tournamentsPlayed ?? 0,
        }));

      const updates = EloCalculator.calculateUpdates(playerResults);

      for (const update of updates) {
        const existing = userDeltas.get(update.userId);
        if (existing) {
          existing.totalDelta += update.delta;
        } else {
          userDeltas.set(update.userId, {
            totalDelta: update.delta,
            oldRating: update.oldRating,
            gamesPlayed: playerResults.find((p) => p.userId === update.userId)?.gamesPlayed ?? 0,
          });
        }
      }
    }

    // Apply updates in a transaction
    await this.prisma.$transaction(async (tx) => {
      for (const [userId, data] of userDeltas.entries()) {
        const currentStats = await tx.userStats.findUnique({ where: { userId } });
        const oldRating = currentStats?.eloRating ?? 1000;
        const newRating = Math.max(100, oldRating + data.totalDelta);

        // Count wins in this tournament
        const wins = await tx.result.count({
          where: {
            userId,
            position: 1,
            isConfirmed: true,
            table: { round: { stage: { tournamentId } } },
          },
        });

        const totalGames = await tx.result.count({
          where: {
            userId,
            isConfirmed: true,
            table: { round: { stage: { tournamentId } } },
          },
        });

        const avgPosAggregate = await tx.result.aggregate({
          where: {
            userId,
            isConfirmed: true,
            table: { round: { stage: { tournamentId } } },
          },
          _avg: { position: true },
        });

        await tx.userStats.upsert({
          where: { userId },
          update: {
            eloRating: newRating,
            tournamentsPlayed: { increment: 1 },
            totalWins: { increment: wins },
            avgPosition: avgPosAggregate._avg.position ?? undefined,
          },
          create: {
            userId,
            eloRating: newRating,
            tournamentsPlayed: 1,
            totalWins: wins,
            avgPosition: avgPosAggregate._avg.position,
          },
        });

        await tx.ratingHistory.create({
          data: {
            userId,
            tournamentId,
            oldRating,
            newRating,
            delta: data.totalDelta,
          },
        });
      }
    });

    this.logger.log(`Processed ratings for ${userDeltas.size} players in tournament ${tournamentId}`);
  }
}
