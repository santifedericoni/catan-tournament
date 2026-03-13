export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  alias: string | null;
  country: string | null;
  totalCatanPoints: number;
  victoryPoints: number;
  fullWins: number;
  secondPlaces: number;
  thirdPlaces: number;
  gamesPlayed: number;
  avgPosition: number | null;
  avgPointShare: number; // average of (myPoints / tableTotalPoints) across all games
  eloRating: number;
  isGuest: boolean;
  isEliminated: boolean;
  qualifiedToNextStage: boolean;
}

export interface LeagueLeaderboardEntry {
  rank: number;
  playerId: string;
  displayName: string;
  isGuest: boolean;
  country: string | null;
  totalVictoryPoints: number;
  totalCatanPoints: number;
  tournamentsPlayed: number;
  fullWins: number;
  eloRating: number | null;
}

export interface BracketSlot {
  stageType: string;
  tableNumber: number;
  players: Array<{
    userId: string;
    displayName: string;
    alias: string | null;
    seed: number;
  }>;
  result?: {
    winner: string;
    positions: Array<{ userId: string; position: number; points: number }>;
  };
}
