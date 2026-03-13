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
    secondPlaces: 0,
    thirdPlaces: 0,
    gamesPlayed: 0,
    avgPosition: null,
    avgPointShare: 0,
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
    const sorted = service.applyTiebreakers(entries, ['catan_points', 'point_share']);
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
    const sorted = service.applyTiebreakers(entries, ['catan_points', 'wins']);
    expect(sorted[0].userId).toBe('b');
    expect(sorted[1].userId).toBe('c');
    expect(sorted[2].userId).toBe('a');
  });

  it('breaks tie by point_share when points and wins are equal', () => {
    const entries = [
      makeEntry({ userId: 'a', totalCatanPoints: 20, fullWins: 2, avgPointShare: 0.25 }),
      makeEntry({ userId: 'b', totalCatanPoints: 20, fullWins: 2, avgPointShare: 0.35 }),
      makeEntry({ userId: 'c', totalCatanPoints: 20, fullWins: 2, avgPointShare: 0.30 }),
    ];
    const sorted = service.applyTiebreakers(entries, ['catan_points', 'point_share']);
    expect(sorted[0].userId).toBe('b');
    expect(sorted[1].userId).toBe('c');
    expect(sorted[2].userId).toBe('a');
  });

  it('breaks tie by avg_position (lower is better) when all else equal', () => {
    const entries = [
      makeEntry({ userId: 'a', totalCatanPoints: 20, fullWins: 2, avgPointShare: 0.25, avgPosition: 2.5 }),
      makeEntry({ userId: 'b', totalCatanPoints: 20, fullWins: 2, avgPointShare: 0.25, avgPosition: 1.5 }),
      makeEntry({ userId: 'c', totalCatanPoints: 20, fullWins: 2, avgPointShare: 0.25, avgPosition: 3.0 }),
    ];
    const sorted = service.applyTiebreakers(entries, ['catan_points', 'point_share', 'avg_position']);
    expect(sorted[0].userId).toBe('b'); // avg 1.5 (best)
    expect(sorted[1].userId).toBe('a'); // avg 2.5
    expect(sorted[2].userId).toBe('c'); // avg 3.0 (worst)
  });

  it('breaks tie by second_places and third_places', () => {
    const entries = [
      makeEntry({ userId: 'a', victoryPoints: 1, secondPlaces: 1, thirdPlaces: 0 }),
      makeEntry({ userId: 'b', victoryPoints: 1, secondPlaces: 2, thirdPlaces: 0 }),
      makeEntry({ userId: 'c', victoryPoints: 1, secondPlaces: 1, thirdPlaces: 2 }),
    ];
    const sorted = service.applyTiebreakers(entries, ['victory_points', 'second_places', 'third_places']);
    expect(sorted[0].userId).toBe('b'); // 2 seconds
    expect(sorted[1].userId).toBe('c'); // 1 second, 2 thirds
    expect(sorted[2].userId).toBe('a'); // 1 second, 0 thirds
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
