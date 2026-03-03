import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RatingService } from '../rating/rating.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { TournamentStatus } from '@catan/shared';

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['PUBLISHED', 'CANCELLED'],
  PUBLISHED: ['CHECKIN', 'CANCELLED'],
  CHECKIN: ['RUNNING', 'CANCELLED'],
  RUNNING: ['FINISHED', 'CANCELLED'],
  FINISHED: [],
  CANCELLED: [],
};

@Injectable()
export class TournamentsService {
  private readonly logger = new Logger(TournamentsService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private rating: RatingService,
  ) {}

  async create(actorId: string, dto: CreateTournamentDto) {
    const tournament = await this.prisma.$transaction(async (tx) => {
      const t = await tx.tournament.create({
        data: {
          name: dto.name,
          description: dto.description,
          location: dto.location,
          isOnline: dto.isOnline ?? false,
          startsAt: new Date(dto.startsAt),
          timezone: dto.timezone ?? 'UTC',
          maxPlayers: dto.maxPlayers,
          format: dto.format,
          tiebreakerOrder: dto.tiebreakerOrder ?? ['points', 'wins', 'opponent_strength', 'avg_position'],
          tableGenerationMode: dto.tableGenerationMode ?? 'RANDOM',
          numberOfRounds: dto.numberOfRounds ?? null,
          createdBy: actorId,
        },
      });
      await tx.tournamentRole.create({
        data: { tournamentId: t.id, userId: actorId, role: 'OWNER' },
      });
      return t;
    });

    await this.audit.log({ action: 'TOURNAMENT_CREATED', actorId, tournamentId: tournament.id });
    return tournament;
  }

