import { Module } from '@nestjs/common';
import { TournamentsController } from './tournaments.controller';
import { TournamentsService } from './tournaments.service';
import { AuditModule } from '../audit/audit.module';
import { RatingModule } from '../rating/rating.module';

@Module({
  imports: [AuditModule, RatingModule],
  controllers: [TournamentsController],
  providers: [TournamentsService],
  exports: [TournamentsService],
})
export class TournamentsModule {}
