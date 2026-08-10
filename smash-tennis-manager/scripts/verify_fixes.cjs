
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyFixes() {
    console.log('--- Verificando Arreglos de Reportes y Torneos ---');

    // 1. Test Tournaments with Institution JOIN (includes city)
    console.log('\n[1/2] Verificando consulta de torneos (con unión de ciudad)...');
    const { data: tourn, error: tournError } = await supabase
        .from('tournaments')
        .select('*, institutions(name, city)')
        .limit(1);

    if (tournError) {
        console.error('❌ Error en consulta de torneos:', tournError.message);
    } else {
        console.log('✅ Consulta de torneos exitosa (city encontrada).');
    }

    // 2. Test Transactions Global View (equivalent to handling 'all' in api.ts)
    console.log('\n[2/2] Verificando consulta global de transacciones...');
    // This simulates what api.ts does when institutionId is 'all'
    const { data: txs, error: txError } = await supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .range(0, 9);

    if (txError) {
        console.error('❌ Error en consulta de transacciones:', txError.message);
    } else {
        console.log(`✅ Consulta de transacciones exitosa. Total en esta vista: ${txs.length}`);
    }

    if (!tournError && !txError) {
        console.log('\n🚀 ¡Arreglos confirmados! Las páginas de Reportes y Torneos deberían cargar sin errores.');
    }
}

verifyFixes();
