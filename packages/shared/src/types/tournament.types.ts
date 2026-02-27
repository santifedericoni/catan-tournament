import { TournamentFormat } from '../enums/tournament-format.enum';
import { TournamentStatus } from '../enums/tournament-status.enum';
import { TableGenerationMode } from '../enums/table-generation-mode.enum';
import { RegistrationStatus } from '../enums/registration-status.enum';
import { TournamentRole } from '../enums/tournament-role.enum';

export type TiebreakerCriterion = 'victory_points' | 'catan_points' | 'wins' | 'opponent_strength' | 'avg_position';

export interface TournamentSummary {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  isOnline: boolean;
  startsAt: string;
  timezone: string;
  maxPlayers: number;
  status: TournamentStatus;
  format: TournamentFormat;
  tableGenerationMode: TableGenerationMode;
  sponsorName: string | null;
  sponsorLogoUrl: string | null;
  sponsorUrl: string | null;
  createdBy: string;
  createdAt: string;
  registeredCount: number;
}

export interface TournamentDetail extends TournamentSummary {
  tiebreakerOrder: TiebreakerCriterion[];
  stages: StageDetail[];
  myRegistration?: RegistrationDetail | null;
  myRole?: TournamentRole | null;
}

export interface RegistrationDetail {
  id: string;
  userId: string;
  status: RegistrationStatus;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    displayName: string;
    alias: string | null;
    country: string | null;
    stats?: { eloRating: number } | null;
  };
}

export interface StageDetail {
  id: string;
  type: string;
  sequenceOrder: number;
  config: Record<string, unknown>;
  rounds: RoundSummary[];
}

export interface RoundSummary {
  id: string;
  roundNumber: number;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  tableCount: number;
}