  async findAll(query: {
    page?: number | string;
    limit?: number | string;
    status?: string;
    format?: string;
    isOnline?: boolean | string;
    search?: string;
  }) {
    const page = Number(query.page ?? 1);
    const limit = Math.min(Number(query.limit ?? 20), 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.format) where.format = query.format;
    if (query.isOnline !== undefined) where.isOnline = query.isOnline === 'true' || query.isOnline === true;
    if (query.search) where.name = { contains: query.search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.tournament.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startsAt: 'desc' },
        include: {
          _count: { select: { registrations: { where: { status: { in: ['APPROVED', 'CHECKED_IN'] } } } } },
          creator: { select: { id: true, displayName: true } },
        },
      }),
      this.prisma.tournament.count({ where }),
    ]);

    return {
      data: data.map((t) => ({ ...t, registeredCount: t._count.registrations })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, userId?: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, displayName: true } },
        roles: { include: { user: { select: { id: true, displayName: true } } } },
        stages: {
          include: {
            rounds: {
              include: {
                _count: { select: { tables: true } },
              },
              orderBy: { roundNumber: 'asc' },
            },
          },
          orderBy: { sequenceOrder: 'asc' },
        },
        _count: { select: { registrations: { where: { status: { in: ['APPROVED', 'CHECKED_IN'] } } } } },
      },
    });
    if (!tournament) throw new NotFoundException('Tournament not found');

    let myRegistration = null;
    let myRole = null;
    if (userId) {
      myRegistration = await this.prisma.tournamentRegistration.findUnique({
        where: { tournamentId_userId: { tournamentId: id, userId } },
      });
      const role = await this.prisma.tournamentRole.findUnique({
        where: { tournamentId_userId: { tournamentId: id, userId } },
      });
      myRole = role?.role ?? null;
    }

    return {
      ...tournament,
      registeredCount: tournament._count.registrations,
      stages: tournament.stages.map((s) => ({
        ...s,
        rounds: s.rounds.map((r) => ({
          ...r,
          tableCount: r._count.tables,
        })),
      })),
      myRegistration,
      myRole,
    };
  }

  async update(id: string, actorId: string, dto: UpdateTournamentDto) {
    const tournament = await this.findOne(id);
    await this.assertIsOwnerOrCoOrganizer(id, actorId);

    if (!['DRAFT', 'PUBLISHED'].includes(tournament.status)) {
      throw new BadRequestException('Cannot update tournament after check-in has started');
    }

    const updated = await this.prisma.tournament.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.isOnline !== undefined && { isOnline: dto.isOnline }),
        ...(dto.startsAt && { startsAt: new Date(dto.startsAt) }),
        ...(dto.timezone && { timezone: dto.timezone }),
        ...(dto.maxPlayers && { maxPlayers: dto.maxPlayers }),
        ...(dto.format && { format: dto.format }),
        ...(dto.tiebreakerOrder && { tiebreakerOrder: dto.tiebreakerOrder }),
        ...(dto.tableGenerationMode && { tableGenerationMode: dto.tableGenerationMode }),
        ...(dto.sponsorName !== undefined && { sponsorName: dto.sponsorName }),
        ...(dto.sponsorLogoUrl !== undefined && { sponsorLogoUrl: dto.sponsorLogoUrl }),
        ...(dto.sponsorUrl !== undefined && { sponsorUrl: dto.sponsorUrl }),
      },
    });

    await this.audit.log({ action: 'TOURNAMENT_UPDATED', actorId, tournamentId: id });
    return updated;
  }

  async transition(id: string, targetStatus: string, actorId: string) {
    const tournament = await this.findOne(id);
    await this.assertIsOwnerOrCoOrganizer(id, actorId);

    const allowed = VALID_TRANSITIONS[tournament.status] ?? [];
    if (!allowed.includes(targetStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${tournament.status} to ${targetStatus}`,
      );
    }

    const updated = await this.prisma.tournament.update({
      where: { id },
      data: { status: targetStatus as TournamentStatus },
    });

    await this.audit.log({
      action: `TOURNAMENT_${targetStatus}`,
      actorId,
      tournamentId: id,
      payload: { from: tournament.status, to: targetStatus },
    });

    if (targetStatus === 'FINISHED') {
      this.rating.processTournamentRatings(id).catch((err) => {
        this.logger.error(`Failed to process ratings for tournament ${id}: ${err.message}`);
      });
    }

    return updated;
  }

  /** Only OWNER can perform ownership-level actions (manage co-organizers) */
  async assertIsOwner(tournamentId: string, userId: string) {
    const role = await this.prisma.tournamentRole.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
    });
    if (!role || role.role !== 'OWNER') {
      throw new ForbiddenException('Only the tournament owner can perform this action');
    }
  }

  /** OWNER or CO_ORGANIZER can manage tournament settings and operations */
  async assertIsOwnerOrCoOrganizer(tournamentId: string, userId: string) {
    const role = await this.prisma.tournamentRole.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
    });
    if (!role || !['OWNER', 'CO_ORGANIZER'].includes(role.role)) {
      throw new ForbiddenException('Only organizers can perform this action');
    }
  }

  /** Any role (OWNER, CO_ORGANIZER, STAFF) has tournament access */
  async assertIsOrganizerOrStaff(tournamentId: string, userId: string) {
    const role = await this.prisma.tournamentRole.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
    });
    if (!role) {
      throw new ForbiddenException('You do not have a staff role in this tournament');
    }
  }

  async addCoOrganizer(tournamentId: string, ownerId: string, targetEmail: string) {
    await this.assertIsOwner(tournamentId, ownerId);

    const user = await this.prisma.user.findUnique({ where: { email: targetEmail } });
    if (!user) throw new NotFoundException('User not found');

    // Prevent adding another OWNER as CO_ORGANIZER (must not already be OWNER)
    const existing = await this.prisma.tournamentRole.findUnique({
      where: { tournamentId_userId: { tournamentId, userId: user.id } },
    });
    if (existing?.role === 'OWNER') {
      throw new ConflictException('This user is already the tournament owner');
    }

    await this.prisma.tournamentRole.upsert({
      where: { tournamentId_userId: { tournamentId, userId: user.id } },
      update: { role: 'CO_ORGANIZER' },
      create: { tournamentId, userId: user.id, role: 'CO_ORGANIZER' },
    });

    await this.audit.log({
      action: 'CO_ORGANIZER_ADDED',
      actorId: ownerId,
      tournamentId,
      payload: { addedUserId: user.id, email: targetEmail },
    });

    return { message: 'Co-organizer added', userId: user.id };
  }

  async removeCoOrganizer(tournamentId: string, ownerId: string, targetUserId: string) {
    await this.assertIsOwner(tournamentId, ownerId);

    const role = await this.prisma.tournamentRole.findUnique({
      where: { tournamentId_userId: { tournamentId, userId: targetUserId } },
    });
    if (!role) throw new NotFoundException('Role not found');
    if (role.role === 'OWNER') throw new ForbiddenException('Cannot remove the tournament owner');
    if (role.role !== 'CO_ORGANIZER') throw new BadRequestException('User is not a co-organizer');

    await this.prisma.tournamentRole.delete({
      where: { tournamentId_userId: { tournamentId, userId: targetUserId } },
    });

    await this.audit.log({
      action: 'CO_ORGANIZER_REMOVED',
      actorId: ownerId,
      tournamentId,
      payload: { removedUserId: targetUserId },
    });

    return { message: 'Co-organizer removed' };
  }

  async listOrganizers(tournamentId: string) {
    const tournament = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw new NotFoundException('Tournament not found');

    return this.prisma.tournamentRole.findMany({
      where: { tournamentId, role: { in: ['OWNER', 'CO_ORGANIZER'] } },
      include: {
        user: { select: { id: true, displayName: true, email: true, alias: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async inviteStaff(tournamentId: string, actorId: string, email: string) {
    await this.assertIsOwner(tournamentId, actorId);
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.tournamentRole.upsert({
      where: { tournamentId_userId: { tournamentId, userId: user.id } },
      update: {},
      create: { tournamentId, userId: user.id, role: 'STAFF' },
    });

    await this.audit.log({
      action: 'STAFF_INVITED',
      actorId,
      tournamentId,
      payload: { invitedUserId: user.id },
    });

    return { message: 'Staff invited' };
  }
}
