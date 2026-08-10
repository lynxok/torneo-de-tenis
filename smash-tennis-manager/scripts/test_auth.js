
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    console.log("Testing listUsers...");
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) {
        console.error("❌ Error:", error);
    } else {
        console.log("✅ Success! Found users:", data.users.length);
        data.users.forEach(u => console.log(`- ${u.email} (${u.id})`));
    }
}

test();
