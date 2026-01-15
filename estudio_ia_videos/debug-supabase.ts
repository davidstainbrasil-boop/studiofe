
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('--- Debug Supabase Connection (Public Schema) ---');
console.log('URL:', SUPABASE_URL ? 'Loaded' : 'Missing');
console.log('Service Key:', SUPABASE_SERVICE_KEY ? 'Loaded' : 'Missing');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function run() {
    console.log('Attempting to list users from public.users...');
    try {
        const { data, error } = await supabase.from('users').select('*').limit(5);
        if (error) {
            console.error('Error listing public users:', error);
            console.error('Message:', error.message);
        } else {
            console.log('Success! Found', data.length, 'users in public.users.');
            if (data.length > 0) {
                console.log('First public user ID:', data[0].id);
                console.log('Email:', data[0].email);
            } else {
                console.log('No users found in public.users table.');
            }
        }
    } catch (e) {
        console.error('Exception:', e);
    }
}

run();
