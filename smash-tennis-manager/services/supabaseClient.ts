import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xlipzxmjpliwifckwkvh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsaXB6eG1qcGxpd2lmY2t3a3ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MjUwOTAsImV4cCI6MjA5NTQwMTA5MH0.deNbxVCVxysIO9Nu-xtl0NXx5J6sWlJXzW3jY6v9SMQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
