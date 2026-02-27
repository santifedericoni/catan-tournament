import { TournamentFormat } from '../enums/tournament-format.enum';
import { TableGenerationMode } from '../enums/table-generation-mode.enum';

export interface CreateLeagueDto {
  name: string;
  description?: string;
  format: TournamentFormat;
  tiebreakerOrder?: string[];
  tableGenerationMode?: TableGenerationMode;
}

export interface UpdateLeagueDto {
  name?: string;
  description?: string;
  format?: TournamentFormat;
  tiebreakerOrder?: string[];
  tableGenerationMode?: TableGenerationMode;
}

export interface CreateLeagueTournamentDto {
  name: string;
  description?: string;
  location?: string;
  isOnline?: boolean;
  startsAt: string;
  timezone?: string;
  maxPlayers: number;
}

export interface AddGuestPlayerDto {
  name: string;
}
