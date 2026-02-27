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
import { TournamentsService } from './tournaments.service';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';

@Controller('tournaments')
export class TournamentsController {
  constructor(
    private tournamentsService: TournamentsService,
    private auditService: AuditService,
  ) {}

  @Get()
  list(@Query() query: {
    page?: string;
    limit?: string;
    status?: string;
    format?: string;
    isOnline?: string;
    search?: string;
  }) {
    return this.tournamentsService.findAll(query);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  get(
    @Param('id') id: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.tournamentsService.findOne(id, user?.sub);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTournamentDto,
  ) {
    return this.tournamentsService.create(user.sub, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateTournamentDto,
  ) {
    return this.tournamentsService.update(id, user.sub, dto);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  publish(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.tournamentsService.transition(id, 'PUBLISHED', user.sub);
  }

  @Post(':id/start-checkin')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  startCheckin(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.tournamentsService.transition(id, 'CHECKIN', user.sub);
  }

  @Post(':id/start')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  start(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.tournamentsService.transition(id, 'RUNNING', user.sub);
  }

  @Post(':id/finish')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  finish(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.tournamentsService.transition(id, 'FINISHED', user.sub);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  cancel(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.tournamentsService.transition(id, 'CANCELLED', user.sub);
  }

  @Post(':id/staff/invite')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  inviteStaff(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body('email') email: string,
  ) {
    return this.tournamentsService.inviteStaff(id, user.sub, email);
  }

  @Get(':id/organizers')
  @UseGuards(JwtAuthGuard)
  listOrganizers(@Param('id') id: string) {
    return this.tournamentsService.listOrganizers(id);
  }

  @Post(':id/co-organizers')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  addCoOrganizer(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body('email') email: string,
  ) {
    return this.tournamentsService.addCoOrganizer(id, user.sub, email);
  }

  @Delete(':id/co-organizers/:userId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  removeCoOrganizer(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tournamentsService.removeCoOrganizer(id, user.sub, userId);
  }

  @Get(':id/audit-log')
  @UseGuards(JwtAuthGuard)
  getAuditLog(@Param('id') id: string) {
    return this.auditService.getByTournament(id);
  }
}
