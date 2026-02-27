import { Module } from '@nestjs/common';
import { RoundsController } from './rounds.controller';
import { RoundsService } from './rounds.service';
import { TableGenerationService } from './table-generation.service';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';

@Module({
  imports: [TournamentsModule, RealtimeModule, LeaderboardModule],
  controllers: [RoundsController],
  providers: [RoundsService, TableGenerationService],
  exports: [RoundsService, TableGenerationService],
})
export class RoundsModule { }
