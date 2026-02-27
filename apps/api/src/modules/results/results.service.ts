import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TournamentsService } from '../tournaments/tournaments.service';
import { EventsGateway } from '../realtime/events.gateway';
import { LeaderboardService } from '../leaderboard/leaderboard.service';
import {
  SubmitResultDto,
  CorrectResultDto,
  CreateDisputeDto,
  ResolveDisputeDto,
  PlayerSubmitDto,
  FinalizeResultDto,
} from './dto/submit-result.dto';

type EndedReason = 'NORMAL' | 'TIME_LIMIT';

/** Returns a unified participant ID: the userId for regular players, or 'guest:UUID' for guests */
function getSeatParticipantId(seat: { userId: string | null; guestPlayerId: string | null }): string {
  return seat.userId ?? `guest:${seat.guestPlayerId}`;
}

@Injectable()
export class ResultsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private tournamentsService: TournamentsService,
    private events: EventsGateway,
    private leaderboard: LeaderboardService,
  ) {}

  /** Organizer direct submit (official result immediately) */
  async submitResults(
    tournamentId: string,
    tableId: string,
    actorId: string,
    dto: SubmitResultDto,
  ) {
    await this.tournamentsService.assertIsOwnerOrCoOrganizer(tournamentId, actorId);

    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
      include: {
        seats: true,
        results: true,
        round: { include: { stage: true } },
      },
    });
    if (!table) throw new NotFoundException('Table not found');
    if (table.round.stage.tournamentId !== tournamentId) throw new ForbiddenException();
    if (table.round.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Round must be in progress to submit results');
    }
    if (table.results.length > 0) {
      throw new ConflictException('Results already submitted. Use the correction endpoint');
    }

    const endedReason: EndedReason = dto.endedReason ?? 'NORMAL';
    const resultsWithCalculatedPositions = this.calculateAutomaticPositions(dto.results, endedReason);
    this.validateResults(resultsWithCalculatedPositions, table.seats.map(getSeatParticipantId));
    const withVP = this.calculateVictoryPoints(resultsWithCalculatedPositions, endedReason);

    const results = await this.prisma.$transaction(async (tx) => {
      const created = await Promise.all(
        withVP.map((r: any) =>
          tx.result.create({
            data: {
              tableId,
              userId: r.participantId?.startsWith('guest:') ? null : r.participantId,
              guestPlayerId: r.participantId?.startsWith('guest:') ? r.participantId.slice(6) : null,
              position: r.position,
              catanPoints: r.catanPoints,
              victoryPoints: r.victoryPoints,
              isConfirmed: true,
            },
          }),
        ),
      );
      await tx.table.update({
        where: { id: tableId },
        data: {
          resultStatus: 'OFFICIAL',
          endedReason,
          officializedBy: actorId,
          officializedAt: new Date(),
        },
      });
      return created;
    });

    await this.audit.log({
      action: 'RESULTS_SUBMITTED',
      actorId,
      tournamentId,
      payload: { tableId, results: dto.results, endedReason },
    });

    this.events.emitResultSubmitted(tournamentId, tableId, results);
    const updatedLeaderboard = await this.leaderboard.getTournamentLeaderboard(tournamentId).catch(() => null);
    if (updatedLeaderboard) {
      this.events.emitLeaderboardUpdate(tournamentId, updatedLeaderboard);
    }

    return results;
  }

  /** Organizer correction of existing results */
  async correctResults(
    tournamentId: string,
    tableId: string,
    actorId: string,
    dto: CorrectResultDto,
  ) {
    await this.tournamentsService.assertIsOwnerOrCoOrganizer(tournamentId, actorId);

    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
      include: {
        seats: true,
        results: true,
        round: { include: { stage: true } },
      },
    });
    if (!table) throw new NotFoundException('Table not found');
    if (table.round.stage.tournamentId !== tournamentId) throw new ForbiddenException();
    if (table.round.status === 'COMPLETED') {
      throw new BadRequestException('Cannot correct results of a completed round');
    }

    const endedReason: EndedReason = dto.endedReason ?? (table.endedReason as EndedReason) ?? 'NORMAL';
    const resultsWithCalculatedPositions = this.calculateAutomaticPositions(dto.results, endedReason);
    this.validateResults(resultsWithCalculatedPositions, table.seats.map(getSeatParticipantId));
    const withVP = this.calculateVictoryPoints(resultsWithCalculatedPositions, endedReason);

    await this.prisma.$transaction(async (tx) => {
      await tx.result.deleteMany({ where: { tableId } });
      await tx.result.createMany({
        data: withVP.map((r: any) => ({
          tableId,
          userId: r.participantId?.startsWith('guest:') ? null : r.participantId,
          guestPlayerId: r.participantId?.startsWith('guest:') ? r.participantId.slice(6) : null,
          position: r.position,
          catanPoints: r.catanPoints,
          victoryPoints: r.victoryPoints,
          isConfirmed: true,
        })),
      });
      await tx.table.update({
        where: { id: tableId },
        data: {
          resultStatus: 'OFFICIAL',
          endedReason,
          officializedBy: actorId,
          officializedAt: new Date(),
        },
      });
    });

    await this.audit.log({
      action: 'RESULTS_CORRECTED',
      actorId,
      tournamentId,
      payload: { tableId, reason: dto.reason, newResults: dto.results, endedReason },
    });

    const corrected = await this.prisma.result.findMany({ where: { tableId } });
    this.events.emitResultCorrected(tournamentId, tableId, corrected);
    const updatedLeaderboard = await this.leaderboard.getTournamentLeaderboard(tournamentId).catch(() => null);
    if (updatedLeaderboard) {
      this.events.emitLeaderboardUpdate(tournamentId, updatedLeaderboard);
    }

    return corrected;
  }

  /** Seated player submits their version of the scores */
  async submitPlayerScores(
    tournamentId: string,
    tableId: string,
    actorId: string,
    dto: PlayerSubmitDto,
  ) {
    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
      include: {
        seats: true,
        round: { include: { stage: true } },
      },
    });
    if (!table) throw new NotFoundException('Table not found');
    if (table.round.stage.tournamentId !== tournamentId) throw new ForbiddenException();
    if (table.round.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Round must be in progress to submit scores');
    }
    if (['CONFIRMED', 'OFFICIAL'].includes(table.resultStatus as string)) {
      throw new BadRequestException('This table already has a confirmed result');
    }

    // Only seated users (not guests) can submit their own scores
    const seat = table.seats.find((s) => s.userId === actorId);
    if (!seat) throw new ForbiddenException('You are not seated at this table');

    const endedReason: EndedReason = dto.endedReason ?? 'NORMAL';

    // Upsert the player's submission
    await this.prisma.playerSubmission.upsert({
      where: { tableId_submittedBy: { tableId, submittedBy: actorId } },
      update: {
        payload: dto.results as any,
        endedReason,
      },
      create: {
        tableId,
        submittedBy: actorId,
        payload: dto.results as any,
        endedReason,
      },
    });

    // Try to reconcile after each submission
    await this.tryReconcile(tournamentId, tableId, table.seats.length);

    return { message: 'Scores submitted' };
  }

  /** Returns all player submissions for a table (organizers only) */
  async getSubmissions(tournamentId: string, tableId: string, actorId: string) {
    await this.tournamentsService.assertIsOrganizerOrStaff(tournamentId, actorId);

    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
      include: { round: { include: { stage: true } } },
    });
    if (!table) throw new NotFoundException('Table not found');
    if (table.round.stage.tournamentId !== tournamentId) throw new ForbiddenException();

    return this.prisma.playerSubmission.findMany({
      where: { tableId },
      include: {
        user: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Organizer finalizes/overrides the official result for a table */
  async finalizeResults(
    tournamentId: string,
    tableId: string,
    actorId: string,
    dto: FinalizeResultDto,
  ) {
    await this.tournamentsService.assertIsOwnerOrCoOrganizer(tournamentId, actorId);

    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
      include: {
        seats: true,
        round: { include: { stage: true } },
      },
    });
    if (!table) throw new NotFoundException('Table not found');
    if (table.round.stage.tournamentId !== tournamentId) throw new ForbiddenException();
    if (table.round.status === 'COMPLETED') {
      throw new BadRequestException('Cannot finalize results of a completed round');
    }

    const endedReason: EndedReason = dto.endedReason ?? 'NORMAL';
    const withPositions = this.calculateAutomaticPositions(dto.results, endedReason);
    this.validateResults(withPositions, table.seats.map(getSeatParticipantId));
    const withVP = this.calculateVictoryPoints(withPositions, endedReason);

    await this.prisma.$transaction(async (tx) => {
      await tx.result.deleteMany({ where: { tableId } });
      await tx.result.createMany({
        data: withVP.map((r: any) => ({
          tableId,
          userId: r.participantId?.startsWith('guest:') ? null : r.participantId,
          guestPlayerId: r.participantId?.startsWith('guest:') ? r.participantId.slice(6) : null,
          position: r.position,
          catanPoints: r.catanPoints,
          victoryPoints: r.victoryPoints,
          isConfirmed: true,
        })),
      });
      await tx.table.update({
        where: { id: tableId },
        data: {
          resultStatus: 'OFFICIAL',
          endedReason,
          officializedBy: actorId,
          officializedAt: new Date(),
        },
      });
    });

    await this.audit.log({
      action: 'RESULTS_OFFICIALIZED',
      actorId,
      tournamentId,
      payload: { tableId, endedReason, reason: dto.reason ?? null },
    });

    const official = await this.prisma.result.findMany({ where: { tableId } });
    this.events.emitResultOfficial(tournamentId, tableId, official);
    const updatedLeaderboard = await this.leaderboard.getTournamentLeaderboard(tournamentId).catch(() => null);
    if (updatedLeaderboard) {
      this.events.emitLeaderboardUpdate(tournamentId, updatedLeaderboard);
    }

    return official;
  }

  async createDispute(
    tournamentId: string,
    resultId: string,
    actorId: string,
    dto: CreateDisputeDto,
  ) {
    const result = await this.prisma.result.findUnique({
      where: { id: resultId },
      include: { table: { include: { round: { include: { stage: true } } } } },
    });
    if (!result) throw new NotFoundException('Result not found');
    if (result.table.round.stage.tournamentId !== tournamentId) throw new ForbiddenException();

    const seat = await this.prisma.tableSeat.findUnique({
      where: { tableId_userId: { tableId: result.tableId, userId: actorId } },
    });
    if (!seat) throw new ForbiddenException('You are not at this table');

    const dispute = await this.prisma.dispute.create({
      data: {
        resultId,
        raisedBy: actorId,
        reason: dto.reason,
      },
    });

    await this.prisma.result.update({
      where: { id: resultId },
      data: { disputeStatus: 'OPEN' },
    });

    await this.audit.log({
      action: 'DISPUTE_CREATED',
      actorId,
      tournamentId,
      payload: { resultId, reason: dto.reason },
    });

    return dispute;
  }

  async resolveDispute(
    tournamentId: string,
    disputeId: string,
    actorId: string,
    dto: ResolveDisputeDto,
  ) {
    await this.tournamentsService.assertIsOwnerOrCoOrganizer(tournamentId, actorId);

    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { result: { include: { table: { include: { round: { include: { stage: true } } } } } } },
    });
    if (!dispute) throw new NotFoundException('Dispute not found');
    if (dispute.result.table.round.stage.tournamentId !== tournamentId) throw new ForbiddenException();
    if (dispute.status === 'RESOLVED') throw new BadRequestException('Dispute already resolved');

    await this.prisma.$transaction(async (tx) => {
      await tx.dispute.update({
        where: { id: disputeId },
        data: {
          status: 'RESOLVED',
          resolvedBy: actorId,
          resolutionNote: dto.resolutionNote,
        },
      });

      await tx.result.update({
        where: { id: dispute.resultId },
        data: { disputeStatus: 'RESOLVED' },
      });

      if (dto.resolution === 'ACCEPT' && dto.correctedResults && dto.correctedResults.length > 0) {
        const tableId = dispute.result.tableId;
        const endedReason = (dispute.result.table as any).endedReason as EndedReason ?? 'NORMAL';
        const withVP = this.calculateVictoryPoints(
          this.calculateAutomaticPositions(dto.correctedResults, endedReason),
          endedReason,
        );

        await tx.result.deleteMany({ where: { tableId } });
        await tx.result.createMany({
          data: withVP.map((r: any) => ({
            tableId,
            userId: r.participantId?.startsWith('guest:') ? null : r.participantId,
            guestPlayerId: r.participantId?.startsWith('guest:') ? r.participantId.slice(6) : null,
            position: r.position,
            catanPoints: r.catanPoints,
            victoryPoints: r.victoryPoints,
            isConfirmed: true,
            disputeStatus: 'RESOLVED',
          })),
        });
        await tx.table.update({
          where: { id: tableId },
          data: {
            resultStatus: 'OFFICIAL',
            officializedBy: actorId,
            officializedAt: new Date(),
          },
        });
      }
    });

    await this.audit.log({
      action: 'DISPUTE_RESOLVED',
      actorId,
      tournamentId,
      payload: { disputeId, resolution: dto.resolution, resolutionNote: dto.resolutionNote },
    });

    return this.prisma.dispute.findUnique({ where: { id: disputeId } });
  }

  /** Attempt to auto-reconcile all player submissions for a table */
  private async tryReconcile(tournamentId: string, tableId: string, seatCount: number) {
    const submissions = await this.prisma.playerSubmission.findMany({ where: { tableId } });

    if (submissions.length < seatCount) {
      // Not everyone has submitted yet — keep PENDING
      return;
    }

    // Compare all payloads
    const firstPayload = submissions[0].payload as Array<{ participantId: string; catanPoints: number }>;
    const allMatch = submissions.every((sub) => {
      const payload = sub.payload as Array<{ participantId: string; catanPoints: number }>;
      return this.payloadsMatch(firstPayload, payload);
    });

    if (allMatch) {
      // Auto-confirm: create official results
      const endedReason = submissions[0].endedReason as EndedReason;
      const withPositions = this.calculateAutomaticPositions(firstPayload, endedReason);

      const seats = await this.prisma.tableSeat.findMany({ where: { tableId } });
      this.validateResults(withPositions, seats.map(getSeatParticipantId));
      const withVP = this.calculateVictoryPoints(withPositions, endedReason);

      await this.prisma.$transaction(async (tx) => {
        // Remove any existing results first
        await tx.result.deleteMany({ where: { tableId } });
        await tx.result.createMany({
          data: withVP.map((r: any) => ({
            tableId,
            userId: r.participantId?.startsWith('guest:') ? null : r.participantId,
            guestPlayerId: r.participantId?.startsWith('guest:') ? r.participantId.slice(6) : null,
            position: r.position,
            catanPoints: r.catanPoints,
            victoryPoints: r.victoryPoints,
            isConfirmed: true,
          })),
        });
        await tx.table.update({
          where: { id: tableId },
          data: { resultStatus: 'CONFIRMED', endedReason },
        });
      });

      const results = await this.prisma.result.findMany({ where: { tableId } });
      this.events.emitResultConfirmed(tournamentId, tableId, results);
      const updatedLeaderboard = await this.leaderboard.getTournamentLeaderboard(tournamentId).catch(() => null);
      if (updatedLeaderboard) {
        this.events.emitLeaderboardUpdate(tournamentId, updatedLeaderboard);
      }
    } else {
      // Disputed — notify organizers
      await this.prisma.table.update({
        where: { id: tableId },
        data: { resultStatus: 'DISPUTED' },
      });

      this.events.emitResultDisputed(tournamentId, tableId, {
        tableId,
        submissions: submissions.map((s) => ({
          submittedBy: s.submittedBy,
          payload: s.payload,
          endedReason: s.endedReason,
        })),
      });
    }
  }

  /** Compare two payloads for equivalence (same participants, same points) */
  private payloadsMatch(
    a: Array<{ participantId: string; catanPoints: number }>,
    b: Array<{ participantId: string; catanPoints: number }>,
  ): boolean {
    if (a.length !== b.length) return false;
    const mapA = new Map(a.map((e) => [e.participantId, e.catanPoints]));
    for (const entry of b) {
      if (mapA.get(entry.participantId) !== entry.catanPoints) return false;
    }
    return true;
  }

  private validateResults(
    results: Array<{ participantId: string; position: number }>,
    seatedPlayerIds: string[],
  ) {
    const seatedSet = new Set(seatedPlayerIds);
    const positionCounts = new Map<number, number>();

    for (const r of results) {
      if (!seatedSet.has(r.participantId)) {
        throw new BadRequestException(`Player ${r.participantId} is not seated at this table`);
      }
      positionCounts.set(r.position, (positionCounts.get(r.position) ?? 0) + 1);
    }

    // Position 1 can be shared (tie in time-limited game), but positions 2, 3, 4 must be unique
    for (const [pos, count] of positionCounts.entries()) {
      if (pos !== 1 && count > 1) {
        throw new BadRequestException(`Duplicate position ${pos}`);
      }
    }

    const submittedSet = new Set(results.map((r) => r.participantId));
    for (const id of seatedPlayerIds) {
      if (!submittedSet.has(id)) {
        throw new BadRequestException(`Missing result for player ${id}`);
      }
    }
  }

  private calculateVictoryPoints(
    results: Array<{ participantId: string; position: number; catanPoints: number }>,
    endedReason: EndedReason = 'NORMAL',
  ): Array<{ participantId: string; position: number; catanPoints: number; victoryPoints: number }> {
    const pos1Players = results.filter((r) => r.position === 1);
    const isTimeGame = endedReason === 'TIME_LIMIT' || pos1Players.every((r) => r.catanPoints < 10);

    // TIME_LIMIT special rule: multiple players tied at exactly 9 pts all get 0.5 VP
    const tiedAt9InTimeLimit =
      endedReason === 'TIME_LIMIT' &&
      pos1Players.length > 1 &&
      pos1Players.every((r) => r.catanPoints === 9);

    return results.map((r) => {
      let victoryPoints = 0;
      if (r.position === 1) {
        if (tiedAt9InTimeLimit) {
          victoryPoints = 0.5;
        } else if (!isTimeGame) {
          victoryPoints = 1;
        } else {
          victoryPoints = 0.5;
        }
      }
      return { ...r, victoryPoints };
    });
  }

  /**
   * Calculate player positions based on Catan points.
   * In TIME_LIMIT games with multiple players at max points, all share position 1.
   */
  private calculateAutomaticPositions(
    results: Array<{ participantId: string; catanPoints: number }>,
    endedReason: EndedReason = 'NORMAL',
  ): Array<{ participantId: string; position: number; catanPoints: number }> {
    const sorted = [...results].sort((a, b) => {
      if (b.catanPoints !== a.catanPoints) return b.catanPoints - a.catanPoints;
      return a.participantId.localeCompare(b.participantId);
    });

    const maxPoints = sorted[0].catanPoints;
    const isSharedFirst =
      (endedReason === 'TIME_LIMIT' || maxPoints < 10) &&
      sorted.filter((p) => p.catanPoints === maxPoints).length > 1;

    return sorted.map((r, index) => {
      let position = index + 1;
      if (isSharedFirst && r.catanPoints === maxPoints) {
        position = 1;
      }
      return { participantId: r.participantId, catanPoints: r.catanPoints, position };
    });
  }
}
