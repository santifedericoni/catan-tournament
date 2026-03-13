import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  alias: string | null;
  country: string | null;
  eloRating: number;
  isGuest: boolean;
  totalCatanPoints: number;
  victoryPoints: number;
  fullWins: number;
  secondPlaces: number;
  thirdPlaces: number;
  gamesPlayed: number;
  avgPosition: number | null;
  avgPointShare: number; // average of (myPoints / tableTotalPoints) across all games
  isEliminated: boolean;
  qualifiedToNextStage: boolean;
}

type TiebreakerKey = 'victory_points' | 'catan_points' | 'point_share' | 'second_places' | 'third_places' | 'avg_position';

@Injectable()
export class LeaderboardService {
  constructor(private prisma: PrismaService) { }

  async getTournamentLeaderboard(tournamentId: string): Promise<LeaderboardEntry[]> {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });
    if (!tournament) throw new NotFoundException('Tournament not found');

    const tiebreakerOrder = (tournament.tiebreakerOrder as string[]) ?? [
      'victory_points',
      'catan_points',
      'point_share',
      'second_places',
      'third_places',
      'avg_position',
    ];

    // Get all confirmed/official results for this tournament
    const results = await this.prisma.result.findMany({
      where: {
        isConfirmed: true,
        table: {
          resultStatus: { in: ['CONFIRMED', 'OFFICIAL'] },
          round: { stage: { tournamentId } },
        },
      },
      include: {
        user: {
          include: { stats: { select: { eloRating: true } } },
        },
        guestPlayer: { select: { id: true, name: true } },
        table: {
          select: { id: true },
        },
      },
    });

    // Build per-player aggregates
    const playerMap = new Map<string, {
      userId: string;
      displayName: string;
      alias: string | null;
      country: string | null;
      eloRating: number;
      isGuest: boolean;
      totalCatanPoints: number;
      victoryPoints: number;
      fullWins: number;
      secondPlaces: number;
      thirdPlaces: number;
      gamesPlayed: number;
      positions: number[];
      tableResults: Map<string, { myPoints: number; tableTotal: number }>;
    }>();

    // First pass: compute total points per table
    const tableTotalsMap = new Map<string, number>();
    for (const result of results) {
      if (result.userId === null && result.guestPlayerId === null) continue;
      const tableId = result.table.id;
      tableTotalsMap.set(tableId, (tableTotalsMap.get(tableId) ?? 0) + result.catanPoints);
    }

    for (const result of results) {
      if (result.userId === null && result.guestPlayerId === null) continue;

      const participantId = result.userId ?? `guest:${result.guestPlayerId}`;
      const isGuest = result.userId === null;
      const displayName = isGuest
        ? `${result.guestPlayer?.name ?? 'Invitado'} (invitado)`
        : result.user!.displayName;

      const existing = playerMap.get(participantId) ?? {
        userId: participantId,
        displayName,
        alias: isGuest ? null : result.user!.alias,
        country: isGuest ? null : result.user!.country,
        eloRating: isGuest ? 0 : (result.user!.stats?.eloRating ?? 1000),
        isGuest,
        totalCatanPoints: 0,
        victoryPoints: 0,
        fullWins: 0,
        secondPlaces: 0,
        thirdPlaces: 0,
        gamesPlayed: 0,
        positions: [],
        tableResults: new Map<string, { myPoints: number; tableTotal: number }>(),
      };

      existing.totalCatanPoints += result.catanPoints;
      existing.victoryPoints += result.victoryPoints;
      existing.gamesPlayed += 1;
      existing.positions.push(result.position);
      if (result.victoryPoints === 1) existing.fullWins += 1;
      if (result.position === 2) existing.secondPlaces += 1;
      if (result.position === 3) existing.thirdPlaces += 1;

      const tableId = result.table.id;
      const tableTotal = tableTotalsMap.get(tableId) ?? result.catanPoints;
      existing.tableResults.set(tableId, {
        myPoints: result.catanPoints,
        tableTotal,
      });

      playerMap.set(participantId, existing);
    }

    const entries: Omit<LeaderboardEntry, 'rank'>[] = Array.from(playerMap.values()).map((p) => {
      let pointShareSum = 0;
      for (const { myPoints, tableTotal } of p.tableResults.values()) {
        pointShareSum += tableTotal > 0 ? myPoints / tableTotal : 0;
      }
      const avgPointShare = p.tableResults.size > 0 ? pointShareSum / p.tableResults.size : 0;

      return {
        userId: p.userId,
        displayName: p.displayName,
        alias: p.alias,
        country: p.country,
        eloRating: p.eloRating,
        isGuest: p.isGuest,
        totalCatanPoints: p.totalCatanPoints,
        victoryPoints: p.victoryPoints,
        fullWins: p.fullWins,
        secondPlaces: p.secondPlaces,
        thirdPlaces: p.thirdPlaces,
        gamesPlayed: p.gamesPlayed,
        avgPosition:
          p.positions.length > 0
            ? p.positions.reduce((a, b) => a + b, 0) / p.positions.length
            : null,
        avgPointShare,
        isEliminated: false,
        qualifiedToNextStage: false,
      };
    });

    const sorted = this.applyTiebreakers(entries, tiebreakerOrder as TiebreakerKey[]);

    return sorted.map((entry, index) => ({ ...entry, rank: index + 1 }));
  }

  async getBracket(tournamentId: string) {
    const stages = await this.prisma.stage.findMany({
      where: { tournamentId, type: { in: ['SEMIFINAL', 'FINAL'] } },
      include: {
        rounds: {
          include: {
            tables: {
              include: {
                seats: {
                  include: {
                    user: { select: { id: true, displayName: true, alias: true } },
                  },
                },
                results: true,
              },
            },
          },
        },
      },
      orderBy: { sequenceOrder: 'asc' },
    });

    return stages;
  }

  /**
   * Apply configurable multi-criterion tiebreaker sort.
   * Earlier criteria in the array take precedence.
   */
  applyTiebreakers(
    entries: Omit<LeaderboardEntry, 'rank'>[],
    tiebreakerOrder: string[],
  ): Omit<LeaderboardEntry, 'rank'>[] {
    const order = [...tiebreakerOrder];
    if (!order.includes('victory_points') && !order.includes('points')) {
      order.unshift('victory_points');
    }

    return [...entries].sort((a, b) => {
      for (const criterion of order) {
        let diff = 0;
        switch (criterion) {
          case 'victory_points':
          case 'points':
            diff = b.victoryPoints - a.victoryPoints;
            break;
          case 'catan_points':
            diff = b.totalCatanPoints - a.totalCatanPoints;
            break;
          case 'point_share':
            diff = b.avgPointShare - a.avgPointShare;
            break;
          case 'second_places':
            diff = b.secondPlaces - a.secondPlaces;
            break;
          case 'third_places':
            diff = b.thirdPlaces - a.thirdPlaces;
            break;
          case 'avg_position':
            if (a.avgPosition !== null && b.avgPosition !== null) {
              diff = a.avgPosition - b.avgPosition;
            }
            break;
        }
        if (Math.abs(diff) > 0.0001) return diff > 0 ? 1 : -1;
      }
      return 0;
    });
  }

  /**
   * Determine which players advance to the next stage.
   * Returns ordered list of advancing player IDs.
   */
  async determineAdvancing(
    tournamentId: string,
    count: number,
  ): Promise<string[]> {
    const leaderboard = await this.getTournamentLeaderboard(tournamentId);
    return leaderboard.slice(0, count).map((e) => e.userId);
  }
}
