
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifySchema() {
    console.log('--- Iniciando Verificación de Esquema Final ---');
    let failures = 0;

    // 1. Verificar system_config
    console.log('\n[1/3] Verificando system_config...');
    const { data: config, error: configError } = await supabase
        .from('system_config')
        .select('*')
        .limit(1)
        .single();

    if (configError) {
        console.error('❌ Error en system_config:', configError.message);
        failures++;
    } else {
        console.log('✅ system_config accesible:', config.welcome_message);
    }

    // 2. Verificar Instituciones (nuevas columnas)
    console.log('\n[2/3] Verificando nuevas columnas en instituciones...');
    const testInst = {
        name: 'Club de Prueba Verificación',
        city: 'Testing City',
        phone: '12345678',
        courts_clay: 2,
        courts_hard: 1,
        price_day: 5000,
        mp_access_token: 'TEST_TOKEN'
    };

    const { data: instData, error: instError } = await supabase
        .from('institutions')
        .insert(testInst)
        .select()
        .single();

    if (instError) {
        console.error('❌ Error en instituciones:', instError.message);
        failures++;
    } else {
        console.log('✅ Columnas de instituciones verificadas correctamente.');
        // Limpiar prueba
        await supabase.from('institutions').delete().eq('id', instData.id);
    }

    // 3. Verificar Perfiles (DNI / Phone)
    console.log('\n[3/3] Verificando perfiles...');
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, dni, phone')
        .limit(1)
        .single();

    if (profileError && profileError.code !== 'PGRST116') { // Ignorar si no hay perfiles aún
        console.error('❌ Error en perfiles:', profileError.message);
        failures++;
    } else {
        console.log('✅ Columnas de perfiles (dni, phone) accesibles.');
    }

    console.log('\n--- Resultado Final ---');
    if (failures === 0) {
        console.log('🚀 ¡TODO OK! La base de datos está perfectamente alineada con la app.');
    } else {
        console.log(`⚠️ Se encontraron ${failures} errores. Revisar logs.`);
    }
}

verifySchema();
