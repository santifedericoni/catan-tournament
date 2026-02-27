import { TournamentFormat } from '../enums/tournament-format.enum';
import { TableGenerationMode } from '../enums/table-generation-mode.enum';

export interface LeagueSummary {
  id: string;
  name: string;
  description: string | null;
  format: TournamentFormat;
  tableGenerationMode: TableGenerationMode;
  createdBy: string;
  createdAt: string;
  tournamentCount: number;
  creator?: { id: string; displayName: string };
}

export interface LeagueDetail extends LeagueSummary {
  tiebreakerOrder: string[];
  tournaments: Array<{
    id: string;
    name: string;
    status: string;
    startsAt: string;
    maxPlayers: number;
    registeredCount: number;
  }>;
  myRole?: string | null;
}
