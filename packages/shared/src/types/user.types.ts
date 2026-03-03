export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  alias: string | null;
  country: string | null;
  city: string | null;
  avatarUrl: string | null;
  bio: string | null;
  favoriteColor: string | null;
  favoriteExpansion: string | null;
  emailVerified: boolean;
  createdAt: string;
  stats: UserStats | null;
}

export interface UserStats {
  eloRating: number;
  eloUncertainty: number;
  tournamentsPlayed: number;
  totalWins: number;
  avgPosition: number | null;
  updatedAt: string;
}

export interface RatingHistoryEntry {
  id: string;
  tournamentId: string;
  tournamentName: string;
  oldRating: number;
  newRating: number;
  delta: number;
  createdAt: string;
}
