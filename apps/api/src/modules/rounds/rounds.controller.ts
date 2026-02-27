import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Delete,
} from '@nestjs/common';
import { RoundsService } from './rounds.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { TableGenerationMode } from '@catan/shared';
import { ManualAssignmentDto } from './dto/create-round.dto';

@Controller('tournaments/:tournamentId')
@UseGuards(JwtAuthGuard)
export class RoundsController {
  constructor(private roundsService: RoundsService) { }

  @Post('stages')
  createStage(
    @Param('tournamentId') tournamentId: string,
    @CurrentUser() user: JwtPayload,
    @Body('type') type: string,
    @Body('config') config?: Record<string, unknown>,
  ) {
    return this.roundsService.createStage(tournamentId, user.sub, type, config);
  }

  @Post('stages/:stageId/rounds')
  createRound(
    @Param('tournamentId') tournamentId: string,
    @Param('stageId') stageId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.roundsService.createRound(tournamentId, stageId, user.sub);
  }

  @Post('rounds/:roundId/generate-tables')
  generateTables(
    @Param('tournamentId') tournamentId: string,
    @Param('roundId') roundId: string,
    @Query('mode') mode: TableGenerationMode,
    @CurrentUser() user: JwtPayload,
    @Body() manualAssignment?: ManualAssignmentDto,
  ) {
    return this.roundsService.generateTables(
      tournamentId,
      roundId,
      mode ?? TableGenerationMode.RANDOM,
      user.sub,
      manualAssignment,
    );
  }

  @Post('rounds/:roundId/start')
  @HttpCode(HttpStatus.OK)
  startRound(
    @Param('tournamentId') tournamentId: string,
    @Param('roundId') roundId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.roundsService.startRound(tournamentId, roundId, user.sub);
  }

  @Post('rounds/:roundId/close')
  @HttpCode(HttpStatus.OK)
  closeRound(
    @Param('tournamentId') tournamentId: string,
    @Param('roundId') roundId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.roundsService.closeRound(tournamentId, roundId, user.sub);
  }

  @Get('rounds/:roundId')
  getRound(
    @Param('tournamentId') tournamentId: string,
    @Param('roundId') roundId: string,
  ) {
    return this.roundsService.getRound(tournamentId, roundId);
  }

  @Delete('stages/:stageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteStage(
    @Param('tournamentId') tournamentId: string,
    @Param('stageId') stageId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.roundsService.deleteStage(tournamentId, stageId, user.sub);
  }

  @Delete('rounds/:roundId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteRound(
    @Param('tournamentId') tournamentId: string,
    @Param('roundId') roundId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.roundsService.deleteRound(tournamentId, roundId, user.sub);
  }
}
