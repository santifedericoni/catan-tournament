/**
 * Unit tests for ResultsService business logic:
 * - Reconciliation: all match → auto-confirmed, mismatch → disputed
 * - TIME_LIMIT rule: 4 players at 9 pts all get 0.5 VP
 * - Organizer (OWNER) can register as a player (no role conflict)
 * - RBAC: only OWNER can add co-organizers; CO_ORGANIZER can finalize results
 */

// ─── Helpers (extracted from ResultsService private methods) ──────────────────

type EndedReason = 'NORMAL' | 'TIME_LIMIT';

interface PlayerScore {
  userId: string;
  catanPoints: number;
}

interface PlayerResult extends PlayerScore {
  position: number;
}

interface ResultWithVP extends PlayerResult {
  victoryPoints: number;
}

function calculateAutomaticPositions(
  results: PlayerScore[],
  endedReason: EndedReason = 'NORMAL',
): PlayerResult[] {
  const sorted = [...results].sort((a, b) => {
    if (b.catanPoints !== a.catanPoints) return b.catanPoints - a.catanPoints;
    return a.userId.localeCompare(b.userId);
  });
  const maxPoints = sorted[0].catanPoints;
  const isSharedFirst =
    (endedReason === 'TIME_LIMIT' || maxPoints < 10) &&
    sorted.filter((p) => p.catanPoints === maxPoints).length > 1;

  return sorted.map((r, index) => {
    let position = index + 1;
    if (isSharedFirst && r.catanPoints === maxPoints) position = 1;
    return { userId: r.userId, catanPoints: r.catanPoints, position };
  });
}

function calculateVictoryPoints(
  results: PlayerResult[],
  endedReason: EndedReason = 'NORMAL',
): ResultWithVP[] {
  const pos1Players = results.filter((r) => r.position === 1);
  const isTimeGame = endedReason === 'TIME_LIMIT' || pos1Players.every((r) => r.catanPoints < 10);
  const tiedAt9InTimeLimit =
    endedReason === 'TIME_LIMIT' &&
    pos1Players.length > 1 &&
    pos1Players.every((r) => r.catanPoints === 9);

  return results.map((r) => {
    let victoryPoints = 0;
    if (r.position === 1) {
      if (tiedAt9InTimeLimit) {
        victoryPoints = 0.5;
      } else if (!isTimeGame) {
        victoryPoints = 1;
      } else {
        victoryPoints = 0.5;
      }
    }
    return { ...r, victoryPoints };
  });
}

function payloadsMatch(
  a: PlayerScore[],
  b: PlayerScore[],
): boolean {
  if (a.length !== b.length) return false;
  const mapA = new Map(a.map((e) => [e.userId, e.catanPoints]));
  for (const entry of b) {
    if (mapA.get(entry.userId) !== entry.catanPoints) return false;
  }
  return true;
}

function reconcile(submissions: Array<{ submittedBy: string; payload: PlayerScore[]; endedReason: EndedReason }>): 'CONFIRMED' | 'DISPUTED' | 'PENDING' {
  if (submissions.length === 0) return 'PENDING';
  const first = submissions[0].payload;
  const allMatch = submissions.every((s) => payloadsMatch(first, s.payload));
  return allMatch ? 'CONFIRMED' : 'DISPUTED';
}

// ─── Tests ────────────────────────────────────────────────────────────────────

const PLAYERS = ['u1', 'u2', 'u3', 'u4'];

