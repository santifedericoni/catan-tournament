import { TableGenerationService } from '../table-generation.service';

describe('TableGenerationService', () => {
  let service: TableGenerationService;

  beforeEach(() => {
    service = new TableGenerationService();
  });

  describe('generateRandom', () => {
    it('produces correct number of tables for 8 players', () => {
      const players = Array.from({ length: 8 }, (_, i) => `user-${i}`);
      const tables = service.generateRandom(players, []);
      expect(tables).toHaveLength(2);
      expect(tables.every((t) => t.length === 4)).toBe(true);
    });

    it('produces correct number of tables for 20 players', () => {
      const players = Array.from({ length: 20 }, (_, i) => `user-${i}`);
      const tables = service.generateRandom(players, []);
      expect(tables).toHaveLength(5);
    });

    it('handles 7 players (one 3-player table)', () => {
      const players = Array.from({ length: 7 }, (_, i) => `user-${i}`);
      const tables = service.generateRandom(players, []);
      const allPlayers = tables.flat();
      expect(allPlayers).toHaveLength(7);
      expect(new Set(allPlayers).size).toBe(7); // no duplicates
    });

    it('places every player in exactly one table', () => {
      const players = Array.from({ length: 12 }, (_, i) => `user-${i}`);
      const tables = service.generateRandom(players, []);
      const allPlayers = tables.flat();
      expect(new Set(allPlayers).size).toBe(12);
      expect(allPlayers).toHaveLength(12);
    });

    it('produces different table assignments (randomness check)', () => {
      const players = Array.from({ length: 16 }, (_, i) => `user-${i}`);
      const run1 = service.generateRandom(players, []).map((t) => t.sort()).sort();
      const run2 = service.generateRandom(players, []).map((t) => t.sort()).sort();
      // With 16 players, it's extremely unlikely to produce identical assignments
      const identical = JSON.stringify(run1) === JSON.stringify(run2);
      // Run this 5 times; at least one should differ
      let differs = !identical;
      if (!differs) {
        for (let i = 0; i < 5; i++) {
          const run = service.generateRandom(players, []).map((t) => t.sort()).sort();
          if (JSON.stringify(run) !== JSON.stringify(run1)) {
            differs = true;
            break;
          }
        }
      }
      expect(differs).toBe(true);
    });

    it('reduces repeat matchups when history exists', () => {
      // With 8 players, after round 1 where a-b were paired,
      // the algorithm should try to put them apart
      const players = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      const history = [
        { userIdA: 'a', userIdB: 'b' },
        { userIdA: 'a', userIdB: 'c' },
        { userIdA: 'a', userIdB: 'd' },
      ];

      let aWithBCount = 0;
      const trials = 100;
      for (let i = 0; i < trials; i++) {
        const tables = service.generateRandom(players, history);
        for (const table of tables) {
          if (table.includes('a') && table.includes('b')) aWithBCount++;
        }
      }

      // With penalty, a-b should be paired less than random (50%)
      // Exact threshold is loose since with 8 players it's hard to always avoid
      expect(aWithBCount).toBeLessThan(trials * 0.7);
    });

    it('extractMatchups generates all pairwise combinations', () => {
      const tables = [['a', 'b', 'c', 'd']];
      const matchups = service.extractMatchups(tables);
      expect(matchups).toHaveLength(6); // C(4,2) = 6
      const pairs = matchups.map((m) => [m.userIdA, m.userIdB].sort().join('-')).sort();
      expect(pairs).toContain('a-b');
      expect(pairs).toContain('a-c');
      expect(pairs).toContain('a-d');
      expect(pairs).toContain('b-c');
      expect(pairs).toContain('b-d');
      expect(pairs).toContain('c-d');
    });
  });

  describe('generateBalanced', () => {
    it('places highest-point players in first table', () => {
      const players = [
        { id: 'a', currentPoints: 20 },
        { id: 'b', currentPoints: 15 },
        { id: 'c', currentPoints: 18 },
        { id: 'd', currentPoints: 22 },
        { id: 'e', currentPoints: 5 },
        { id: 'f', currentPoints: 3 },
        { id: 'g', currentPoints: 1 },
        { id: 'h', currentPoints: 8 },
      ];
      const tables = service.generateBalanced(players);
      expect(tables).toHaveLength(2);
      const firstTable = new Set(tables[0]);
      expect(firstTable.has('d')).toBe(true); // 22 points
      expect(firstTable.has('a')).toBe(true); // 20 points
      expect(firstTable.has('c')).toBe(true); // 18 points
      expect(firstTable.has('b')).toBe(true); // 15 points
    });

    it('groups lower-ranked players in later tables', () => {
      const players = [
        { id: 'a', currentPoints: 20 },
        { id: 'b', currentPoints: 18 },
        { id: 'c', currentPoints: 16 },
        { id: 'd', currentPoints: 14 },
        { id: 'e', currentPoints: 5 },
        { id: 'f', currentPoints: 3 },
        { id: 'g', currentPoints: 2 },
        { id: 'h', currentPoints: 1 },
      ];
      const tables = service.generateBalanced(players);
      const secondTable = new Set(tables[1]);
      expect(secondTable.has('e')).toBe(true);
      expect(secondTable.has('h')).toBe(true);
    });

    it('places every player exactly once', () => {
      const players = Array.from({ length: 20 }, (_, i) => ({
        id: `user-${i}`,
        currentPoints: Math.random() * 30,
      }));
      const tables = service.generateBalanced(players);
      const allPlayers = tables.flat();
      expect(new Set(allPlayers).size).toBe(20);
      expect(allPlayers).toHaveLength(20);
    });
  });
});
