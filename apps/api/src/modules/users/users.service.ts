import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { stats: true },
    });
    if (!user) throw new NotFoundException('User not found');
    const { passwordHash, ...rest } = user;
    return rest;
  }

  async getStats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        stats: true,
        ratingHistory: {
          include: { tournament: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const results = await this.prisma.result.findMany({
      where: { userId },
      include: {
        table: {
          include: {
            round: {
              include: {
                stage: {
                  include: { tournament: { select: { id: true, name: true } } },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      stats: user.stats,
      ratingHistory: user.ratingHistory.map((r) => ({
        id: r.id,
        tournamentId: r.tournamentId,
        tournamentName: r.tournament.name,
        oldRating: r.oldRating,
        newRating: r.newRating,
        delta: r.delta,
        createdAt: r.createdAt,
      })),
      recentResults: results.map((r) => ({
        position: r.position,
        victoryPoints: r.victoryPoints,
        tournamentId: r.table.round.stage.tournament.id,
        tournamentName: r.table.round.stage.tournament.name,
        playedAt: r.createdAt,
      })),
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });
    const { passwordHash, ...rest } = user;
    return rest;
  }
}
