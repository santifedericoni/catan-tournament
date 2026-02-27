/**
 * Seed script: creates 20 players + 1 complete tournament (3 rounds + final)
 * Run with: npm run db:seed --workspace=apps/api
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 10; // Lower for seed speed

interface PlayerSeed {
  displayName: string;
  alias: string;
  country: string;
  eloRating: number;
  tournamentsPlayed: number;
}

const PLAYERS: PlayerSeed[] = [
  { displayName: 'Magnus Settler', alias: 'magnus', country: 'NO', eloRating: 1450, tournamentsPlayed: 25 },
  { displayName: 'Ana Catan', alias: 'anacatan', country: 'BR', eloRating: 1380, tournamentsPlayed: 18 },
  { displayName: 'Rodrigo Brick', alias: 'rbrick', country: 'AR', eloRating: 1320, tournamentsPlayed: 15 },
  { displayName: 'Liu Wei', alias: 'lwei', country: 'CN', eloRating: 1290, tournamentsPlayed: 12 },
  { displayName: 'Sarah Ore', alias: 'sore', country: 'US', eloRating: 1260, tournamentsPlayed: 10 },
  { displayName: 'Tomás Grain', alias: 'tgrain', country: 'ES', eloRating: 1230, tournamentsPlayed: 9 },
  { displayName: 'Emma Harbor', alias: 'eharbor', country: 'DE', eloRating: 1200, tournamentsPlayed: 8 },
  { displayName: 'Carlos Road', alias: 'croad', country: 'MX', eloRating: 1180, tournamentsPlayed: 7 },
  { displayName: 'Yuki Sheep', alias: 'ysheep', country: 'JP', eloRating: 1150, tournamentsPlayed: 6 },
  { displayName: 'Ivan Robber', alias: 'irobber', country: 'RU', eloRating: 1120, tournamentsPlayed: 5 },
  { displayName: 'Fatima Desert', alias: 'fdesert', country: 'MA', eloRating: 1100, tournamentsPlayed: 5 },
  { displayName: 'Pierre Longest', alias: 'plongest', country: 'FR', eloRating: 1080, tournamentsPlayed: 4 },
  { displayName: 'Björn Knight', alias: 'bknight', country: 'SE', eloRating: 1060, tournamentsPlayed: 4 },
  { displayName: 'Priya Settlement', alias: 'psettl', country: 'IN', eloRating: 1040, tournamentsPlayed: 3 },
  { displayName: 'Marco City', alias: 'mcity', country: 'IT', eloRating: 1020, tournamentsPlayed: 3 },
  { displayName: 'Kenji Army', alias: 'karmy', country: 'JP', eloRating: 1010, tournamentsPlayed: 2 },
  { displayName: 'Léa Wool', alias: 'lwool', country: 'BE', eloRating: 1005, tournamentsPlayed: 1 },
  // Unranked players (never played)
  { displayName: 'New Player A', alias: 'newA', country: 'US', eloRating: 1000, tournamentsPlayed: 0 },
  { displayName: 'New Player B', alias: 'newB', country: 'CA', eloRating: 1000, tournamentsPlayed: 0 },
  { displayName: 'New Player C', alias: 'newC', country: 'AU', eloRating: 1000, tournamentsPlayed: 0 },
];

function deterministicShuffle<T>(arr: T[], seed: number): T[] {
  const copy = [...arr];
  // Simple seeded shuffle using linear congruential generator
  let s = seed;
  for (let i = copy.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function assignResults(playerIds: string[]): Array<{ userId: string; position: number; victoryPoints: number }> {
  return playerIds.map((userId, idx) => ({
    userId,
    position: idx + 1,
    victoryPoints: idx === 0 ? 1 : 0,
  }));
}

async function main() {
  console.log('🌱 Starting seed...');

  // Clean up existing seed data
  await prisma.auditLog.deleteMany();
  await prisma.matchupHistory.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.result.deleteMany();
  await prisma.tableSeat.deleteMany();
  await prisma.table.deleteMany();
  await prisma.round.deleteMany();
  await prisma.stage.deleteMany();
  await prisma.tournamentRegistration.deleteMany();
  await prisma.tournamentRole.deleteMany();
  await prisma.tournament.deleteMany();
  await prisma.ratingHistory.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.userStats.deleteMany();
  await prisma.user.deleteMany({ where: { email: { endsWith: '@seed.catan' } } });

  console.log('🧹 Cleaned existing seed data');

  // Create users
  const passwordHash = await bcrypt.hash('Password123!', BCRYPT_ROUNDS);
  const users: Array<{ id: string; alias: string; eloRating: number }> = [];

  for (const p of PLAYERS) {
    const user = await prisma.user.create({
      data: {
        email: `${p.alias}@seed.catan`,
        passwordHash,
        displayName: p.displayName,
        alias: p.alias,
        country: p.country,
        emailVerified: true,
        stats: {
          create: {
            eloRating: p.eloRating,
            eloUncertainty: p.tournamentsPlayed === 0 ? 350 : Math.max(50, 350 - p.tournamentsPlayed * 15),
            tournamentsPlayed: p.tournamentsPlayed,
            totalWins: Math.floor(p.tournamentsPlayed * 0.15),
            avgPosition: p.tournamentsPlayed > 0 ? 2.3 : null,
          },
        },
      },
    });
    users.push({ id: user.id, alias: p.alias, eloRating: p.eloRating });
    console.log(`  👤 Created ${p.displayName}`);
  }

  console.log(`✅ Created ${users.length} users`);

  // Create tournament
  const organizer = users[0];
  const tournament = await prisma.tournament.create({
    data: {
      name: 'Catan World Series 2025',
      description: 'Official annual championship. 3 qualifier rounds + top 4 final.',
      location: 'Berlin, Germany',
      isOnline: false,
      startsAt: new Date('2025-10-15T09:00:00Z'),
      timezone: 'Europe/Berlin',
      maxPlayers: 20,
      status: 'RUNNING',
      format: 'N_ROUNDS_TOP4_FINAL',
      tiebreakerOrder: ['victory_points', 'catan_points', 'wins', 'opponent_strength', 'avg_position'],
      tableGenerationMode: 'RANDOM',
      createdBy: organizer.id,
    },
  });

  // Organizer role
  await prisma.tournamentRole.create({
    data: { tournamentId: tournament.id, userId: organizer.id, role: 'OWNER' },
  });

  // Staff: second user
  await prisma.tournamentRole.create({
    data: { tournamentId: tournament.id, userId: users[1].id, role: 'STAFF' },
  });

  console.log(`✅ Created tournament: ${tournament.name}`);

  // Register all players as APPROVED
  for (const user of users) {
    await prisma.tournamentRegistration.create({
      data: {
        tournamentId: tournament.id,
        userId: user.id,
        status: 'CHECKED_IN',
      },
    });
  }

  console.log(`✅ Registered ${users.length} players`);

  // Create qualifier stage
  const qualifierStage = await prisma.stage.create({
    data: {
      tournamentId: tournament.id,
      type: 'QUALIFIER',
      sequenceOrder: 1,
      config: { targetRounds: 3, advancingCount: 4 },
    },
  });

  // Simulate 3 rounds
  const matchupTracker: Array<{ userIdA: string; userIdB: string }> = [];
  const playerPoints = new Map<string, number>(users.map((u) => [u.id, 0]));

  for (let roundNum = 1; roundNum <= 3; roundNum++) {
    console.log(`  ⚙️  Generating round ${roundNum}...`);

    const round = await prisma.round.create({
      data: {
        stageId: qualifierStage.id,
        roundNumber: roundNum,
        status: 'COMPLETED',
        startedAt: new Date(Date.UTC(2025, 9, 15, 8 + roundNum, 0, 0)),
        completedAt: new Date(Date.UTC(2025, 9, 15, 9 + roundNum, 30, 0)),
      },
    });

    // Shuffle players avoiding repeats (simplified for seed)
    const shuffled = deterministicShuffle([...users], roundNum * 42);
    const tables: string[][] = [];
    for (let i = 0; i < shuffled.length; i += 4) {
      tables.push(shuffled.slice(i, i + 4).map((u) => u.id));
    }

    for (let tableIdx = 0; tableIdx < tables.length; tableIdx++) {
      const tablePlayerIds = tables[tableIdx];
      const table = await prisma.table.create({
        data: {
          roundId: round.id,
          tableNumber: tableIdx + 1,
          seats: {
            create: tablePlayerIds.map((userId, seatIdx) => ({
              userId,
              seatNumber: seatIdx + 1,
            })),
          },
        },
      });

      // Assign results: order by current Elo (higher Elo = more likely to win, with randomness)
      const tableWithElo = tablePlayerIds.map((id) => ({
        id,
        elo: users.find((u) => u.id === id)?.eloRating ?? 1000,
        noise: Math.sin(tableIdx * 100 + roundNum * 17 + users.findIndex((u) => u.id === id)) * 100,
      }));
      tableWithElo.sort((a, b) => (b.elo + b.noise) - (a.elo + a.noise));
      const orderedIds = tableWithElo.map((p) => p.id);
      const results = assignResults(orderedIds);

      await prisma.result.createMany({
        data: results.map((r) => ({
          tableId: table.id,
          userId: r.userId,
          position: r.position,
          victoryPoints: r.victoryPoints,
          isConfirmed: true,
        })),
      });

      // Update points tracker
      for (const r of results) {
        playerPoints.set(r.userId, (playerPoints.get(r.userId) ?? 0) + r.victoryPoints);
      }

      // Record matchup history
      for (let a = 0; a < tablePlayerIds.length; a++) {
        for (let b = a + 1; b < tablePlayerIds.length; b++) {
          matchupTracker.push({ userIdA: tablePlayerIds[a], userIdB: tablePlayerIds[b] });
          await prisma.matchupHistory.create({
            data: {
              tournamentId: tournament.id,
              roundId: round.id,
              userIdA: tablePlayerIds[a],
              userIdB: tablePlayerIds[b],
            },
          });
        }
      }
    }

    console.log(`  ✅ Round ${roundNum} complete`);
  }

  // Determine top 4 for final
  const sortedByPoints = [...users].sort(
    (a, b) => (playerPoints.get(b.id) ?? 0) - (playerPoints.get(a.id) ?? 0),
  );
  const finalists = sortedByPoints.slice(0, 4);

  console.log('  🏆 Finalists:', finalists.map((f) => f.alias).join(', '));

  // Create final stage
  const finalStage = await prisma.stage.create({
    data: {
      tournamentId: tournament.id,
      type: 'FINAL',
      sequenceOrder: 2,
      config: { advancingCount: 4 },
    },
  });

  const finalRound = await prisma.round.create({
    data: {
      stageId: finalStage.id,
      roundNumber: 1,
      status: 'COMPLETED',
      startedAt: new Date('2025-10-15T15:00:00Z'),
      completedAt: new Date('2025-10-15T17:00:00Z'),
    },
  });

  const finalTable = await prisma.table.create({
    data: {
      roundId: finalRound.id,
      tableNumber: 1,
      seats: {
        create: finalists.map((u, idx) => ({
          userId: u.id,
          seatNumber: idx + 1,
        })),
      },
    },
  });

  // Final results: sorted by Elo with a small upset for the winner
  const finalOrder = [...finalists].sort((a, b) => {
    // Add deterministic noise to create an upset
    const noiseA = Math.sin(a.eloRating * 0.01) * 50;
    const noiseB = Math.sin(b.eloRating * 0.01) * 50;
    return (b.eloRating + noiseB) - (a.eloRating + noiseA);
  });

  await prisma.result.createMany({
    data: finalOrder.map((u, idx) => ({
      tableId: finalTable.id,
      userId: u.id,
      position: idx + 1,
      victoryPoints: idx === 0 ? 1 : 0,
      isConfirmed: true,
    })),
  });

  // Mark tournament as finished
  await prisma.tournament.update({
    where: { id: tournament.id },
    data: { status: 'FINISHED' },
  });

  // Create audit log entries
  await prisma.auditLog.createMany({
    data: [
      {
        tournamentId: tournament.id,
        action: 'TOURNAMENT_CREATED',
        actorId: organizer.id,
        payload: { name: tournament.name },
        createdAt: new Date('2025-10-01T10:00:00Z'),
      },
      {
        tournamentId: tournament.id,
        action: 'TOURNAMENT_PUBLISHED',
        actorId: organizer.id,
        payload: {},
        createdAt: new Date('2025-10-01T10:05:00Z'),
      },
      {
        tournamentId: tournament.id,
        action: 'TOURNAMENT_FINISHED',
        actorId: organizer.id,
        payload: { winner: finalOrder[0].alias },
        createdAt: new Date('2025-10-15T17:05:00Z'),
      },
    ],
  });

  console.log('✅ Final round complete');
  console.log(`🏆 Champion: ${finalOrder[0].alias}`);
  console.log('');
  console.log('📊 Final Standings (by qualifier points):');
  sortedByPoints.slice(0, 8).forEach((u, i) => {
    console.log(`  ${i + 1}. ${u.alias}: ${playerPoints.get(u.id) ?? 0} pts`);
  });

  console.log('');
  console.log('✅ Seed complete!');
  console.log('');
  console.log('🔑 Login credentials (all users):');
  console.log('   Password: Password123!');
  console.log('   Emails: {alias}@seed.catan (e.g. magnus@seed.catan)');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
