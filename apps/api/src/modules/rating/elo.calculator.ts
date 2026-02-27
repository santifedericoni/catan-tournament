export interface PlayerResult {
  userId: string;
  position: number; // 1-4
  currentRating: number;
  gamesPlayed: number;
}

export interface EloUpdate {
  userId: string;
  oldRating: number;
  newRating: number;
  delta: number;
}

/**
 * Multi-player Elo calculator adapted for 4-player Catan games.
 *
 * Design decisions:
 * - Expected score is computed against the average opponent rating (simpler than pairwise sum,
 *   preserves intuitive meaning: "how do I compare to the field?")
 * - Actual score is normalized so positions 1-4 map to 4/10, 3/10, 2/10, 1/10 respectively.
 *   These sum to exactly 1.0, preserving the zero-sum property of Elo.
 * - K-factor decreases as players gain experience (provisional → established).
 * - Rating floor of 100 prevents degenerate negative ratings.
 * - For 3-player tables, total denominator changes to 6 (3+2+1=6).
 */
export class EloCalculator {
  /**
   * K-factor based on lifetime games played.
   * Higher K = faster rating change (new/unproven players).
   */
  static kFactor(gamesPlayed: number): number {
    if (gamesPlayed < 10) return 32;
    if (gamesPlayed < 30) return 24;
    if (gamesPlayed < 100) return 16;
    return 12;
  }

  /**
   * Expected score for a player against the field.
   * Uses average opponent rating as a proxy for field strength.
   *
   * Formula: E = 1 / (1 + 10^((avgOpp - R) / 400))
   */
  static expectedScore(playerRating: number, avgOpponentRating: number): number {
    return 1 / (1 + Math.pow(10, (avgOpponentRating - playerRating) / 400));
  }

  /**
   * Actual normalized score for a given position.
   * For 4 players: pos 1 → 4/10=0.4, pos 2 → 3/10=0.3, pos 3 → 2/10=0.2, pos 4 → 1/10=0.1
   * Sum across all positions = 1.0
   */
  static actualScore(position: number, totalPlayers: number = 4): number {
    const denominator = (totalPlayers * (totalPlayers + 1)) / 2;
    return (totalPlayers - position + 1) / denominator;
  }

  /**
   * Calculate Elo updates for all players at a table.
   * Called once per completed table, aggregated at tournament completion.
   *
   * @param results - Array of player results at a single table
   * @returns Array of rating updates
   */
  static calculateUpdates(results: PlayerResult[]): EloUpdate[] {
    const n = results.length;
    if (n < 2) return [];

    const totalRating = results.reduce((sum, p) => sum + p.currentRating, 0);

    return results.map((player) => {
      const avgOpponentRating = (totalRating - player.currentRating) / (n - 1);
      const E = this.expectedScore(player.currentRating, avgOpponentRating);
      const S = this.actualScore(player.position, n);
      const K = this.kFactor(player.gamesPlayed);
      const delta = K * (S - E);
      const newRating = Math.max(100, player.currentRating + delta);

      return {
        userId: player.userId,
        oldRating: player.currentRating,
        newRating,
        delta,
      };
    });
  }
}