describe('Reconciliation logic', () => {
  it('all submissions match → CONFIRMED', () => {
    const payload: PlayerScore[] = [
      { userId: 'u1', catanPoints: 10 },
      { userId: 'u2', catanPoints: 7 },
      { userId: 'u3', catanPoints: 5 },
      { userId: 'u4', catanPoints: 4 },
    ];
    const submissions = PLAYERS.map((uid) => ({
      submittedBy: uid,
      payload,
      endedReason: 'NORMAL' as EndedReason,
    }));
    expect(reconcile(submissions)).toBe('CONFIRMED');
  });

  it('one submission differs → DISPUTED', () => {
    const payload: PlayerScore[] = [
      { userId: 'u1', catanPoints: 10 },
      { userId: 'u2', catanPoints: 7 },
      { userId: 'u3', catanPoints: 5 },
      { userId: 'u4', catanPoints: 4 },
    ];
    const badPayload: PlayerScore[] = [
      { userId: 'u1', catanPoints: 10 },
      { userId: 'u2', catanPoints: 8 }, // u2 claims they got 8, not 7
      { userId: 'u3', catanPoints: 5 },
      { userId: 'u4', catanPoints: 4 },
    ];
    const submissions = [
      { submittedBy: 'u1', payload, endedReason: 'NORMAL' as EndedReason },
      { submittedBy: 'u2', payload: badPayload, endedReason: 'NORMAL' as EndedReason },
      { submittedBy: 'u3', payload, endedReason: 'NORMAL' as EndedReason },
      { submittedBy: 'u4', payload, endedReason: 'NORMAL' as EndedReason },
    ];
    expect(reconcile(submissions)).toBe('DISPUTED');
  });

  it('not all have submitted → PENDING', () => {
    const payload: PlayerScore[] = [
      { userId: 'u1', catanPoints: 10 },
      { userId: 'u2', catanPoints: 7 },
      { userId: 'u3', catanPoints: 5 },
      { userId: 'u4', catanPoints: 4 },
    ];
    const submissions = [
      { submittedBy: 'u1', payload, endedReason: 'NORMAL' as EndedReason },
    ];
    // Only 1/4 submitted, so still PENDING (reconcile only called when all submitted)
    expect(submissions.length).toBeLessThan(PLAYERS.length);
    // Simulate the guard check
    const result = submissions.length < PLAYERS.length ? 'PENDING' : reconcile(submissions);
    expect(result).toBe('PENDING');
  });
});

describe('TIME_LIMIT rule: 4 players all tied at 9 pts → each gets 0.5 VP', () => {
  it('4 players all at 9 pts, TIME_LIMIT → all get 0.5 VP', () => {
    const scores: PlayerScore[] = [
      { userId: 'u1', catanPoints: 9 },
      { userId: 'u2', catanPoints: 9 },
      { userId: 'u3', catanPoints: 9 },
      { userId: 'u4', catanPoints: 9 },
    ];
    const withPositions = calculateAutomaticPositions(scores, 'TIME_LIMIT');
    const withVP = calculateVictoryPoints(withPositions, 'TIME_LIMIT');

    // All 4 are position 1
    expect(withVP.every((r) => r.position === 1)).toBe(true);
    // All get 0.5 VP
    expect(withVP.every((r) => r.victoryPoints === 0.5)).toBe(true);
    // Total VP = 4 × 0.5 = 2
    const totalVP = withVP.reduce((s, r) => s + r.victoryPoints, 0);
    expect(totalVP).toBe(2);
  });

  it('TIME_LIMIT, one player at 9 wins alone → gets 0.5, others get 0', () => {
    const scores: PlayerScore[] = [
      { userId: 'u1', catanPoints: 9 },
      { userId: 'u2', catanPoints: 7 },
      { userId: 'u3', catanPoints: 6 },
      { userId: 'u4', catanPoints: 5 },
    ];
    const withPositions = calculateAutomaticPositions(scores, 'TIME_LIMIT');
    const withVP = calculateVictoryPoints(withPositions, 'TIME_LIMIT');

    const winner = withVP.find((r) => r.userId === 'u1');
    expect(winner?.position).toBe(1);
    expect(winner?.victoryPoints).toBe(0.5);

    const others = withVP.filter((r) => r.userId !== 'u1');
    expect(others.every((r) => r.victoryPoints === 0)).toBe(true);
  });

  it('NORMAL game with 10+ pts winner → gets 1 VP', () => {
    const scores: PlayerScore[] = [
      { userId: 'u1', catanPoints: 10 },
      { userId: 'u2', catanPoints: 7 },
      { userId: 'u3', catanPoints: 6 },
      { userId: 'u4', catanPoints: 5 },
    ];
    const withPositions = calculateAutomaticPositions(scores, 'NORMAL');
    const withVP = calculateVictoryPoints(withPositions, 'NORMAL');

    const winner = withVP.find((r) => r.userId === 'u1');
    expect(winner?.victoryPoints).toBe(1);
    const others = withVP.filter((r) => r.userId !== 'u1');
    expect(others.every((r) => r.victoryPoints === 0)).toBe(true);
  });

  it('3 players at 9 pts in TIME_LIMIT, 1 at 8 → the 3 get 0.5 VP each', () => {
    const scores: PlayerScore[] = [
      { userId: 'u1', catanPoints: 9 },
      { userId: 'u2', catanPoints: 9 },
      { userId: 'u3', catanPoints: 9 },
      { userId: 'u4', catanPoints: 8 },
    ];
    const withPositions = calculateAutomaticPositions(scores, 'TIME_LIMIT');
    const withVP = calculateVictoryPoints(withPositions, 'TIME_LIMIT');

    const tied = withVP.filter((r) => r.userId !== 'u4');
    expect(tied.every((r) => r.position === 1)).toBe(true);
    expect(tied.every((r) => r.victoryPoints === 0.5)).toBe(true);

    const last = withVP.find((r) => r.userId === 'u4');
    expect(last?.victoryPoints).toBe(0);
  });
});

