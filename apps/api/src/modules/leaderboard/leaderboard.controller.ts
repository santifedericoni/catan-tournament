import { Controller, Get, Param } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';

@Controller('tournaments/:tournamentId')
export class LeaderboardController {
  constructor(private leaderboardService: LeaderboardService) {}

  @Get('leaderboard')
  getLeaderboard(@Param('tournamentId') tournamentId: string) {
    return this.leaderboardService.getTournamentLeaderboard(tournamentId);
  }

  @Get('bracket')
  getBracket(@Param('tournamentId') tournamentId: string) {
    return this.leaderboardService.getBracket(tournamentId);
  }
}
