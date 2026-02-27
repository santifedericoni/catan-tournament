import { EloCalculator } from '../elo.calculator';

describe('EloCalculator', () => {
  describe('kFactor', () => {
    it('returns 32 for fewer than 10 games', () => {
      expect(EloCalculator.kFactor(0)).toBe(32);
      expect(EloCalculator.kFactor(9)).toBe(32);
    });

    it('returns 24 for 10-29 games', () => {
      expect(EloCalculator.kFactor(10)).toBe(24);
      expect(EloCalculator.kFactor(29)).toBe(24);
    });

    it('returns 16 for 30-99 games', () => {
      expect(EloCalculator.kFactor(30)).toBe(16);
      expect(EloCalculator.kFactor(99)).toBe(16);
    });

    it('returns 12 for 100+ games', () => {
      expect(EloCalculator.kFactor(100)).toBe(12);
      expect(EloCalculator.kFactor(500)).toBe(12);
    });
  });

  describe('actualScore', () => {
    it('calculates correct scores for 4-player game', () => {
      expect(EloCalculator.actualScore(1, 4)).toBeCloseTo(0.4, 5);
      expect(EloCalculator.actualScore(2, 4)).toBeCloseTo(0.3, 5);
      expect(EloCalculator.actualScore(3, 4)).toBeCloseTo(0.2, 5);
      expect(EloCalculator.actualScore(4, 4)).toBeCloseTo(0.1, 5);
    });

    it('sums to exactly 1.0 for 4-player game', () => {
      const total = [1, 2, 3, 4].reduce(
        (sum, pos) => sum + EloCalculator.actualScore(pos, 4),
        0,
      );
      expect(total).toBeCloseTo(1.0, 10);
    });

    it('sums to exactly 1.0 for 3-player game', () => {
      const total = [1, 2, 3].reduce(
        (sum, pos) => sum + EloCalculator.actualScore(pos, 3),
        0,
      );
      expect(total).toBeCloseTo(1.0, 10);
    });

    it('position 1 always receives the highest score', () => {
      expect(EloCalculator.actualScore(1, 4)).toBeGreaterThan(EloCalculator.actualScore(2, 4));
      expect(EloCalculator.actualScore(2, 4)).toBeGreaterThan(EloCalculator.actualScore(3, 4));
      expect(EloCalculator.actualScore(3, 4)).toBeGreaterThan(EloCalculator.actualScore(4, 4));
    });
  });

  describe('expectedScore', () => {
    it('returns 0.5 when player and opponent have equal ratings', () => {
      expect(EloCalculator.expectedScore(1000, 1000)).toBeCloseTo(0.5, 5);
    });

    it('returns > 0.5 when player is stronger', () => {
      expect(EloCalculator.expectedScore(1200, 1000)).toBeGreaterThan(0.5);
    });

    it('returns < 0.5 when player is weaker', () => {
      expect(EloCalculator.expectedScore(800, 1000)).toBeLessThan(0.5);
    });
  });

  describe('calculateUpdates', () => {
    it('returns empty array for fewer than 2 players', () => {
      const result = EloCalculator.calculateUpdates([
        { userId: 'a', position: 1, currentRating: 1000, gamesPlayed: 0 },
      ]);
      expect(result).toHaveLength(0);
    });

    it('assigns winner higher delta than loser for equal-rated players', () => {
      const results = [
        { userId: 'a', position: 1, currentRating: 1000, gamesPlayed: 50 },
        { userId: 'b', position: 2, currentRating: 1000, gamesPlayed: 50 },
        { userId: 'c', position: 3, currentRating: 1000, gamesPlayed: 50 },
        { userId: 'd', position: 4, currentRating: 1000, gamesPlayed: 50 },
      ];
      const updates = EloCalculator.calculateUpdates(results);
      const winner = updates.find((u) => u.userId === 'a')!;
      const loser = updates.find((u) => u.userId === 'd')!;
      expect(winner.delta).toBeGreaterThan(0);
      expect(loser.delta).toBeLessThan(0);
      expect(winner.delta).toBeGreaterThan(loser.delta);
    });

    it('preserves approximate zero-sum property for equal-rated players', () => {
      const results = [
        { userId: 'a', position: 1, currentRating: 1000, gamesPlayed: 50 },
        { userId: 'b', position: 2, currentRating: 1000, gamesPlayed: 50 },
        { userId: 'c', position: 3, currentRating: 1000, gamesPlayed: 50 },
        { userId: 'd', position: 4, currentRating: 1000, gamesPlayed: 50 },
      ];
      const updates = EloCalculator.calculateUpdates(results);
      const totalDelta = updates.reduce((sum, u) => sum + u.delta, 0);
      // For equal-rated players, sum of deltas is 0 (zero-sum)
      expect(Math.abs(totalDelta)).toBeLessThan(0.001);
    });

    it('upsets: unrated player beating high-rated player gains more', () => {
      const results = [
        { userId: 'newcomer', position: 1, currentRating: 1000, gamesPlayed: 3 },
        { userId: 'veteran', position: 4, currentRating: 1400, gamesPlayed: 200 },
        { userId: 'mid1', position: 2, currentRating: 1100, gamesPlayed: 50 },
        { userId: 'mid2', position: 3, currentRating: 1100, gamesPlayed: 50 },
      ];
      const updates = EloCalculator.calculateUpdates(results);
      const newcomer = updates.find((u) => u.userId === 'newcomer')!;
      const veteran = updates.find((u) => u.userId === 'veteran')!;
      // Newcomer wins against stronger field → big positive delta
      expect(newcomer.delta).toBeGreaterThan(0);
      // Veteran loses → negative delta
      expect(veteran.delta).toBeLessThan(0);
    });

    it('enforces rating floor of 100', () => {
      const results = [
        { userId: 'a', position: 1, currentRating: 1000, gamesPlayed: 50 },
        { userId: 'b', position: 2, currentRating: 1000, gamesPlayed: 50 },
        { userId: 'c', position: 3, currentRating: 1000, gamesPlayed: 50 },
        { userId: 'poor', position: 4, currentRating: 101, gamesPlayed: 50 },
      ];
      const updates = EloCalculator.calculateUpdates(results);
      for (const u of updates) {
        expect(u.newRating).toBeGreaterThanOrEqual(100);
      }
    });
  });
});