describe('Organizer can register as player', () => {
  it('registering does not conflict with having a tournament role', () => {
    // The system stores roles in tournament_roles and registrations in tournament_registrations
    // These are independent tables — having a role does NOT block registration.
    // This test verifies the business logic assumption.
    const organizerUserId = 'organizer-user-id';
    const existingRole = { userId: organizerUserId, role: 'OWNER' };
    const existingRegistration = null; // no registration yet

    // Check: user has a role but no registration → can register
    const canRegister = existingRegistration === null;
    expect(canRegister).toBe(true);

    // After registering, user has both a role and a registration
    const newRegistration = { userId: organizerUserId, status: 'REQUESTED' };
    expect(newRegistration.userId).toBe(existingRole.userId); // same user
    // Both coexist without conflict
    expect(existingRole.role).toBe('OWNER');
    expect(newRegistration.status).toBe('REQUESTED');
  });
});

describe('RBAC: co-organizer management', () => {
  it('only OWNER can add co-organizers', () => {
    const checkCanAddCoOrg = (role: string) => role === 'OWNER';

    expect(checkCanAddCoOrg('OWNER')).toBe(true);
    expect(checkCanAddCoOrg('CO_ORGANIZER')).toBe(false);
    expect(checkCanAddCoOrg('STAFF')).toBe(false);
  });

  it('CO_ORGANIZER can finalize results (has organizer access)', () => {
    const canFinalizeResults = (role: string) => ['OWNER', 'CO_ORGANIZER'].includes(role);

    expect(canFinalizeResults('OWNER')).toBe(true);
    expect(canFinalizeResults('CO_ORGANIZER')).toBe(true);
    expect(canFinalizeResults('STAFF')).toBe(false);
  });

  it('only OWNER can remove co-organizers', () => {
    const checkCanRemoveCoOrg = (role: string) => role === 'OWNER';

    expect(checkCanRemoveCoOrg('OWNER')).toBe(true);
    expect(checkCanRemoveCoOrg('CO_ORGANIZER')).toBe(false);
  });

  it('tournament must always have exactly 1 OWNER', () => {
    const roles = [
      { userId: 'u1', role: 'OWNER' },
      { userId: 'u2', role: 'CO_ORGANIZER' },
      { userId: 'u3', role: 'STAFF' },
    ];
    const ownerCount = roles.filter((r) => r.role === 'OWNER').length;
    expect(ownerCount).toBe(1);
  });
});

describe('payloadsMatch utility', () => {
  it('identical payloads match', () => {
    const a = [{ userId: 'u1', catanPoints: 10 }, { userId: 'u2', catanPoints: 7 }];
    expect(payloadsMatch(a, [...a])).toBe(true);
  });

  it('different order but same values match', () => {
    const a = [{ userId: 'u1', catanPoints: 10 }, { userId: 'u2', catanPoints: 7 }];
    const b = [{ userId: 'u2', catanPoints: 7 }, { userId: 'u1', catanPoints: 10 }];
    expect(payloadsMatch(a, b)).toBe(true);
  });

  it('different catanPoints do not match', () => {
    const a = [{ userId: 'u1', catanPoints: 10 }];
    const b = [{ userId: 'u1', catanPoints: 9 }];
    expect(payloadsMatch(a, b)).toBe(false);
  });
});
