import { Module } from '@nestjs/common';
import { ResultsController } from './results.controller';
import { ResultsService } from './results.service';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';

@Module({
  imports: [TournamentsModule, RealtimeModule, LeaderboardModule],
  controllers: [ResultsController],
  providers: [ResultsService],
  exports: [ResultsService],
})
export class ResultsModule {}
