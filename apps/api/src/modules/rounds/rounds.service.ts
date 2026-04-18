import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TournamentsService } from '../tournaments/tournaments.service';
import { TableGenerationService, MatchupPair } from './table-generation.service';
import { EventsGateway } from '../realtime/events.gateway';
import { LeaderboardService } from '../leaderboard/leaderboard.service';
import { TableGenerationMode } from '@catan/shared';
import { ManualAssignmentDto } from './dto/create-round.dto';

@Injectable()
export class RoundsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private tournamentsService: TournamentsService,
    private tableGeneration: TableGenerationService,
    private events: EventsGateway,
    private leaderboard: LeaderboardService,
  ) { }

  async createRound(tournamentId: string, stageId: string, actorId: string) {
    await this.tournamentsService.assertIsOrganizerOrStaff(tournamentId, actorId);

    const stage = await this.prisma.stage.findUnique({
      where: { id: stageId },
      include: { rounds: true },
    });
    if (!stage) throw new NotFoundException('Stage not found');
    if (stage.tournamentId !== tournamentId) throw new ForbiddenException('Stage not in tournament');

    const existingInProgress = stage.rounds.find((r) => r.status !== 'COMPLETED');
    if (existingInProgress) {
      throw new BadRequestException('Close the current round before creating a new one');
    }

    const roundNumber = stage.rounds.length + 1;

    const round = await this.prisma.round.create({
      data: { stageId, roundNumber },
    });

    await this.audit.log({
      action: 'ROUND_CREATED',
      actorId,
      tournamentId,
      payload: { stageId, roundNumber },
    });

    return round;
  }

  async generateTables(
    tournamentId: string,
    roundId: string,
    mode: TableGenerationMode,
    actorId: string,
    manualAssignment?: ManualAssignmentDto,
  ) {
    await this.tournamentsService.assertIsOrganizerOrStaff(tournamentId, actorId);

    const round = await this.prisma.round.findUnique({
      where: { id: roundId },
      include: { stage: true, tables: true },
    });
    if (!round) throw new NotFoundException('Round not found');
    if (round.stage.tournamentId !== tournamentId) throw new ForbiddenException();
    if (round.tables.length > 0) {
      // Clear existing tables before regenerating
      await this.prisma.tableSeat.deleteMany({
        where: { table: { roundId } },
      });
      await this.prisma.table.deleteMany({ where: { roundId } });
      await this.prisma.matchupHistory.deleteMany({ where: { roundId } });
    }

    // Get approved/checked-in players (including guest players)
    const registrations = await this.prisma.tournamentRegistration.findMany({
      where: {
        tournamentId,
        status: { in: ['APPROVED', 'CHECKED_IN'] },
      },
      select: { userId: true, guestPlayerId: true },
    });
    // Use 'guest:UUID' prefix to distinguish guest players from regular users
    const playerIds = registrations.map((r) => r.userId ?? `guest:${r.guestPlayerId}`);

    if (playerIds.length < 3) {
      throw new BadRequestException('Need at least 3 players to generate tables');
    }

    let tableSets: string[][];

    if (round.stage.type === 'SEMIFINAL') {
      // Special logic for Semifinals: Top 16 players
      const advancingIds = await this.leaderboard.determineAdvancing(tournamentId, 16);
      if (advancingIds.length < 16) {
        throw new BadRequestException(`Need 16 qualified players for Semifinal, only found ${advancingIds.length}`);
      }

      // Serpentine distribution:
      // Table 1: 1, 8, 9, 16
      // Table 2: 2, 7, 10, 15
      // Table 3: 3, 6, 11, 14
      // Table 4: 4, 5, 12, 13
      tableSets = [[], [], [], []];
      const distribution = [
        [0, 7, 8, 15],
        [1, 6, 9, 14],
        [2, 5, 10, 13],
        [3, 4, 11, 12],
      ];

      for (let t = 0; t < 4; t++) {
        tableSets[t] = distribution[t].map((index) => advancingIds[index]);
      }
    } else if (round.stage.type === 'FINAL') {
      // Special logic for Final: Top 4 players
      const advancingIds = await this.leaderboard.determineAdvancing(tournamentId, 4);
      if (advancingIds.length < 4) {
        throw new BadRequestException(`Need 4 qualified players for Final, only found ${advancingIds.length}`);
      }
      tableSets = [advancingIds];
    } else if (mode === TableGenerationMode.MANUAL) {
      if (!manualAssignment?.tables) {
        throw new BadRequestException('Manual assignment required (tables MUST be an array)');
      }
      tableSets = manualAssignment.tables.map((t) => t.playerIds);
    } else if (mode === TableGenerationMode.BALANCED) {
      const [pointsMap, fullMatchupHistory] = await Promise.all([
        this.getPlayerPoints(tournamentId, playerIds),
        this.getFullMatchupHistory(tournamentId),
      ]);
      const playersWithPoints = playerIds.map((id) => ({
        id,
        currentPoints: pointsMap.get(id) ?? 0,
      }));
      tableSets = this.tableGeneration.generateBalanced(playersWithPoints, fullMatchupHistory);
    } else {
      // RANDOM (default)
      const fullMatchupHistory = await this.getFullMatchupHistory(tournamentId);
      tableSets = this.tableGeneration.generateRandom(playerIds, fullMatchupHistory);
    }

    // Persist tables and seats in a transaction
    const createdTables = await this.prisma.$transaction(async (tx) => {
      const tables = [];
      for (let i = 0; i < tableSets.length; i++) {
        const seats = tableSets[i];
        const table = await tx.table.create({
          data: {
            roundId,
            tableNumber: i + 1,
            seats: {
              create: seats.map((participantId, seatIdx) => ({
                // Distinguish guest players (prefixed 'guest:UUID') from real users
                ...(participantId.startsWith('guest:')
                  ? { guestPlayerId: participantId.slice(6) }
                  : { userId: participantId }),
                seatNumber: seatIdx + 1,
              })),
            },
          },
          include: {
            seats: {
              include: {
                user: { select: { id: true, displayName: true, alias: true } },
                guestPlayer: { select: { id: true, name: true } },
              },
            },
          },
        });
        tables.push(table);
      }

      // Record matchup history in DB for user-user pairs (schema constraint: FK to User)
      // Guest pairs are reconstructed from TableSeat records on the next call to getFullMatchupHistory
      const allMatchups = this.tableGeneration.extractMatchups(tableSets);
      const userUserMatchups = allMatchups.filter(
        (m) => !m.participantIdA.startsWith('guest:') && !m.participantIdB.startsWith('guest:'),
      );
      if (userUserMatchups.length > 0) {
        await tx.matchupHistory.createMany({
          data: userUserMatchups.map((m) => ({
            tournamentId,
            roundId,
            userIdA: m.participantIdA,
            userIdB: m.participantIdB,
          })),
        });
      }

      return tables;
    });

    await this.audit.log({
      action: 'TABLES_GENERATED',
      actorId,
      tournamentId,
      payload: { roundId, mode, tableCount: createdTables.length },
    });

    return createdTables;
  }

  async startRound(tournamentId: string, roundId: string, actorId: string) {
    await this.tournamentsService.assertIsOrganizerOrStaff(tournamentId, actorId);

    const round = await this.prisma.round.findUnique({
      where: { id: roundId },
      include: { tables: { include: { seats: true } } },
    });
    if (!round) throw new NotFoundException('Round not found');
    if (round.status !== 'PENDING') throw new BadRequestException('Round already started');
    if (round.tables.length === 0) throw new BadRequestException('Generate tables before starting the round');

    const updated = await this.prisma.round.update({
      where: { id: roundId },
      data: { status: 'IN_PROGRESS', startedAt: new Date() },
    });

    await this.audit.log({
      action: 'ROUND_STARTED',
      actorId,
      tournamentId,
      payload: { roundId, roundNumber: round.roundNumber },
    });

    this.events.emitRoundStarted(tournamentId, updated);

    return updated;
  }

  async closeRound(tournamentId: string, roundId: string, actorId: string) {
    await this.tournamentsService.assertIsOrganizerOrStaff(tournamentId, actorId);

    const round = await this.prisma.round.findUnique({
      where: { id: roundId },
      include: {
        tables: {
          include: {
            results: true,
            seats: true,
          },
        },
      },
    });
    if (!round) throw new NotFoundException('Round not found');
    if (round.status !== 'IN_PROGRESS') throw new BadRequestException('Round is not in progress');

    // Check all tables have confirmed results
    for (const table of round.tables) {
      const seatCount = table.seats.length;
      const confirmedResults = table.results.filter((r) => r.isConfirmed);
      if (confirmedResults.length < seatCount) {
        throw new BadRequestException(
          `Table ${table.tableNumber} does not have confirmed results for all players`,
        );
      }
      const openDisputes = table.results.filter(
        (r) => r.disputeStatus === 'OPEN',
      );
      if (openDisputes.length > 0) {
        throw new BadRequestException(`Table ${table.tableNumber} has unresolved disputes`);
      }
    }

    const updated = await this.prisma.round.update({
      where: { id: roundId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    await this.audit.log({
      action: 'ROUND_CLOSED',
      actorId,
      tournamentId,
      payload: { roundId, roundNumber: round.roundNumber },
    });

    this.events.emitRoundClosed(tournamentId, updated);

    return updated;
  }

  async getRound(tournamentId: string, roundId: string) {
    const round = await this.prisma.round.findUnique({
      where: { id: roundId },
      include: {
        stage: true,
        tables: {
          include: {
            seats: {
              include: {
                user: { select: { id: true, displayName: true, alias: true } },
                guestPlayer: { select: { id: true, name: true } },
              },
            },
            results: true,
          },
          orderBy: { tableNumber: 'asc' },
        },
      },
    });
    if (!round) throw new NotFoundException('Round not found');
    if (round.stage.tournamentId !== tournamentId) throw new ForbiddenException();
    return round;
  }

  async createStage(tournamentId: string, actorId: string, type: string, config?: Record<string, unknown>) {
    await this.tournamentsService.assertIsOwnerOrCoOrganizer(tournamentId, actorId);

    const existingStages = await this.prisma.stage.findMany({
      where: { tournamentId },
      include: { rounds: true },
    });

    // Prevent duplicate stage types
    if (existingStages.some((s) => s.type === type)) {
      throw new BadRequestException(`A ${type} stage already exists for this tournament`);
    }

    // SEMIFINAL requires a completed QUALIFIER stage
    if (type === 'SEMIFINAL') {
      const qualifier = existingStages.find((s) => s.type === 'QUALIFIER');
      if (!qualifier) {
        throw new BadRequestException('A QUALIFIER stage must exist before creating a SEMIFINAL stage');
      }
      const allCompleted = qualifier.rounds.length > 0 && qualifier.rounds.every((r) => r.status === 'COMPLETED');
      if (!allCompleted) {
        throw new BadRequestException('All QUALIFIER rounds must be completed before creating a SEMIFINAL stage');
      }
      const advancingCount = await this.leaderboard.determineAdvancing(tournamentId, 16).then((ids) => ids.length);
      if (advancingCount < 16) {
        throw new BadRequestException(`Need at least 16 qualified players for SEMIFINAL, only found ${advancingCount}`);
      }
    }

    // FINAL requires a completed SEMIFINAL stage
    if (type === 'FINAL') {
      const semifinal = existingStages.find((s) => s.type === 'SEMIFINAL');
      if (!semifinal) {
        throw new BadRequestException('A SEMIFINAL stage must exist before creating a FINAL stage');
      }
      const allCompleted = semifinal.rounds.length > 0 && semifinal.rounds.every((r) => r.status === 'COMPLETED');
      if (!allCompleted) {
        throw new BadRequestException('All SEMIFINAL rounds must be completed before creating a FINAL stage');
      }
      const advancingCount = await this.leaderboard.determineAdvancing(tournamentId, 4).then((ids) => ids.length);
      if (advancingCount < 4) {
        throw new BadRequestException(`Need at least 4 qualified players for FINAL, only found ${advancingCount}`);
      }
    }

    const sequenceOrder = existingStages.length + 1;

    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { numberOfRounds: true, format: true },
    });

    const stage = await this.prisma.stage.create({
      data: {
        tournamentId,
        type: type as 'QUALIFIER' | 'SEMIFINAL' | 'FINAL',
        sequenceOrder,
        config: (config ?? {}) as object,
      },
    });

    // Auto-create rounds for QUALIFIER stages when numberOfRounds is configured
    const shouldAutoCreate =
      type === 'QUALIFIER' &&
      tournament?.numberOfRounds &&
      tournament.numberOfRounds > 0;

    if (shouldAutoCreate) {
      for (let i = 1; i <= tournament!.numberOfRounds!; i++) {
        await this.prisma.round.create({
          data: { stageId: stage.id, roundNumber: i },
        });
      }
    }

    await this.audit.log({
      action: 'STAGE_CREATED',
      actorId,
      tournamentId,
      payload: { stageId: stage.id, type, sequenceOrder, roundsCreated: shouldAutoCreate ? tournament!.numberOfRounds : 0 },
    });

    return this.prisma.stage.findUnique({
      where: { id: stage.id },
      include: { rounds: { orderBy: { roundNumber: 'asc' } } },
    });
  }

  async deleteRound(tournamentId: string, roundId: string, actorId: string) {
    await this.tournamentsService.assertIsOrganizerOrStaff(tournamentId, actorId);

    const round = await this.prisma.round.findUnique({
      where: { id: roundId },
      include: {
        tables: {
          include: { results: true },
        },
      },
    });

    if (!round) throw new NotFoundException('Round not found');

    const hasResults = round.tables.some((t) => t.results.length > 0);
    if (hasResults) {
      throw new BadRequestException('Cannot delete a round that already has results');
    }

    await this.prisma.round.delete({ where: { id: roundId } });

    await this.audit.log({
      action: 'ROUND_DELETED',
      actorId,
      tournamentId,
      payload: { roundId, roundNumber: round.roundNumber },
    });
  }

  async deleteStage(tournamentId: string, stageId: string, actorId: string) {
    await this.tournamentsService.assertIsOwnerOrCoOrganizer(tournamentId, actorId);

    const stage = await this.prisma.stage.findUnique({
      where: { id: stageId },
      include: {
        rounds: {
          include: {
            tables: {
              include: { results: true },
            },
          },
        },
      },
    });

    if (!stage) throw new NotFoundException('Stage not found');

    const hasResults = stage.rounds.some((r) =>
      r.tables.some((t) => t.results.length > 0),
    );
    if (hasResults) {
      throw new BadRequestException('Cannot delete a stage that has rounds with results');
    }

    await this.prisma.stage.delete({ where: { id: stageId } });

    await this.audit.log({
      action: 'STAGE_DELETED',
      actorId,
      tournamentId,
      payload: { stageId, type: stage.type },
    });
  }

  /**
   * Reconstruct the full matchup history for a tournament, including guest players,
   * by reading completed TableSeat records grouped by table.
   * User-user pairs are stored in MatchupHistory; guest pairs are derived from seats.
   */
  private async getFullMatchupHistory(tournamentId: string): Promise<MatchupPair[]> {
    const tables = await this.prisma.table.findMany({
      where: { round: { stage: { tournamentId } } },
      select: {
        seats: { select: { userId: true, guestPlayerId: true } },
      },
    });

    const pairs: MatchupPair[] = [];
    for (const table of tables) {
      const participantIds = table.seats.map(
        (s) => s.userId ?? `guest:${s.guestPlayerId}`,
      );
      for (let i = 0; i < participantIds.length; i++) {
        for (let j = i + 1; j < participantIds.length; j++) {
          pairs.push({ participantIdA: participantIds[i], participantIdB: participantIds[j] });
        }
      }
    }
    return pairs;
  }

  private async getPlayerPoints(
    tournamentId: string,
    playerIds: string[],
  ): Promise<Map<string, number>> {
    const userIds = playerIds.filter((id) => !id.startsWith('guest:'));
    const guestIds = playerIds.filter((id) => id.startsWith('guest:')).map((id) => id.slice(6));

    const [userResults, guestResults] = await Promise.all([
      userIds.length > 0
        ? this.prisma.result.findMany({
            where: {
              userId: { in: userIds },
              isConfirmed: true,
              table: { round: { stage: { tournamentId }, status: 'COMPLETED' } },
            },
            select: { userId: true, victoryPoints: true },
          })
        : Promise.resolve([]),
      guestIds.length > 0
        ? this.prisma.result.findMany({
            where: {
              guestPlayerId: { in: guestIds },
              isConfirmed: true,
              table: { round: { stage: { tournamentId }, status: 'COMPLETED' } },
            },
            select: { guestPlayerId: true, victoryPoints: true },
          })
        : Promise.resolve([]),
    ]);

    const pointsMap = new Map<string, number>();
    for (const r of userResults) {
      if (r.userId) pointsMap.set(r.userId, (pointsMap.get(r.userId) ?? 0) + r.victoryPoints);
    }
    for (const r of guestResults) {
      if (r.guestPlayerId) {
        const key = `guest:${r.guestPlayerId}`;
        pointsMap.set(key, (pointsMap.get(key) ?? 0) + r.victoryPoints);
      }
    }
    return pointsMap;
  }
}
