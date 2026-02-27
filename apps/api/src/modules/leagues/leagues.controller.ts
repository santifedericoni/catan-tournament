import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LeaguesService } from './leagues.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CreateLeagueDto } from './dto/create-league.dto';
import { UpdateLeagueDto } from './dto/update-league.dto';
import { CreateLeagueTournamentDto } from './dto/create-league-tournament.dto';

@Controller('leagues')
export class LeaguesController {
  constructor(private leaguesService: LeaguesService) {}

  @Get()
  list(@Query() query: { page?: string; limit?: string; search?: string }) {
    return this.leaguesService.findAll(query);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateLeagueDto,
  ) {
    return this.leaguesService.create(user.sub, dto);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  get(
    @Param('id') id: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.leaguesService.findOne(id, user?.sub);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateLeagueDto,
  ) {
    return this.leaguesService.update(id, user.sub, dto);
  }

  @Get(':id/tournaments')
  @UseGuards(OptionalJwtAuthGuard)
  getTournaments(
    @Param('id') id: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.leaguesService.findOne(id, user?.sub).then((l) => l.tournaments);
  }

  @Post(':id/tournaments')
  @UseGuards(JwtAuthGuard)
  createTournament(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateLeagueTournamentDto,
  ) {
    return this.leaguesService.createTournament(id, user.sub, dto);
  }

  @Get(':id/leaderboard')
  getLeaderboard(@Param('id') id: string) {
    return this.leaguesService.getLeaderboard(id);
  }

  @Post(':id/co-organizers')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  addCoOrganizer(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body('email') email: string,
  ) {
    return this.leaguesService.addCoOrganizer(id, user.sub, email);
  }

  @Delete(':id/co-organizers/:userId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  removeCoOrganizer(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.leaguesService.removeCoOrganizer(id, user.sub, userId);
  }
}
