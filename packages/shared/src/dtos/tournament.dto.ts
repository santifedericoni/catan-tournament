import { TournamentFormat } from '../enums/tournament-format.enum';
import { TableGenerationMode } from '../enums/table-generation-mode.enum';
import { TiebreakerCriterion } from '../types/tournament.types';

export interface CreateTournamentDto {
  name: string;
  description?: string;
  location?: string;
  isOnline?: boolean;
  startsAt: string;
  timezone: string;
  maxPlayers: number;
  format: TournamentFormat;
  tiebreakerOrder?: TiebreakerCriterion[];
  tableGenerationMode?: TableGenerationMode;
  sponsorName?: string;
  sponsorLogoUrl?: string;
  sponsorUrl?: string;
}

export interface UpdateTournamentDto extends Partial<CreateTournamentDto> {}

export interface ListTournamentsQuery {
  page?: number;
  limit?: number;
  status?: string;
  format?: string;
  isOnline?: boolean;
  search?: string;
  fromDate?: string;
  toDate?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
