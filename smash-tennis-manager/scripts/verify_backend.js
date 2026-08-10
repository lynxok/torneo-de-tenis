
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from parent directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');

if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    console.error("❌ .env file not found at " + envPath);
    process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyFlow() {
    console.log("🚀 Starting Verification Flow...");

    // 1. Get an Institution
    const { data: institutions, error: instError } = await supabase.from('institutions').select('*').limit(1);
    if (instError || !institutions.length) {
        console.error("❌ Failed to get institutions. Run migrations or seeds first.");
        return;
    }
    const institution = institutions[0];
    console.log(`✅ Institution Found: ${institution.name} (${institution.id})`);

    // 2. Get a User (Profile)
    const { data: profiles, error: profError } = await supabase.from('profiles').select('*').limit(1);
    if (profError || !profiles.length) {
        console.error("❌ Failed to get a user profile.");
        return;
    }
    const user = profiles[0];
    console.log(`✅ User Found: ${user.email} (${user.id})`);

    // 3. Create a Test Tournament
    const testTournament = {
        name: `VERIFICATION TOURNAMENT ${new Date().getTime()}`,
        institution_id: institution.id,
        category: '1ra',
        type: 'singles',
        status: 'draft',
        registration_price: 1500,
        start_date: new Date().toISOString().split('T')[0],
    };

    const { data: tourn, error: tournError } = await supabase.from('tournaments').insert(testTournament).select().single();

    if (tournError) {
        console.error("❌ Tournament Creation Failed:", tournError.message);
    } else {
        console.log(`✅ Tournament Created: ${tourn.name} (${tourn.id})`);

        // Cleanup Tournament
        await supabase.from('tournaments').delete().eq('id', tourn.id);
        console.log(`🧹 Test Tournament Cleaned up.`);
    }

    // 4. Create a Test Booking
    const testBooking = {
        user_id: user.id,
        institution_id: institution.id,
        date: new Date().toISOString().split('T')[0],
        start_time: '10:00',
        end_time: '11:00',
        court_name: 'Cancha Test 1',
        status: 'pending',
        booking_type: 'guest',
        total_price: 100,
        payment_status: 'pending'
    };

    const { data: booking, error: bookError } = await supabase.from('bookings').insert(testBooking).select().single();

    if (bookError) {
        console.error("❌ Booking Creation Failed:", bookError.message);
    } else {
        console.log(`✅ Booking Created: ${booking.court_name} at ${booking.start_time} (${booking.id})`);

        // Cleanup Booking
        await supabase.from('bookings').delete().eq('id', booking.id);
        console.log(`🧹 Test Booking Cleaned up.`);
    }

    console.log("\n✨ Verification Complete!");
}

verifyFlow();
