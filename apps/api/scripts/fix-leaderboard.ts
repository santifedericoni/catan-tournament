/**
 * Diagnostic & fix script for empty leaderboard issues.
 * Run with: npx ts-node -r tsconfig-paths/register scripts/fix-leaderboard.ts
 * Or:       cd apps/api && npx ts-node scripts/fix-leaderboard.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ log: ['warn', 'error'] });

async function main() {
  console.log('=== Leaderboard Diagnostic ===\n');

  // 1. Show all tournaments
  const tournaments = await prisma.tournament.findMany({
    select: { id: true, name: true },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  console.log('Recent tournaments:');
  for (const t of tournaments) console.log(`  [${t.id}] ${t.name}`);
  console.log();

  // 2. For each tournament, check results state
  for (const t of tournaments) {
    const stages = await prisma.stage.findMany({
      where: { tournamentId: t.id },
      include: {
        rounds: {
          include: {
            tables: {
              include: {
                results: {
                  select: {
                    id: true,
                    userId: true,
                    guestPlayerId: true,
                    isConfirmed: true,
                    position: true,
                    catanPoints: true,
                    victoryPoints: true,
                  },
                },
                _count: { select: { seats: true } },
              },
            },
          },
        },
      },
    });

    let totalResults = 0;
    let corruptResults = 0;
    let validUserResults = 0;
    let validGuestResults = 0;
    let tablesWithOfficialStatus = 0;
    let tablesWithPendingStatus = 0;

    for (const stage of stages) {
      for (const round of stage.rounds) {
        for (const table of round.tables) {
          for (const r of table.results) {
            totalResults++;
            if (r.userId === null && r.guestPlayerId === null) corruptResults++;
            else if (r.userId !== null) validUserResults++;
            else validGuestResults++;
          }
        }
      }
    }

    const tablesAll = await prisma.table.findMany({
      where: { round: { stage: { tournamentId: t.id } } },
      select: { resultStatus: true },
    });
    for (const tb of tablesAll) {
      if (['CONFIRMED', 'OFFICIAL'].includes(tb.resultStatus as string)) tablesWithOfficialStatus++;
      else tablesWithPendingStatus++;
    }

    if (totalResults > 0 || tablesAll.length > 0) {
      console.log(`Tournament: ${t.name}`);
      console.log(`  Tables: ${tablesAll.length} total | ${tablesWithOfficialStatus} CONFIRMED/OFFICIAL | ${tablesWithPendingStatus} other`);
      console.log(`  Results: ${totalResults} total | ${validUserResults} user | ${validGuestResults} guest | ${corruptResults} CORRUPT`);
      if (corruptResults > 0) {
        console.log(`  ⚠️  Found ${corruptResults} corrupt results (userId=null AND guestPlayerId=null)`);
      }
      console.log();
    }
  }

  // 3. Show all corrupt results
  const corrupt = await prisma.result.findMany({
    where: { userId: null, guestPlayerId: null },
    include: {
      table: {
        select: {
          tableNumber: true,
          resultStatus: true,
          round: {
            select: {
              roundNumber: true,
              stage: { select: { type: true, tournament: { select: { name: true } } } },
            },
          },
        },
      },
    },
  });

  if (corrupt.length > 0) {
    console.log(`\n=== ${corrupt.length} CORRUPT RESULTS FOUND ===`);
    for (const r of corrupt) {
      const tname = r.table.round.stage.tournament.name;
      const stage = r.table.round.stage.type;
      const round = r.table.round.roundNumber;
      const table = r.table.tableNumber;
      console.log(`  [${r.id}] ${tname} | ${stage} R${round} T${table} | status=${r.table.resultStatus}`);
    }

    // Ask to fix
    console.log('\nDeleting corrupt results and resetting their tables to PENDING...');
    const corruptIds = corrupt.map((r) => r.id);
    const tableIds = [...new Set(corrupt.map((r) => r.tableId))];

    await prisma.$transaction([
      prisma.result.deleteMany({ where: { id: { in: corruptIds } } }),
      prisma.table.updateMany({
        where: { id: { in: tableIds } },
        data: { resultStatus: 'PENDING', officializedBy: null, officializedAt: null },
      }),
    ]);
    console.log(`Deleted ${corruptIds.length} corrupt results, reset ${tableIds.length} tables to PENDING.`);
  } else {
    console.log('✅ No corrupt results found.');
  }

  // 4. Check for results with guestPlayerId set but guestPlayer missing
  const orphanGuestResults = await prisma.result.findMany({
    where: {
      userId: null,
      guestPlayerId: { not: null },
      guestPlayer: null,
    },
    select: { id: true, guestPlayerId: true, tableId: true },
  });
  if (orphanGuestResults.length > 0) {
    console.log(`\n⚠️  ${orphanGuestResults.length} results with missing GuestPlayer record!`);
    for (const r of orphanGuestResults) {
      console.log(`  [${r.id}] guestPlayerId=${r.guestPlayerId}`);
    }
  } else {
    console.log('✅ All guest results have valid GuestPlayer records.');
  }

  // 5. Show summary of leaderboard-eligible results per tournament
  console.log('\n=== Leaderboard-Eligible Results (isConfirmed + CONFIRMED/OFFICIAL tables) ===');
  for (const t of tournaments) {
    const count = await prisma.result.count({
      where: {
        isConfirmed: true,
        table: {
          resultStatus: { in: ['CONFIRMED', 'OFFICIAL'] },
          round: { stage: { tournamentId: t.id } },
        },
      },
    });
    if (count > 0 || tournaments.length <= 5) {
      console.log(`  ${t.name}: ${count} eligible results`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
