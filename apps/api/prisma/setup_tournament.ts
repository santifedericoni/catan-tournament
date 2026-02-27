import { PrismaClient, TournamentStatus, TournamentFormat, StageType, RegistrationStatus, RoundStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;

async function main() {
    const mainEmail = 'santiago.federiconi@gmail.com';
    const passwordHash = await bcrypt.hash('Password123!', BCRYPT_ROUNDS);

    console.log('🚀 Starting setup for Santiago...');

    // 1. Create or update the main user
    const mainUser = await prisma.user.upsert({
        where: { email: mainEmail },
        update: {},
        create: {
            email: mainEmail,
            passwordHash,
            displayName: 'Santiago Federiconi',
            emailVerified: true,
            stats: {
                create: {
                    eloRating: 1200,
                },
            },
        },
    });

    console.log(`✅ Main user ready: ${mainUser.email}`);

    // 2. Create the tournament
    const tournament = await prisma.tournament.create({
        data: {
            name: 'Gran Torneo de Catan de Santiago',
            description: 'Torneo de 32 personas organizado por Santiago.',
            location: 'Buenos Aires, Argentina',
            isOnline: false,
            startsAt: new Date(),
            timezone: 'America/Argentina/Buenos_Aires',
            maxPlayers: 32,
            status: TournamentStatus.RUNNING,
            format: TournamentFormat.N_ROUNDS_TOP4_FINAL,
            createdBy: mainUser.id,
        },
    });

    // Organizer role
    await prisma.tournamentRole.create({
        data: {
            tournamentId: tournament.id,
            userId: mainUser.id,
            role: 'OWNER',
        },
    });

    console.log(`✅ Tournament created: ${tournament.name}`);

    // 3. Create 32 participants
    const players = [];
    for (let i = 1; i <= 32; i++) {
        const email = `player${i}@example.com`;
        const user = await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
                email,
                passwordHash,
                displayName: `Player ${i}`,
                alias: `player${i}`,
                emailVerified: true,
                stats: {
                    create: {
                        eloRating: 1000 + Math.floor(Math.random() * 200),
                    },
                },
            },
        });
        players.push(user);

        // Register and check-in
        await prisma.tournamentRegistration.create({
            data: {
                tournamentId: tournament.id,
                userId: user.id,
                status: RegistrationStatus.CHECKED_IN,
            },
        });
    }

    console.log('✅ 32 players created and checked in');

    // 4. Create Qualifier Stage
    const qualifierStage = await prisma.stage.create({
        data: {
            tournamentId: tournament.id,
            type: StageType.QUALIFIER,
            sequenceOrder: 1,
            config: { targetRounds: 3, advancingCount: 4 },
        },
    });

    // 5. Create Round 1
    const round1 = await prisma.round.create({
        data: {
            stageId: qualifierStage.id,
            roundNumber: 1,
            status: RoundStatus.IN_PROGRESS,
            startedAt: new Date(),
        },
    });

    // 6. Generate Tables (8 tables of 4 players)
    // Shuffle players
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);

    for (let i = 0; i < 8; i++) {
        const tablePlayerIds = shuffledPlayers.slice(i * 4, (i + 1) * 4);
        const table = await prisma.table.create({
            data: {
                roundId: round1.id,
                tableNumber: i + 1,
                seats: {
                    create: tablePlayerIds.map((p, seatIdx) => ({
                        userId: p.id,
                        seatNumber: seatIdx + 1,
                    })),
                },
            },
        });

        console.log(`  🎲 Created Table ${i + 1} with ${tablePlayerIds.length} players`);
    }

    console.log('\n✨ Setup complete! Everything is ready to start loading results.');
    console.log(`Tournament ID: ${tournament.id}`);
    console.log(`Organizer: ${mainEmail}`);
    console.log('Password for all users: Password123!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
