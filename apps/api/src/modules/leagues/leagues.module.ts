import { Module } from '@nestjs/common';
import { LeaguesController } from './leagues.controller';
import { LeaguesService } from './leagues.service';
import { AuditModule } from '../audit/audit.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';

@Module({
  imports: [AuditModule, LeaderboardModule],
  controllers: [LeaguesController],
  providers: [LeaguesService],
  exports: [LeaguesService],
})
export class LeaguesModule {}
