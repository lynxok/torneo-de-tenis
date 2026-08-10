const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gmxfidbonafcoiytwzrn.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function verify() {
    console.log('🔍 Verificando tabla bookings...');
    const { data, error } = await supabase.from('bookings').select('count', { count: 'exact', head: true });

    if (error) {
        console.error('❌ Error (Tabla no encontrada o sin permisos):', error.message);
    } else {
        console.log('✅ Tabla bookings creada correctamente.');

        // Check config column in institutions
        const { data: inst, error: iError } = await supabase.from('institutions').select('config_booking').limit(1);
        if (iError) console.error('❌ Error columnas institutions:', iError.message);
        else console.log('✅ Columnas en institutions verificadas.');
    }
}
verify();
