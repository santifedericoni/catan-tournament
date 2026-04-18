import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LeaderboardService } from '../leaderboard/leaderboard.service';
import { CreateLeagueDto } from './dto/create-league.dto';
import { UpdateLeagueDto } from './dto/update-league.dto';
import { CreateLeagueTournamentDto } from './dto/create-league-tournament.dto';

@Injectable()
export class LeaguesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private leaderboard: LeaderboardService,
  ) {}

  async create(actorId: string, dto: CreateLeagueDto) {
    const league = await this.prisma.$transaction(async (tx) => {
      const l = await tx.league.create({
        data: {
          name: dto.name,
          description: dto.description,
          format: dto.format,
          tiebreakerOrder: dto.tiebreakerOrder ?? ['victory_points', 'catan_points', 'point_share', 'second_places', 'third_places', 'avg_position'],
          tableGenerationMode: dto.tableGenerationMode ?? 'RANDOM',
          createdBy: actorId,
        },
      });
      await tx.leagueRole.create({
        data: { leagueId: l.id, userId: actorId, role: 'OWNER' },
      });
      return l;
    });

    await this.audit.log({ action: 'LEAGUE_CREATED', actorId, payload: { leagueId: league.id } });
    return league;
  }

  async findAll(query: { page?: number | string; limit?: number | string; search?: string }) {
    const page = Number(query.page ?? 1);
    const limit = Math.min(Number(query.limit ?? 20), 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.search) where.name = { contains: query.search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.league.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: { select: { id: true, displayName: true } },
          _count: { select: { tournaments: true } },
        },
      }),
      this.prisma.league.count({ where }),
    ]);

    return {
      data: data.map((l) => ({ ...l, tournamentCount: l._count.tournaments })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, userId?: string) {
    const league = await this.prisma.league.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, displayName: true } },
        roles: { include: { user: { select: { id: true, displayName: true } } } },
        tournaments: {
          orderBy: { startsAt: 'asc' },
          include: {
            _count: { select: { registrations: { where: { status: { in: ['APPROVED', 'CHECKED_IN'] } } } } },
          },
        },
      },
    });
    if (!league) throw new NotFoundException('League not found');

    let myRole: string | null = null;
    if (userId) {
      const role = await this.prisma.leagueRole.findUnique({
        where: { leagueId_userId: { leagueId: id, userId } },
      });
      myRole = role?.role ?? null;
    }

    return {
      ...league,
      tournaments: league.tournaments.map((t) => ({ ...t, registeredCount: t._count.registrations })),
      myRole,
    };
  }

  async update(id: string, actorId: string, dto: UpdateLeagueDto) {
    await this.assertIsOwnerOrCoOrganizer(id, actorId);
    const league = await this.prisma.league.findUnique({ where: { id } });
    if (!league) throw new NotFoundException('League not found');

    const updated = await this.prisma.league.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.format && { format: dto.format }),
        ...(dto.tiebreakerOrder && { tiebreakerOrder: dto.tiebreakerOrder }),
        ...(dto.tableGenerationMode && { tableGenerationMode: dto.tableGenerationMode }),
      },
    });

    await this.audit.log({ action: 'LEAGUE_UPDATED', actorId, payload: { leagueId: id } });
    return updated;
  }

  async createTournament(leagueId: string, actorId: string, dto: CreateLeagueTournamentDto) {
    await this.assertIsOwnerOrCoOrganizer(leagueId, actorId);

    const league = await this.prisma.league.findUnique({ where: { id: leagueId } });
    if (!league) throw new NotFoundException('League not found');

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
          format: league.format,
          tiebreakerOrder: league.tiebreakerOrder as string[],
          tableGenerationMode: league.tableGenerationMode,
          leagueId: league.id,
          createdBy: actorId,
        },
      });
      await tx.tournamentRole.create({
        data: { tournamentId: t.id, userId: actorId, role: 'OWNER' },
      });
      return t;
    });

    await this.audit.log({
      action: 'LEAGUE_TOURNAMENT_CREATED',
      actorId,
      tournamentId: tournament.id,
      payload: { leagueId },
    });

    return tournament;
  }

  async getLeaderboard(leagueId: string) {
    const league = await this.prisma.league.findUnique({
      where: { id: leagueId },
      include: { tournaments: { select: { id: true, status: true, name: true } } },
    });
    if (!league) throw new NotFoundException('League not found');

    const tiebreakerOrder: string[] = [
      'victory_points',
      'catan_points',
      'point_share',
      'second_places',
      'third_places',
      'avg_position',
    ];

    // Aggregate per-player data across all tournaments
    const playerMap = new Map<string, {
      playerId: string;
      displayName: string;
      alias: string | null;
      isGuest: boolean;
      country: string | null;
      totalVictoryPoints: number;
      totalCatanPoints: number;
      tournamentsPlayed: number;
      fullWins: number;
      secondPlaces: number;
      thirdPlaces: number;
      eloRating: number | null;
      positionsSum: number;
      gamesPlayed: number;
      pointShareSum: number;
    }>();

    for (const tournament of league.tournaments) {
      try {
        const entries = await this.leaderboard.getTournamentLeaderboard(tournament.id);
        for (const entry of entries) {
          const key = entry.userId;
          const existing = playerMap.get(key);
          if (existing) {
            existing.totalVictoryPoints += entry.victoryPoints;
            existing.totalCatanPoints += entry.totalCatanPoints;
            existing.tournamentsPlayed += 1;
            existing.fullWins += entry.fullWins;
            existing.secondPlaces += entry.secondPlaces;
            existing.thirdPlaces += entry.thirdPlaces;
            existing.gamesPlayed += entry.gamesPlayed;
            if (entry.avgPosition !== null) existing.positionsSum += entry.avgPosition * entry.gamesPlayed;
            existing.pointShareSum += entry.avgPointShare * entry.gamesPlayed;
          } else {
            playerMap.set(key, {
              playerId: key,
              displayName: entry.displayName,
              alias: entry.alias,
              isGuest: entry.isGuest,
              country: entry.country,
              totalVictoryPoints: entry.victoryPoints,
              totalCatanPoints: entry.totalCatanPoints,
              tournamentsPlayed: 1,
              fullWins: entry.fullWins,
              secondPlaces: entry.secondPlaces,
              thirdPlaces: entry.thirdPlaces,
              eloRating: entry.isGuest ? null : entry.eloRating,
              gamesPlayed: entry.gamesPlayed,
              positionsSum: entry.avgPosition !== null ? entry.avgPosition * entry.gamesPlayed : 0,
              pointShareSum: entry.avgPointShare * entry.gamesPlayed,
            });
          }
        }
      } catch {
        // Skip tournaments with no results yet
      }
    }

    const entries = Array.from(playerMap.values()).map((p) => ({
      ...p,
      avgPosition: p.gamesPlayed > 0 ? p.positionsSum / p.gamesPlayed : null,
      avgPointShare: p.gamesPlayed > 0 ? p.pointShareSum / p.gamesPlayed : 0,
    }));

    // Apply tiebreakers
    const sorted = entries.sort((a, b) => {
      for (const criterion of tiebreakerOrder) {
        let diff = 0;
        switch (criterion) {
          case 'victory_points':
          case 'points':
            diff = b.totalVictoryPoints - a.totalVictoryPoints;
            break;
          case 'catan_points':
            diff = b.totalCatanPoints - a.totalCatanPoints;
            break;
          case 'wins':
            diff = b.fullWins - a.fullWins;
            break;
          case 'second_places':
            diff = b.secondPlaces - a.secondPlaces;
            break;
          case 'third_places':
            diff = b.thirdPlaces - a.thirdPlaces;
            break;
          case 'point_share':
            diff = b.avgPointShare - a.avgPointShare;
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

    return sorted.map((entry, index) => ({ ...entry, rank: index + 1 }));
  }

  async addCoOrganizer(leagueId: string, ownerId: string, targetEmail: string) {
    await this.assertIsOwner(leagueId, ownerId);

    const user = await this.prisma.user.findUnique({ where: { email: targetEmail } });
    if (!user) throw new NotFoundException('User not found');

    const existing = await this.prisma.leagueRole.findUnique({
      where: { leagueId_userId: { leagueId, userId: user.id } },
    });
    if (existing?.role === 'OWNER') {
      throw new ConflictException('This user is already the league owner');
    }

    await this.prisma.leagueRole.upsert({
      where: { leagueId_userId: { leagueId, userId: user.id } },
      update: { role: 'CO_ORGANIZER' },
      create: { leagueId, userId: user.id, role: 'CO_ORGANIZER' },
    });

    await this.audit.log({
      action: 'LEAGUE_CO_ORGANIZER_ADDED',
      actorId: ownerId,
      payload: { leagueId, addedUserId: user.id },
    });

    return { message: 'Co-organizer added', userId: user.id };
  }

  async removeCoOrganizer(leagueId: string, ownerId: string, targetUserId: string) {
    await this.assertIsOwner(leagueId, ownerId);

    const role = await this.prisma.leagueRole.findUnique({
      where: { leagueId_userId: { leagueId, userId: targetUserId } },
    });
    if (!role) throw new NotFoundException('Role not found');
    if (role.role === 'OWNER') throw new ForbiddenException('Cannot remove the league owner');

    await this.prisma.leagueRole.delete({
      where: { leagueId_userId: { leagueId, userId: targetUserId } },
    });

    await this.audit.log({
      action: 'LEAGUE_CO_ORGANIZER_REMOVED',
      actorId: ownerId,
      payload: { leagueId, removedUserId: targetUserId },
    });

    return { message: 'Co-organizer removed' };
  }

  async assertIsOwner(leagueId: string, userId: string) {
    const role = await this.prisma.leagueRole.findUnique({
      where: { leagueId_userId: { leagueId, userId } },
    });
    if (!role || role.role !== 'OWNER') {
      throw new ForbiddenException('Only the league owner can perform this action');
    }
  }

  async assertIsOwnerOrCoOrganizer(leagueId: string, userId: string) {
    const role = await this.prisma.leagueRole.findUnique({
      where: { leagueId_userId: { leagueId, userId } },
    });
    if (!role || !['OWNER', 'CO_ORGANIZER'].includes(role.role)) {
      throw new ForbiddenException('Only league organizers can perform this action');
    }
  }
}
