import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: {
    action: string;
    actorId: string;
    tournamentId?: string;
    payload?: Record<string, unknown>;
  }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        action: params.action,
        actorId: params.actorId,
        tournamentId: params.tournamentId,
        payload: (params.payload ?? {}) as object,
      },
    });
  }

  async getByTournament(tournamentId: string, limit = 50) {
    return this.prisma.auditLog.findMany({
      where: { tournamentId },
      include: {
        actor: { select: { id: true, displayName: true, alias: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
