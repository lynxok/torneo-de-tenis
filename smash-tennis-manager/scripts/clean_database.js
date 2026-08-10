
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

const KEEP_EMAIL = 'ignaciovalente@hotmail.com';

async function clean() {
    console.log("⚠️  STARTING DATABASE CLEANUP...");
    console.log(`🛡️  Preserving User: ${KEEP_EMAIL}`);

    // 1. Find the User to Keep
    const { data: users, error: userError } = await supabase.from('profiles').select('id').eq('email', KEEP_EMAIL);

    let keepId = null;
    if (users && users.length > 0) {
        keepId = users[0].id;
        console.log(`✅ Found Profile ID to keep: ${keepId}`);

        // Unlink from Institution (so we can delete institutions)
        await supabase.from('profiles').update({ institution_id: null }).eq('id', keepId);
    } else {
        console.log("ℹ️  Profile to keep not found in 'profiles' table. Searching Auth...");
        // Assuming we can proceed even if not found (maybe first run), but we want to avoid deleting the auth user if it exists.
    }

    // 2. Clear Application Tables
    const tables = [
        'bookings',
        'ranking_history',
        'messages',
        'transactions',
        'tournament_players',
        'matches', // Matches depends on tournaments usually, or vice versa? Matches link to tournaments.
        'court_slots'
    ];

    for (const table of tables) {
        const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete All
        if (error) console.error(`❌ Error clearing ${table}:`, error.message);
        else console.log(`🧹 Cleared ${table}`);
    }

    // 3. Delete Tournaments
    // (Matches are gone, Players are gone)
    const { error: tournError } = await supabase.from('tournaments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (tournError) console.error(`❌ Error clearing tournaments:`, tournError.message);
    else console.log(`🧹 Cleared tournaments`);

    // 4. Delete Institutions
    const { error: instError } = await supabase.from('institutions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (instError) console.error(`❌ Error clearing institutions:`, instError.message);
    else console.log(`🧹 Cleared institutions`);

    // 5. Delete Other Profiles (Application Side)
    if (keepId) {
        const { error: profError } = await supabase.from('profiles').delete().neq('id', keepId);
        if (profError) console.error(`❌ Error clearing profiles:`, profError.message);
        else console.log(`🧹 Cleared other profiles`);
    } else {
        // If keepId not found, wipe all profiles
        const { error: profError } = await supabase.from('profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (profError) console.error(`❌ Error wiping all profiles:`, profError.message);
        else console.log(`🧹 Cleared ALL profiles`);
    }

    // 6. Delete Other Auth Users (System Side)
    // This requires iterating because we can't "delete where email != X" easily in one command via SDK often
    const { data: { users: allAuthUsers }, error: listError } = await supabase.auth.admin.listUsers();

    if (!listError && allAuthUsers) {
        console.log(`Start cleaning ${allAuthUsers.length} auth users...`);
        for (const u of allAuthUsers) {
            if (u.email === KEEP_EMAIL) {
                console.log(`🛡️  Skipping Auth User: ${u.email}`);
                continue;
            }
            const { error: delError } = await supabase.auth.admin.deleteUser(u.id);
            if (delError) console.error(`Failed to delete user ${u.email}:`, delError.message);
            // else console.log(`Deleted auth user ${u.email}`); // Sssh, too noisy
        }
        console.log(`🧹 Cleared extra auth users`);
    }

    console.log("✨ Database Cleanup Complete.");
}

clean();
