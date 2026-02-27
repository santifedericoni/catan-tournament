import { LeaderboardService } from '../leaderboard.service';

type Entry = Parameters<LeaderboardService['applyTiebreakers']>[0][0];

describe('LeaderboardService.applyTiebreakers', () => {
  let service: LeaderboardService;

  beforeEach(() => {
    service = new LeaderboardService(null as any);
  });

  const makeEntry = (overrides: Partial<Entry>): Entry => ({
    userId: 'user',
    displayName: 'Test',
    alias: null,
    country: null,
    eloRating: 1000,
    isGuest: false,
    totalCatanPoints: 0,
    victoryPoints: 0,
    fullWins: 0,
    gamesPlayed: 0,
    avgPosition: null,
    opponentStrength: 0,
    isEliminated: false,
    qualifiedToNextStage: false,
    ...overrides,
  });

  it('sorts by catan_points descending', () => {
    const entries = [
      makeEntry({ userId: 'a', totalCatanPoints: 10 }),
      makeEntry({ userId: 'b', totalCatanPoints: 20 }),
      makeEntry({ userId: 'c', totalCatanPoints: 15 }),
    ];
    const sorted = service.applyTiebreakers(entries, ['catan_points', 'wins', 'opponent_strength']);
    expect(sorted[0].userId).toBe('b');
    expect(sorted[1].userId).toBe('c');
    expect(sorted[2].userId).toBe('a');
  });

  it('breaks tie by wins when points are equal', () => {
    const entries = [
      makeEntry({ userId: 'a', totalCatanPoints: 20, fullWins: 1 }),
      makeEntry({ userId: 'b', totalCatanPoints: 20, fullWins: 3 }),
      makeEntry({ userId: 'c', totalCatanPoints: 20, fullWins: 2 }),
    ];
    const sorted = service.applyTiebreakers(entries, ['catan_points', 'wins', 'opponent_strength']);
    expect(sorted[0].userId).toBe('b');
    expect(sorted[1].userId).toBe('c');
    expect(sorted[2].userId).toBe('a');
  });

  it('breaks tie by opponent_strength when points and wins are equal', () => {
    const entries = [
      makeEntry({ userId: 'a', totalCatanPoints: 20, fullWins: 2, opponentStrength: 1000 }),
      makeEntry({ userId: 'b', totalCatanPoints: 20, fullWins: 2, opponentStrength: 1200 }),
      makeEntry({ userId: 'c', totalCatanPoints: 20, fullWins: 2, opponentStrength: 1100 }),
    ];
    const sorted = service.applyTiebreakers(entries, ['catan_points', 'wins', 'opponent_strength']);
    expect(sorted[0].userId).toBe('b');
    expect(sorted[1].userId).toBe('c');
    expect(sorted[2].userId).toBe('a');
  });

  it('breaks tie by avg_position (lower is better) when all else equal', () => {
    const entries = [
      makeEntry({ userId: 'a', totalCatanPoints: 20, fullWins: 2, opponentStrength: 1000, avgPosition: 2.5 }),
      makeEntry({ userId: 'b', totalCatanPoints: 20, fullWins: 2, opponentStrength: 1000, avgPosition: 1.5 }),
      makeEntry({ userId: 'c', totalCatanPoints: 20, fullWins: 2, opponentStrength: 1000, avgPosition: 3.0 }),
    ];
    const sorted = service.applyTiebreakers(entries, ['catan_points', 'wins', 'opponent_strength', 'avg_position']);
    expect(sorted[0].userId).toBe('b'); // avg 1.5 (best)
    expect(sorted[1].userId).toBe('a'); // avg 2.5
    expect(sorted[2].userId).toBe('c'); // avg 3.0 (worst)
  });

  it('respects custom tiebreaker order (wins before catan_points)', () => {
    const entries = [
      makeEntry({ userId: 'a', totalCatanPoints: 20, fullWins: 1 }),
      makeEntry({ userId: 'b', totalCatanPoints: 15, fullWins: 3 }),
    ];
    const sorted = service.applyTiebreakers(entries, ['wins', 'catan_points']);
    expect(sorted[0].userId).toBe('b'); // 3 wins first
  });
});
