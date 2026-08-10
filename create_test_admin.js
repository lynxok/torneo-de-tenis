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

async function createTestAdmin() {
    console.log('🚀 Creando usuario de prueba Super Admin...');
    const email = 'testadmin@smash.com';
    const password = 'Password123!';
    const name = 'Admin';
    const lastname = 'De Prueba';

    try {
        // 1. Sign up the user programmatically
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: { name: name, role: 'superadmin' }
        });

        if (authError) {
            if (authError.message.includes('already exists') || authError.message.includes('already registered')) {
                console.log('ℹ️ El usuario ya existe en auth. Repoblando perfil...');
            } else {
                throw authError;
            }
        }

        // Get user ID
        const userId = authData?.user?.id || (await supabase.from('profiles').select('id').eq('email', email).single()).data?.id;

        if (!userId) {
            throw new Error('No se pudo determinar el ID de usuario.');
        }

        // Get default institution
        const { data: inst } = await supabase.from('institutions').select('id').eq('name', 'Club Smash').single();
        const instId = inst?.id || null;

        // 2. Insert or Update Profile as approved superadmin
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                name: name,
                lastname: lastname,
                email: email,
                role: 'superadmin',
                category: 'A',
                is_approved: true,
                gender: 'masculino',
                institution_id: instId,
                city: 'Paraná',
                province: 'Entre Ríos',
                country: 'Argentina'
            });

        if (profileError) throw profileError;

        console.log('✅ Usuario Super Admin de prueba creado exitosamente:');
        console.log(`   📧 Correo: ${email}`);
        console.log(`   🔑 Contraseña: ${password}`);

    } catch (e) {
        console.error('❌ Error creando el usuario de prueba:', e.message);
    }
}

createTestAdmin();
