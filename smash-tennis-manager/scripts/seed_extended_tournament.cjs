
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seedExtendedTournament() {
    console.log('--- Iniciando Seeding Extendido de Torneo ---');

    // 1. Get Institution
    const { data: inst } = await supabase.from('institutions').select('id').limit(1).single();
    if (!inst) {
        console.error('No se encontró institución.');
        return;
    }

    // 2. Create Tournament
    const { data: tourn, error: tournError } = await supabase.from('tournaments').insert({
        name: 'Grand Slam Smash 2025',
        category: '1ra',
        type: 'singles', // Correcting to allowed types
        status: 'finished',
        institution_id: inst.id,
        start_date: '2025-01-01',
        duration: '15 días',
        registration_price: 15000,
        image_url: 'https://images.unsplash.com/photo-1622279457486-62dcc4a4bd13?q=80&w=1000&auto=format&fit=crop',
        competitions: ['1ra Singles'],
        champion_name: 'Carlos Alcaraz'
    }).select().single();

    if (tournError) {
        console.error('Error creando torneo:', tournError.message);
        return;
    }
    console.log('✅ Torneo "Grand Slam Smash 2025" creado.');

    // 3. Create 16 Auth Players
    const players = [];
    const playerNames = [
        'Carlos Alcaraz', 'Jannik Sinner', 'Novak Djokovic', 'Daniil Medvedev',
        'Alexander Zverev', 'Andrey Rublev', 'Holger Rune', 'Hubert Hurkacz',
        'Casper Ruud', 'Taylor Fritz', 'Stefanos Tsitsipas', 'Alex de Minaur',
        'Grigor Dimitrov', 'Ben Shelton', 'Tommy Paul', 'Ugo Humbert'
    ];

    console.log('Creando 16 jugadores en Auth (esto puede tardar)...');
    for (let i = 0; i < 16; i++) {
        const email = `pro-player-${i}-${Date.now()}@demo.com`;
        const password = 'Password123!';

        // Check if profile exists first (shouldn't with time suffix)
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { name: playerNames[i].split(' ')[0], lastname: playerNames[i].split(' ')[1] }
        });

        if (authError) {
            console.error(`Error creando auth para ${playerNames[i]}:`, authError.message);
            continue;
        }

        const { data: profile } = await supabase.from('profiles').update({
            category: '1ra',
            dni: `PRO-25-${i}`,
            is_approved: true,
            institution_id: inst.id
        }).eq('id', authData.user.id).select().single();

        if (profile) {
            players.push(profile);
            // Enroll
            await supabase.from('tournament_players').insert({
                tournament_id: tourn.id,
                player_id: profile.id,
                player_name: `${profile.name} ${profile.lastname}`,
                category: '1ra',
                payment_status: 'paid'
            });
        }
    }
    console.log(`✅ ${players.length} jugadores creados y registrados.`);

    // 4. Group Stage
    const groups = ['A', 'B', 'C', 'D'];
    const groupMates = {};
    for (let i = 0; i < 4; i++) {
        groupMates[groups[i]] = players.slice(i * 4, (i + 1) * 4);
    }

    const groupMatches = [];
    for (const group of groups) {
        const mates = groupMates[group];
        for (let i = 0; i < mates.length; i++) {
            for (let j = i + 1; j < mates.length; j++) {
                const p1 = mates[i];
                const p2 = mates[j];
                groupMatches.push({
                    tournament_id: tourn.id,
                    player1_id: p1.id,
                    player1_name: `${p1.name} ${p1.lastname}`,
                    player2_id: p2.id,
                    player2_name: `${p2.name} ${p2.lastname}`,
                    round: 'Fase de Grupos',
                    group_number: groups.indexOf(group) + 1,
                    score: [{ p1: 6, p2: 3 }, { p1: 6, p2: 4 }],
                    winner_id: p1.id,
                    winner_name: `${p1.name} ${p1.lastname}`,
                    status: 'finished',
                    date: '2025-01-05'
                });
            }
        }
    }
    await supabase.from('matches').insert(groupMatches);
    console.log('✅ Fase de Grupos poblada.');

    // 5. Playoffs
    const finalists = [players[0], players[4], players[8], players[12]]; // Winners of groups A, B, C, D (mock)

    // Semis
    const semis = [
        {
            tournament_id: tourn.id,
            player1_id: finalists[0].id,
            player2_id: finalists[1].id,
            player1_name: `${finalists[0].name} ${finalists[0].lastname}`,
            player2_name: `${finalists[1].name} ${finalists[1].lastname}`,
            round: 'Semifinal',
            score: [{ p1: 6, p2: 4 }, { p1: 6, p2: 4 }],
            winner_id: finalists[0].id,
            winner_name: `${finalists[0].name} ${finalists[0].lastname}`,
            status: 'finished'
        },
        {
            tournament_id: tourn.id,
            player1_id: finalists[2].id,
            player2_id: finalists[3].id,
            player1_name: `${finalists[2].name} ${finalists[2].lastname}`,
            player2_name: `${finalists[3].name} ${finalists[3].lastname}`,
            round: 'Semifinal',
            score: [{ p1: 2, p2: 6 }, { p1: 7, p2: 5 }, { p1: 6, p2: 3 }],
            winner_id: finalists[2].id,
            winner_name: `${finalists[2].name} ${finalists[2].lastname}`,
            status: 'finished'
        }
    ];
    await supabase.from('matches').insert(semis);

    // Final
    await supabase.from('matches').insert({
        tournament_id: tourn.id,
        player1_id: finalists[0].id,
        player2_id: finalists[2].id,
        player1_name: `${finalists[0].name} ${finalists[0].lastname}`,
        player2_name: `${finalists[2].name} ${finalists[2].lastname}`,
        round: 'Final',
        score: [{ p1: 6, p2: 3 }, { p1: 6, p2: 4 }],
        winner_id: finalists[0].id,
        winner_name: `${finalists[0].name} ${finalists[0].lastname}`,
        status: 'finished'
    });

    // Final Champion update
    await supabase.from('tournaments').update({ winner_id: finalists[0].id }).eq('id', tourn.id);

    console.log('🏆 Seeding Finalizado con éxito.');
}

seedExtendedTournament();
