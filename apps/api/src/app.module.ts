import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './modules/audit/audit.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { TournamentsModule } from './modules/tournaments/tournaments.module';
import { RegistrationsModule } from './modules/registrations/registrations.module';
import { RoundsModule } from './modules/rounds/rounds.module';
import { ResultsModule } from './modules/results/results.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { RatingModule } from './modules/rating/rating.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { LeaguesModule } from './modules/leagues/leagues.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.THROTTLE_TTL || '60') * 1000,
        limit: parseInt(process.env.THROTTLE_LIMIT || '100'),
      },
    ]),
    PrismaModule,
    AuditModule,
    UsersModule,
    AuthModule,
    TournamentsModule,
    RegistrationsModule,
    RoundsModule,
    ResultsModule,
    LeaderboardModule,
    RatingModule,
    RealtimeModule,
    LeaguesModule,
  ],
})
export class AppModule {}
