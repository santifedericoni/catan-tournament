export type TournamentEvent =
  | 'leaderboard_update'
  | 'round_started'
  | 'round_closed'
  | 'table_assigned'
  | 'result_submitted'
  | 'result_corrected'
  | 'result_confirmed'
  | 'result_disputed'
  | 'result_official'
  | 'stage_advanced'
  | 'dispute_opened'
  | 'dispute_resolved';
