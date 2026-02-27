import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ResultsService } from './results.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import {
  SubmitResultDto,
  CorrectResultDto,
  CreateDisputeDto,
  ResolveDisputeDto,
  PlayerSubmitDto,
  FinalizeResultDto,
} from './dto/submit-result.dto';

@Controller('tournaments/:tournamentId')
@UseGuards(JwtAuthGuard)
export class ResultsController {
  constructor(private resultsService: ResultsService) {}

  /** Organizer: submit official results directly */
  @Post('tables/:tableId/results')
  submitResults(
    @Param('tournamentId') tournamentId: string,
    @Param('tableId') tableId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SubmitResultDto,
  ) {
    return this.resultsService.submitResults(tournamentId, tableId, user.sub, dto);
  }

  /** Organizer: correct existing results */
  @Patch('tables/:tableId/results')
  correctResults(
    @Param('tournamentId') tournamentId: string,
    @Param('tableId') tableId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CorrectResultDto,
  ) {
    return this.resultsService.correctResults(tournamentId, tableId, user.sub, dto);
  }

  /** Player: submit their version of scores for their table */
  @Post('tables/:tableId/player-submissions')
  @HttpCode(HttpStatus.OK)
  submitPlayerScores(
    @Param('tournamentId') tournamentId: string,
    @Param('tableId') tableId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: PlayerSubmitDto,
  ) {
    return this.resultsService.submitPlayerScores(tournamentId, tableId, user.sub, dto);
  }

  /** Organizer: view all player submissions for a table */
  @Get('tables/:tableId/submissions')
  getSubmissions(
    @Param('tournamentId') tournamentId: string,
    @Param('tableId') tableId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.resultsService.getSubmissions(tournamentId, tableId, user.sub);
  }

  /** Organizer: finalize/override official result for a table */
  @Post('tables/:tableId/finalize')
  @HttpCode(HttpStatus.OK)
  finalizeResults(
    @Param('tournamentId') tournamentId: string,
    @Param('tableId') tableId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: FinalizeResultDto,
  ) {
    return this.resultsService.finalizeResults(tournamentId, tableId, user.sub, dto);
  }

  @Post('results/:resultId/dispute')
  createDispute(
    @Param('tournamentId') tournamentId: string,
    @Param('resultId') resultId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateDisputeDto,
  ) {
    return this.resultsService.createDispute(tournamentId, resultId, user.sub, dto);
  }

  @Patch('disputes/:disputeId/resolve')
  @HttpCode(HttpStatus.OK)
  resolveDispute(
    @Param('tournamentId') tournamentId: string,
    @Param('disputeId') disputeId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ResolveDisputeDto,
  ) {
    return this.resultsService.resolveDispute(tournamentId, disputeId, user.sub, dto);
  }
}
