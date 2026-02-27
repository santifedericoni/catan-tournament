export enum TournamentStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CHECKIN = 'CHECKIN',
  RUNNING = 'RUNNING',
  FINISHED = 'FINISHED',
  CANCELLED = 'CANCELLED',
}

export const VALID_TOURNAMENT_TRANSITIONS: Record<TournamentStatus, TournamentStatus[]> = {
  [TournamentStatus.DRAFT]: [TournamentStatus.PUBLISHED, TournamentStatus.CANCELLED],
  [TournamentStatus.PUBLISHED]: [TournamentStatus.CHECKIN, TournamentStatus.CANCELLED],
  [TournamentStatus.CHECKIN]: [TournamentStatus.RUNNING, TournamentStatus.CANCELLED],
  [TournamentStatus.RUNNING]: [TournamentStatus.FINISHED, TournamentStatus.CANCELLED],
  [TournamentStatus.FINISHED]: [],
  [TournamentStatus.CANCELLED]: [],
};
