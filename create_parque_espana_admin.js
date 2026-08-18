const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xlipzxmjpliwifckwkvh.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function createOrUpdateParqueEspanaAdmin() {
    console.log('🚀 Creando/Actualizando usuario de prueba Tenis Parque España...');
    const email = 'organizador@parqueespana.com';
    const password = 'Password123!';
    const name = 'Organizador';
    const lastname = 'Parque España';

    try {
        // 1. Check if user already exists
        const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
        let existingUser = usersData?.users?.find(u => u.email === email);
        let userId;

        if (existingUser) {
            console.log('ℹ️ El usuario ya existe en Supabase Auth. Actualizando contraseña...');
            userId = existingUser.id;
            const { error: updateAuthErr } = await supabase.auth.admin.updateUserById(userId, {
                password: password,
                user_metadata: { name: name, role: 'admin' }
            });
            if (updateAuthErr) throw updateAuthErr;
        } else {
            console.log('✨ Creando nuevo usuario en Supabase Auth...');
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email: email,
                password: password,
                email_confirm: true,
                user_metadata: { name: name, role: 'admin' }
            });
            if (authError) throw authError;
            userId = authData.user.id;
        }

        // 2. Get or create institution
        let { data: inst } = await supabase.from('institutions').select('id').eq('name', 'Tenis Parque España').single();
        let instId = inst?.id;

        if (!instId) {
            const { data: newInst, error: instErr } = await supabase.from('institutions').insert({
                name: 'Tenis Parque España',
                city: 'Diamante',
                province: 'Entre Ríos',
                country: 'Argentina'
            }).select('id').single();
            if (!instErr && newInst) {
                instId = newInst.id;
            }
        }

        // 3. Upsert Profile
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                name: name,
                lastname: lastname,
                email: email,
                role: 'admin',
                category: 'A',
                is_approved: true,
                gender: 'M',
                institution_id: instId || null,
                city: 'Diamante',
                province: 'Entre Ríos',
                country: 'Argentina',
                profile_picture_url: '/parque-espana-logo.png'
            });

        if (profileError) throw profileError;

        console.log('\n✅ ¡Usuario Administrador de Tenis Parque España listo!');
        console.log(`   📧 Email: ${email}`);
        console.log(`   🔑 Contraseña: ${password}`);

    } catch (e) {
        console.error('❌ Error:', e.message);
    }
}

createOrUpdateParqueEspanaAdmin();
