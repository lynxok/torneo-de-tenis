
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');

if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    console.error("❌ .env file not found.");
    process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function seed() {
    console.log("🌱 Starting Seed Process...");

    // 1. Get or Create Institution
    console.log("Checking Institution...");
    let { data: institutions } = await supabase.from('institutions').select('*').limit(1);
    let instId;

    if (!institutions || institutions.length === 0) {
        const { data: newInst, error: instError } = await supabase.from('institutions').insert({
            name: "Club Central Tennis",
            city: "Buenos Aires",
            courts_total: 6,
            amenities: ["Iluminación LED", "Estacionamiento", "Bar", "Vestuarios"],
            schedule_open: "08:00",
            schedule_close: "23:00"
        }).select().single();

        if (instError) {
            console.error("❌ Failed to create institution:", instError.message);
            process.exit(1);
        }
        instId = newInst.id;
        console.log("✅ Created Institution: Club Central Tennis");
    } else {
        instId = institutions[0].id;
        console.log(`ℹ️ Using existing Institution: ${institutions[0].name}`);
    }

    // 2. Create Dummy Players (Profiles)
    console.log("Creating/Checking Players...");
    const timestamp = Date.now();
    const dummyPlayers = [
        { email: `federer.${timestamp}@demo.com`, name: 'Roger', lastname: 'Federer', category: '1ra', gender: 'M' },
        { email: `nadal.${timestamp}@demo.com`, name: 'Rafa', lastname: 'Nadal', category: '1ra', gender: 'M' },
        { email: `djoko.${timestamp}@demo.com`, name: 'Novak', lastname: 'Djokovic', category: '1ra', gender: 'M' },
        { email: `alcaraz.${timestamp}@demo.com`, name: 'Carlos', lastname: 'Alcaraz', category: '1ra', gender: 'M' },
        { email: `delpotro.${timestamp}@demo.com`, name: 'Juan M.', lastname: 'Del Potro', category: '1ra', gender: 'M' },
        { email: `gaudio.${timestamp}@demo.com`, name: 'Gaston', lastname: 'Gaudio', category: '2da', gender: 'M' },
        { email: `coria.${timestamp}@demo.com`, name: 'Guillermo', lastname: 'Coria', category: '2da', gender: 'M' },
        { email: `nalbandian.${timestamp}@demo.com`, name: 'David', lastname: 'Nalbandian', category: '1ra', gender: 'M' }
    ];

    const playersMap = {}; // email -> id

    for (const p of dummyPlayers) {
        // Check if exists in profiles table
        const { data: existing } = await supabase.from('profiles').select('id').eq('email', p.email).single();

        if (existing) {
            playersMap[p.email] = existing.id;
        } else {
            let userId = null;

            // Admin lookup (handle errors gracefully)
            try {
                const { data: lookupData, error: lookupError } = await supabase.auth.admin.getUserByEmail(p.email);
                if (lookupData?.user) {
                    userId = lookupData.user.id;
                    console.log(`ℹ️ User ${p.email} exists in Auth (${userId})`);
                }
            } catch (e) {
                // Ignore lookup errors, try to create
            }

            if (!userId) {
                const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
                    email: p.email,
                    password: 'password123',
                    email_confirm: true,
                    user_metadata: { name: p.name, lastname: p.lastname }
                });

                if (authError) {
                    if (authError.message.includes("already registered")) {
                        // Double check lookup (sometimes listing/getting fails but creation shows it exists)
                        // Fallback: list all users if specific lookup failed
                        const { data: { users: allUsers } } = await supabase.auth.admin.listUsers();
                        const match = allUsers.find(u => u.email === p.email);
                        if (match) userId = match.id;
                    } else {
                        console.error(`❌ Fatal Auth Error for ${p.email}:`, authError.message);
                        continue;
                    }
                } else if (authUser?.user) {
                    userId = authUser.user.id;
                    console.log(`✅ Created Auth User: ${p.email}`);
                }
            }

            if (userId) {
                const { error: upsertError } = await supabase.from('profiles').upsert({
                    id: userId,
                    name: p.name,
                    lastname: p.lastname,
                    category: p.category,
                    gender: p.gender,
                    institution_id: instId,
                    matches_won: 0,
                    tournaments_won: 0,
                    is_approved: true,
                    email: p.email
                });

                if (upsertError) {
                    console.error(`❌ Profile Error for ${p.name}:`, upsertError.message);
                } else {
                    playersMap[p.email] = userId;
                    console.log(`✅ Profile Ready: ${p.name} ${p.lastname}`);
                }
            }
        }
    }

    // 3. Create Past Tournament (Finished)
    console.log("Creating Past Tournament...");
    const { data: pastTourn } = await supabase.from('tournaments').insert({
        name: "Abierto de Verano 2025",
        institution_id: instId,
        category: "1ra",
        type: "singles",
        status: "finished",
        start_date: "2025-01-10",
        registration_price: 2500,
        champion_name: "Roger Federer"
    }).select().single();

    if (pastTourn) {
        const participants = [
            playersMap['federer.seed@demo.com'],
            playersMap['nadal.seed@demo.com'],
            playersMap['djoko.seed@demo.com'],
            playersMap['nalbandian.seed@demo.com']
        ].filter(Boolean);

        for (const uid of participants) {
            const p = dummyPlayers.find(dp => playersMap[dp.email] === uid);
            await supabase.from('tournament_players').insert({
                tournament_id: pastTourn.id,
                player_id: uid,
                player_name: p ? `${p.name} ${p.lastname}` : 'Unknown',
                category: '1ra',
                payment_status: 'paid',
                fee_amount: 2500,
                matches_played: 2,
                matches_won: uid === playersMap['federer.seed@demo.com'] ? 2 : 0
            });
        }

        // matches
        const p1 = playersMap['federer.seed@demo.com'];
        const p2 = playersMap['djoko.seed@demo.com'];
        const p3 = playersMap['nadal.seed@demo.com'];
        const p4 = playersMap['nalbandian.seed@demo.com'];

        if (p1 && p2) {
            await supabase.from('matches').insert({
                tournament_id: pastTourn.id,
                player1_id: p1, player1_name: "Roger Federer",
                player2_id: p2, player2_name: "Novak Djokovic",
                round: "Semi-Final", winner_id: p1, score: ["6-4", "7-5"],
                status: "completed", scheduling_status: "confirmed"
            });
            await supabase.rpc('increment_matches_won', { userid: p1 });
        }
        if (p3 && p4) {
            await supabase.from('matches').insert({
                tournament_id: pastTourn.id,
                player1_id: p3, player1_name: "Rafa Nadal",
                player2_id: p4, player2_name: "David Nalbandian",
                round: "Semi-Final", winner_id: p3, score: ["7-6", "6-3"],
                status: "completed", scheduling_status: "confirmed"
            });
            await supabase.rpc('increment_matches_won', { userid: p3 });
        }
        if (p1 && p3) {
            await supabase.from('matches').insert({
                tournament_id: pastTourn.id,
                player1_id: p1, player1_name: "Roger Federer",
                player2_id: p3, player2_name: "Rafa Nadal",
                round: "Final", winner_id: p1, score: ["6-3", "4-6", "6-2"],
                status: "completed", scheduling_status: "confirmed"
            });
            await supabase.rpc('increment_matches_won', { userid: p1 });
            await supabase.rpc('increment_tournaments_won', { userid: p1 });
        }
        console.log("✅ Created Past Tournament Matches and Stats");
    }

    // 4. Create Active Tournament
    console.log("Creating Active Tournament...");
    const { data: activeTourn } = await supabase.from('tournaments').insert({
        name: "Otoño 2025 - Series",
        institution_id: instId,
        category: "1ra",
        type: "singles",
        status: "active",
        start_date: new Date().toISOString().split('T')[0],
        registration_price: 3000,
        registration_closed: false
    }).select().single();

    if (activeTourn) {
        const activeParticipants = [
            playersMap['alcaraz.seed@demo.com'],
            playersMap['coria.seed@demo.com'],
            playersMap['gaudio.seed@demo.com']
        ].filter(Boolean);

        for (const uid of activeParticipants) {
            const p = dummyPlayers.find(dp => playersMap[dp.email] === uid);
            await supabase.from('tournament_players').insert({
                tournament_id: activeTourn.id,
                player_id: uid,
                player_name: p ? `${p.name} ${p.lastname}` : 'Unknown',
                category: '1ra',
                payment_status: 'pending',
                fee_amount: 3000
            });
        }
        console.log("✅ Created Active Tournament with Enrollments");
    }

    // 5. Bookings
    console.log("Creating Bookings...");
    const firstPlayerId = Object.values(playersMap)[0];
    if (firstPlayerId) {
        await supabase.from('bookings').insert([
            {
                user_id: firstPlayerId, institution_id: instId, court_name: "Cancha 1",
                date: "2025-02-01", start_time: "18:00", end_time: "19:30",
                status: "confirmed", total_price: 4500, booking_type: "guest", title: "Partido Amistoso"
            },
            {
                user_id: firstPlayerId, institution_id: instId, court_name: "Cancha 3",
                date: "2026-03-10", start_time: "10:00", end_time: "11:00",
                status: "pending", total_price: 3000, booking_type: "guest", title: "Entrenamiento"
            }
        ]);
        console.log("✅ Created Sample Bookings");
    }

    console.log("\n🌱 Seed Complete! Database is populated.");
}

seed();
