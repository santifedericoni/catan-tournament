import { Injectable } from '@nestjs/common';

export interface PlayerWithPoints {
  id: string;
  currentPoints: number;
}

/**
 * Table generation algorithms for Catan tournament rounds.
 *
 * Design decisions:
 * - RANDOM: greedy assignment with penalty matrix to minimize repeat matchups.
 *   Fisher-Yates shuffle ensures base randomness; penalty scoring favors pairing
 *   players who haven't met yet.
 * - BALANCED: sort by current tournament points, group into consecutive buckets of 4.
 *   This creates competitive tables where players of similar standing face each other.
 * - MANUAL: organizer provides table assignments directly; no algorithm applied.
 * - Remainder handling: 3-player tables are valid in Catan. 1-2 remainder players
 *   get appended to the last table (with a warning to the organizer).
 */
@Injectable()
export class TableGenerationService {
  /**
   * RANDOM mode: greedy assignment minimizing repeat matchup penalties.
   *
   * Time complexity: O(N^2) in the worst case for penalty lookups.
   * Space complexity: O(M) for matchup history (M = number of past matchups).
   *
   * @param playerIds - List of approved player IDs
   * @param matchupHistory - Past matchups in this tournament [(userIdA, userIdB)]
   * @returns Arrays of player IDs per table
   */
  generateRandom(
    playerIds: string[],
    matchupHistory: Array<{ userIdA: string; userIdB: string }>,
  ): string[][] {
    const penalties = this.buildPenaltyMatrix(matchupHistory);
    const shuffled = this.fisherYatesShuffle([...playerIds]);
    const tables: string[][] = [];
    const remaining = [...shuffled];

    while (remaining.length >= 4) {
      const anchor = remaining.shift()!;
      const table = [anchor];

      // Score each remaining player by penalty sum against current table members
      const scored = remaining.map((candidate) => ({
        id: candidate,
        score: this.computePenalty(candidate, table, penalties),
      }));

      // Sort ascending: fewer repeat matchups = better
      // Add small random noise for tie-breaking to avoid deterministic output
      scored.sort((a, b) => a.score - b.score || Math.random() - 0.5);

      const picked = scored.slice(0, 3).map((s) => s.id);
      table.push(...picked);
      tables.push(table);

      const pickedSet = new Set(picked);
      remaining.splice(0, remaining.length, ...remaining.filter((p) => !pickedSet.has(p)));
    }

    this.handleRemainder(remaining, tables);
    return tables;
  }

  /**
   * BALANCED mode: group players by current tournament performance.
   * Top 4 players (by points) form table 1, next 4 form table 2, etc.
   *
   * @param players - Players with their current tournament point totals
   * @returns Arrays of player IDs per table
   */
  generateBalanced(players: PlayerWithPoints[]): string[][] {
    const sorted = [...players].sort((a, b) => b.currentPoints - a.currentPoints);
    const tables: string[][] = [];
    const remainder: string[] = [];

    for (let i = 0; i < sorted.length; i += 4) {
      const bucket = sorted.slice(i, i + 4);
      if (bucket.length === 4) {
        tables.push(bucket.map((p) => p.id));
      } else {
        remainder.push(...bucket.map((p) => p.id));
      }
    }

    this.handleRemainder(remainder, tables);
    return tables;
  }

  /**
   * Build penalty matrix from matchup history.
   * penalty[a][b] = number of times a and b were at the same table.
   */
  private buildPenaltyMatrix(
    matchupHistory: Array<{ userIdA: string; userIdB: string }>,
  ): Map<string, Map<string, number>> {
    const penalties = new Map<string, Map<string, number>>();

    for (const { userIdA, userIdB } of matchupHistory) {
      if (!penalties.has(userIdA)) penalties.set(userIdA, new Map());
      if (!penalties.has(userIdB)) penalties.set(userIdB, new Map());

      const a = penalties.get(userIdA)!;
      const b = penalties.get(userIdB)!;
      a.set(userIdB, (a.get(userIdB) ?? 0) + 1);
      b.set(userIdA, (b.get(userIdA) ?? 0) + 1);
    }

    return penalties;
  }

  /**
   * Compute total penalty for adding a candidate to a partial table.
   */
  private computePenalty(
    candidate: string,
    tableMembers: string[],
    penalties: Map<string, Map<string, number>>,
  ): number {
    const candidatePenalties = penalties.get(candidate);
    if (!candidatePenalties) return 0;
    return tableMembers.reduce((sum, member) => sum + (candidatePenalties.get(member) ?? 0), 0);
  }

  /**
   * Handle remainder players after table filling.
   * - 3 remaining: valid 3-player Catan table
   * - 1-2 remaining: append to last table (note: this should trigger organizer warning)
   */
  private handleRemainder(remaining: string[], tables: string[][]): void {
    if (remaining.length === 0) return;

    if (remaining.length === 3) {
      tables.push(remaining);
      return;
    }

    // 1 or 2 remaining: try to attach to the last table if it has room (up to 4)
    if (tables.length === 0) {
      tables.push(remaining);
      return;
    }

    for (const player of remaining) {
      const lastTable = tables[tables.length - 1];
      if (lastTable.length < 4) {
        lastTable.push(player);
      } else {
        // Overflow: create a small table, organizer must resolve manually
        tables.push([player]);
      }
    }
  }

  /**
   * Fisher-Yates shuffle (in-place, returns the array for convenience).
   */
  private fisherYatesShuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Extract all pairwise matchups from a table assignment.
   * Used to record matchup history after round is generated.
   */
  extractMatchups(tables: string[][]): Array<{ userIdA: string; userIdB: string }> {
    const matchups: Array<{ userIdA: string; userIdB: string }> = [];
    for (const table of tables) {
      for (let i = 0; i < table.length; i++) {
        for (let j = i + 1; j < table.length; j++) {
          matchups.push({ userIdA: table[i], userIdB: table[j] });
        }
      }
    }
    return matchups;
  }
}
