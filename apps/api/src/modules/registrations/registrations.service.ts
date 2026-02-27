import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TournamentsService } from '../tournaments/tournaments.service';

@Injectable()
export class RegistrationsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private tournamentsService: TournamentsService,
  ) {}

  async register(tournamentId: string, userId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        _count: { select: { registrations: { where: { status: { in: ['APPROVED', 'CHECKED_IN'] } } } } },
      },
    });
    if (!tournament) throw new NotFoundException('Tournament not found');
    if (tournament.status !== 'PUBLISHED') {
      throw new BadRequestException('Tournament is not open for registrations');
    }

    const existing = await this.prisma.tournamentRegistration.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
    });
    if (existing) {
      throw new ConflictException('Already registered for this tournament');
    }

    const approvedCount = tournament._count.registrations;
    const status = approvedCount >= tournament.maxPlayers ? 'WAITLIST' : 'REQUESTED';

    const registration = await this.prisma.tournamentRegistration.create({
      data: { tournamentId, userId, status },
    });

    await this.audit.log({
      action: 'PLAYER_REGISTERED',
      actorId: userId,
      tournamentId,
      payload: { status },
    });

    return registration;
  }

  async getRegistrations(tournamentId: string) {
    const registrations = await this.prisma.tournamentRegistration.findMany({
      where: { tournamentId },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            alias: true,
            country: true,
            stats: { select: { eloRating: true, tournamentsPlayed: true } },
          },
        },
        guestPlayer: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return registrations.map((reg) => ({
      ...reg,
      playerType: reg.userId ? 'user' : 'guest',
      displayName: reg.userId ? reg.user?.displayName : reg.guestPlayer?.name,
    }));
  }

  async updateRegistration(
    tournamentId: string,
    targetUserId: string,
    actorId: string,
    status: 'APPROVED' | 'REJECTED' | 'REMOVED',
  ) {
    await this.tournamentsService.assertIsOrganizerOrStaff(tournamentId, actorId);

    const registration = await this.prisma.tournamentRegistration.findUnique({
      where: { tournamentId_userId: { tournamentId, userId: targetUserId } },
    });
    if (!registration) throw new NotFoundException('Registration not found');

    if (status === 'APPROVED') {
      // Check capacity
      const tournament = await this.prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: {
          _count: { select: { registrations: { where: { status: { in: ['APPROVED', 'CHECKED_IN'] } } } } },
        },
      });
      if (!tournament) throw new NotFoundException('Tournament not found');
      if (tournament._count.registrations >= tournament.maxPlayers) {
        throw new BadRequestException('Tournament is at full capacity. Player will go to waitlist.');
      }
    }

    const updated = await this.prisma.tournamentRegistration.update({
      where: { tournamentId_userId: { tournamentId, userId: targetUserId } },
      data: { status },
    });

    await this.audit.log({
      action: `REGISTRATION_${status}`,
      actorId,
      tournamentId,
      payload: { targetUserId, previousStatus: registration.status },
    });

    // If a spot opened up (REJECTED or REMOVED), auto-promote first waitlisted player
    if (status === 'REJECTED' || status === 'REMOVED') {
      await this.promoteFromWaitlist(tournamentId, actorId);
    }

    return updated;
  }

  async checkIn(tournamentId: string, userId: string) {
    const tournament = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw new NotFoundException('Tournament not found');
    if (tournament.status !== 'CHECKIN') {
      throw new BadRequestException('Tournament is not in check-in phase');
    }

    const registration = await this.prisma.tournamentRegistration.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
    });
    if (!registration) throw new NotFoundException('Registration not found');
    if (registration.status !== 'APPROVED') {
      throw new BadRequestException('Only approved players can check in');
    }

    const updated = await this.prisma.tournamentRegistration.update({
      where: { tournamentId_userId: { tournamentId, userId } },
      data: { status: 'CHECKED_IN' },
    });

    await this.audit.log({
      action: 'PLAYER_CHECKED_IN',
      actorId: userId,
      tournamentId,
    });

    return updated;
  }

  private async promoteFromWaitlist(tournamentId: string, actorId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        _count: { select: { registrations: { where: { status: { in: ['APPROVED', 'CHECKED_IN'] } } } } },
      },
    });
    if (!tournament) return;

    if (tournament._count.registrations >= tournament.maxPlayers) return;

    const waitlisted = await this.prisma.tournamentRegistration.findFirst({
      where: { tournamentId, status: 'WAITLIST' },
      orderBy: { createdAt: 'asc' },
    });

    if (!waitlisted) return;

    await this.prisma.tournamentRegistration.update({
      where: { id: waitlisted.id },
      data: { status: 'APPROVED' },
    });

    await this.audit.log({
      action: 'REGISTRATION_PROMOTED_FROM_WAITLIST',
      actorId,
      tournamentId,
      payload: { promotedUserId: waitlisted.userId ?? waitlisted.guestPlayerId },
    });
  }
}
