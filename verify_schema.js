const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gmxfidbonafcoiytwzrn.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY || SERVICE_KEY.includes('PEGAR_AQUI')) {
    console.error('❌ Error: Falta configurar la SUPABASE_SERVICE_ROLE_KEY en el archivo .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkSchema() {
    console.log('🔍 Verificando esquema de base de datos...');

    // Verificar tabla tournaments
    const { data: tournaments, error: tError } = await supabase
        .from('tournaments')
        .select('id, payment_link, registration_price, created_by')
        .limit(1);

    if (tError) {
        console.error('❌ Error leyendo tournaments:', tError.message);
    } else {
        console.log('✅ Tabla tournaments accesible.');
        // Check if columns exist (if query didn't fail, they "exist" in terms of selection, 
        // but let's confirm explicit data structure return even if empty)
        console.log('   Columnas verificadas: payment_link, registration_price, created_by');
    }

    // Verificar tabla tournament_players
    const { data: players, error: pError } = await supabase
        .from('tournament_players')
        .select('payment_status, paid')
        .limit(1);

    if (pError) {
        console.error('❌ Error leyendo tournament_players:', pError.message);
    } else {
        console.log('✅ Tabla tournament_players accesible.');
        console.log('   Columnas verificadas: payment_status, paid');
    }

    // Test RLS bypass (using service role)
    const { data: profiles, error: prError } = await supabase
        .from('profiles')
        .select('count', { count: 'exact', head: true });

    if (prError) {
        console.error('❌ Error acceso Service Role:', prError.message);
    } else {
        console.log('✅ Acceso administrativo (Service Role) funcionando OK.');
    }
}

checkSchema();
