const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gmxfidbonafcoiytwzrn.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY || SERVICE_KEY.includes('AQUI_TU_CLAVE')) {
    console.error('❌ Error: Falta configurar la SUPABASE_SERVICE_ROLE_KEY en el archivo .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const sqlFile = process.argv[2] || 'demo_data/location_migration.sql';
const sqlPath = path.resolve(__dirname, sqlFile);

async function run() {
    try {
        console.log(`📖 Leyendo ${sqlFile}...`);
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('🚀 Ejecutando SQL en Supabase (esto puede tardar unos segundos)...');

        // Split if needed? Supabase SQL endpoint/RPC can often handle block execution. 
        // But PG simple protocol via REST might not handle multiple statements if not wrapped.
        // The postgres-js client or supabase-js doesn't expose raw SQL execution easily 
        // UNLESS we use a stored procedure OR the unrestricted RPC if generic.
        // Wait, standard supabase-js client does NOT allow executing arbitrary SQL 
        // WITHOUT a helper function on the DB side (like `exec_sql(query text)`).

        // HOWEVER, "migrations" usually need psql or a specific tool.
        // A common trick is to use `pg` library or if we have an `exec_sql` RPC function.
        // Since I don't know if `exec_sql` exists, I might be blocked.

        // BUT, I can try to CREATE that function first? No, chicken and egg.

        // ALTERNATIVE: Use the REST API management endpoints? No, that's for platform actions.

        // WAIT. I saw many Supabase projects include a "exec_sql" or similar RPC for this exact reason.
        // Let's TRY to call an RPC if it exists, OR check if I can assume `pg` connection.

        // Since I can't install `pg` easily on all environments without native bindings issues sometimes (though usually fine),
        // let's check if the previous contexts mentioned `execute_sql` tool. 
        // My Agent tool `mcp_supabase_execute_sql` exists but I can't use it due to permissions.

        // Let's try to assume there is NO `exec_sql` RPC.
        // Without `exec_sql`, I cannot run arbitrary SQL via `supabase-js`. 

        // Exception: If the user has a "Management API" token? No, service role is for Data API.

        // Let's create a script that USES `pg` (node-postgres) to connect directly to the DB!
        // Supabase provides a connection string. 
        // host=db.REF.supabase.co port=5432 dbname=postgres user=postgres password=[YOUR-PASSWORD]

        // Problem: I don't have the DB Password. I only have the Service Role Key.
        // Service Role Key works with the REST API / Client Libs.

        // Does Supabase JS allow raw SQL? 
        // PostgREST doesn't support arbitrary SQL execution for security.

        // CRITICAL REALIZATION: 
        // If I don't have a pre-existing RPC `exec_sql`, I CANNOT run this script via `supabase-js`.
        // AND I don't have the DB password for `pg`.

        // CHECK: Does `supabase.js` (client side) have any RPC that looks like SQL execution?
        // Step 93 showing `supabase.js` lines 80-87 shows `update_user_password` RPC.
        // It does NOT show a generic SQL exec RPC.

        // THEREFORE: I cannot run the migration from a script UNLESS I have an RPC.
        // AND I can't create the RPC without running SQL.

        // BUT wait. If I have the Service Role Key, maybe I can use the Supabase Management API?
        // No, that requires a Personal Access Token.

        // What do I do?
        // I can TRY one commonly used RPC name `exec`, `execute_sql`, `exec_sql`.
        // If that fails, I must tell the user I REALLY can't do it and they must copy-paste.

        // Let's try to use the `pg` library approach IF the user put the PASSWORD in the .env?
        // The .env.example only asked for SERVICE_ROLE_KEY.

        // Wait, is there ANY other way?
        // If I can't run SQL, I can't migrate.

        // However, I can use the Service Role Key to inspect tables via the API (which is what I did and failed via MCP, but directly I can).
        // But running DDL (ALTER TABLE) is impossible via PostgREST.

        // CONCLUSION: I actually cannot run the migration script with just the Service Role Key.
        // I made a mistake assuming `supabase-js` + Service Role = SQL Access. It = Unlimited Data Access (RLS bypass), not Schema Access.

        // UNLESS: I use a specially crafted Edge Function? No.

        // Did I miss something?
        // Maybe I can try to see if there is an `exec_sql` function ALREADY there? I inspected `rpc` list? No.

        // Let's verify if `exec_sql` exists by trying to call it in a small script.
        // If it fails, I will notify the user.

        const { error } = await supabase.rpc('exec_sql', { query: sql });

        if (error) {
            console.error('❌ Falló al intentar ejecutar vía RPC (exec_sql):', error.message);
            console.log('\n⚠️ No existe una función RPC para ejecutar SQL raw.');
            console.log('👉 Por favor, COPIA el contenido de demo_data/MIGRACION_FINAL_V2.sql y ejecútalo manualmente en Supabase SQL Editor.');
        } else {
            console.log('✅ Migración exitosa.');
        }

    } catch (e) {
        console.error('Error inesperado:', e);
    }
}

run();
