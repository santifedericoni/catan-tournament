import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TournamentsService } from '../tournaments/tournaments.service';

@Injectable()
export class GuestPlayersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private tournamentsService: TournamentsService,
  ) {}

  async addGuestPlayer(tournamentId: string, actorId: string, name: string) {
    await this.tournamentsService.assertIsOrganizerOrStaff(tournamentId, actorId);

    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { id: true, leagueId: true },
    });
    if (!tournament) throw new NotFoundException('Tournament not found');

    if (!name || name.trim().length < 1) {
      throw new BadRequestException('Guest player name is required');
    }

    const guestPlayer = await this.prisma.$transaction(async (tx) => {
      const guest = await tx.guestPlayer.create({
        data: {
          name: name.trim(),
          // Scope to league if tournament belongs to one, otherwise to tournament
          ...(tournament.leagueId
            ? { leagueId: tournament.leagueId }
            : { tournamentId: tournament.id }),
        },
      });

      await tx.tournamentRegistration.create({
        data: {
          tournamentId,
          guestPlayerId: guest.id,
          status: 'APPROVED',
        },
      });

      return guest;
    });

    await this.audit.log({
      action: 'GUEST_PLAYER_ADDED',
      actorId,
      tournamentId,
      payload: { guestPlayerId: guestPlayer.id, name: guestPlayer.name },
    });

    return guestPlayer;
  }

  async removeGuestPlayer(tournamentId: string, guestPlayerId: string, actorId: string) {
    await this.tournamentsService.assertIsOrganizerOrStaff(tournamentId, actorId);

    const registration = await this.prisma.tournamentRegistration.findUnique({
      where: { tournamentId_guestPlayerId: { tournamentId, guestPlayerId } },
    });
    if (!registration) throw new NotFoundException('Guest player registration not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.tournamentRegistration.delete({
        where: { tournamentId_guestPlayerId: { tournamentId, guestPlayerId } },
      });

      // If the guest has no more registrations, delete the guest player record
      const remainingRegistrations = await tx.tournamentRegistration.count({
        where: { guestPlayerId },
      });
      if (remainingRegistrations === 0) {
        await tx.guestPlayer.delete({ where: { id: guestPlayerId } });
      }
    });

    await this.audit.log({
      action: 'GUEST_PLAYER_REMOVED',
      actorId,
      tournamentId,
      payload: { guestPlayerId },
    });

    return { message: 'Guest player removed' };
  }
}
