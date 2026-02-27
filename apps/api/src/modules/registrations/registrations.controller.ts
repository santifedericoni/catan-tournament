import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RegistrationsService } from './registrations.service';
import { GuestPlayersService } from './guest-players.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('tournaments/:tournamentId')
@UseGuards(JwtAuthGuard)
export class RegistrationsController {
  constructor(
    private registrationsService: RegistrationsService,
    private guestPlayersService: GuestPlayersService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(
    @Param('tournamentId') tournamentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.registrationsService.register(tournamentId, user.sub);
  }

  @Get('registrations')
  getRegistrations(@Param('tournamentId') tournamentId: string) {
    return this.registrationsService.getRegistrations(tournamentId);
  }

  @Patch('registrations/:userId')
  updateRegistration(
    @Param('tournamentId') tournamentId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: JwtPayload,
    @Body('status') status: 'APPROVED' | 'REJECTED' | 'REMOVED',
  ) {
    return this.registrationsService.updateRegistration(
      tournamentId,
      targetUserId,
      user.sub,
      status,
    );
  }

  @Post('checkin')
  @HttpCode(HttpStatus.OK)
  checkIn(
    @Param('tournamentId') tournamentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.registrationsService.checkIn(tournamentId, user.sub);
  }

  @Post('guests')
  @HttpCode(HttpStatus.CREATED)
  addGuest(
    @Param('tournamentId') tournamentId: string,
    @CurrentUser() user: JwtPayload,
    @Body('name') name: string,
  ) {
    return this.guestPlayersService.addGuestPlayer(tournamentId, user.sub, name);
  }

  @Delete('guests/:guestPlayerId')
  @HttpCode(HttpStatus.OK)
  removeGuest(
    @Param('tournamentId') tournamentId: string,
    @Param('guestPlayerId') guestPlayerId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.guestPlayersService.removeGuestPlayer(tournamentId, guestPlayerId, user.sub);
  }
}
