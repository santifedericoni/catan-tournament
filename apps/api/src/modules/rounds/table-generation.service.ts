import { Injectable } from '@nestjs/common';

export interface PlayerWithPoints {
  id: string;
  currentPoints: number;
}

/** Generic matchup pair — uses unified participantId (userId or 'guest:UUID') */
export interface MatchupPair {
  participantIdA: string;
  participantIdB: string;
}

/**
 * Table generation algorithms for Catan tournament rounds.
 *
 * Design decisions:
 * - RANDOM: greedy assignment with penalty matrix to minimize repeat matchups.
 *   Fisher-Yates shuffle ensures base randomness; penalty scoring favors pairing
 *   players who haven't met yet. Works for both regular users and guest players.
 * - BALANCED: sort by current tournament points, group into consecutive buckets of 4,
 *   then apply local swaps to separate players who already faced each other.
 * - MANUAL: organizer provides table assignments directly; no algorithm applied.
 * - Remainder handling: 3-player tables are valid in Catan. 1-2 remainder players
 *   get appended to the last table (with a warning to the organizer).
 */
@Injectable()
export class TableGenerationService {
  /**
   * RANDOM mode: greedy assignment minimizing repeat matchup penalties.
   * Works with any participantId (userId or 'guest:UUID').
   *
   * @param playerIds - List of approved player IDs (userId or 'guest:UUID')
   * @param matchupHistory - Past matchups using unified participantIds
   * @returns Arrays of player IDs per table
   */
  generateRandom(
    playerIds: string[],
    matchupHistory: MatchupPair[],
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
   * BALANCED mode: group players by current tournament performance, then apply
   * local swaps to minimize repeat matchups within the sorted groupings.
   * Top 4 players (by points) form table 1, next 4 form table 2, etc.
   *
   * @param players - Players with their current tournament point totals
   * @param matchupHistory - Past matchups, used to avoid repeats via swapping
   * @returns Arrays of player IDs per table
   */
  generateBalanced(players: PlayerWithPoints[], matchupHistory: MatchupPair[] = []): string[][] {
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

    // Apply swaps between adjacent tables to reduce repeat matchups
    if (matchupHistory.length > 0) {
      this.applyAntiRepeatSwaps(tables, matchupHistory);
    }

    return tables;
  }

  /**
   * Build penalty matrix from matchup history using unified participantIds.
   * penalty[a][b] = number of times a and b were at the same table.
   */
  private buildPenaltyMatrix(
    matchupHistory: MatchupPair[],
  ): Map<string, Map<string, number>> {
    const penalties = new Map<string, Map<string, number>>();

    for (const { participantIdA, participantIdB } of matchupHistory) {
      if (!penalties.has(participantIdA)) penalties.set(participantIdA, new Map());
      if (!penalties.has(participantIdB)) penalties.set(participantIdB, new Map());

      const a = penalties.get(participantIdA)!;
      const b = penalties.get(participantIdB)!;
      a.set(participantIdB, (a.get(participantIdB) ?? 0) + 1);
      b.set(participantIdA, (b.get(participantIdA) ?? 0) + 1);
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
   * Compute total repeat-matchup score for a table (sum of all pair penalties).
   */
  private tableScore(
    table: string[],
    penalties: Map<string, Map<string, number>>,
  ): number {
    let score = 0;
    for (let i = 0; i < table.length; i++) {
      for (let j = i + 1; j < table.length; j++) {
        score += penalties.get(table[i])?.get(table[j]) ?? 0;
      }
    }
    return score;
  }

  /**
   * Reduce repeat matchups in balanced tables by swapping players between
   * adjacent tables. Only swaps that strictly reduce the combined repeat-matchup
   * score are accepted. Runs up to 3 passes to converge.
   *
   * Adjacent-only swaps preserve the "similar strength plays together" invariant
   * of balanced mode while avoiding the worst repeat collisions.
   */
  private applyAntiRepeatSwaps(tables: string[][], matchupHistory: MatchupPair[]): void {
    const penalties = this.buildPenaltyMatrix(matchupHistory);

    for (let pass = 0; pass < 3; pass++) {
      let improved = false;
      for (let t = 0; t < tables.length - 1; t++) {
        const tableA = tables[t];
        const tableB = tables[t + 1];

        for (let i = 0; i < tableA.length; i++) {
          for (let j = 0; j < tableB.length; j++) {
            const scoreBefore = this.tableScore(tableA, penalties) + this.tableScore(tableB, penalties);

            // Try swapping tableA[i] with tableB[j]
            [tableA[i], tableB[j]] = [tableB[j], tableA[i]];
            const scoreAfter = this.tableScore(tableA, penalties) + this.tableScore(tableB, penalties);

            if (scoreAfter < scoreBefore) {
              improved = true; // Keep swap
            } else {
              // Revert
              [tableA[i], tableB[j]] = [tableB[j], tableA[i]];
            }
          }
        }
      }
      if (!improved) break;
    }
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
   * Extract all pairwise matchups from a table assignment using unified participantIds.
   * Used to record matchup history after round is generated.
   */
  extractMatchups(tables: string[][]): MatchupPair[] {
    const matchups: MatchupPair[] = [];
    for (const table of tables) {
      for (let i = 0; i < table.length; i++) {
        for (let j = i + 1; j < table.length; j++) {
          matchups.push({ participantIdA: table[i], participantIdB: table[j] });
        }
      }
    }
    return matchups;
  }
}
