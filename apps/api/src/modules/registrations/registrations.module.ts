import { Module } from '@nestjs/common';
import { RegistrationsController } from './registrations.controller';
import { RegistrationsService } from './registrations.service';
import { GuestPlayersService } from './guest-players.service';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TournamentsModule, AuditModule],
  controllers: [RegistrationsController],
  providers: [RegistrationsService, GuestPlayersService],
  exports: [RegistrationsService, GuestPlayersService],
})
export class RegistrationsModule {}
