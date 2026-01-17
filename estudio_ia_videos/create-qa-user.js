
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const QA_USER = {
    email: 'qa@cursostecno.com.br',
    password: 'QA_StrongPassword123!',
    email_confirm: true
};


async function run() {
    console.log(`Attempting to create user ${QA_USER.email}...`);

    const { data, error } = await supabase.auth.admin.createUser({
        email: QA_USER.email,
        password: QA_USER.password,
        email_confirm: true,
        user_metadata: {
            full_name: 'QA User'
        }
    });

    if (error) {
        // If user already exists, we consider it a success for "Get Credentials" phase
        if (error.message && error.message.includes('already been registered')) {
            console.log('User already exists (Success).');
            // Optional: try to update password to ensure we know it
            // But we need the ID. Since listUsers failed, we might not be able to get ID easily.
            // We can try to SignIn to verify password.
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email: QA_USER.email,
                password: QA_USER.password
            });

            if (signInError) {
                console.error('User exists but SignIn failed:', signInError.message);
                // If sign in failed, we can't delete/recreate without ID. 
                // We will report this.
            } else {
                console.log('User exists and password validated.');
            }

        } else {
            console.error('Error creating user:', error);
            console.error('Message:', error.message);
            process.exit(1);
        }
    } else {
        console.log('QA User created:', data.user.id);
    }
}

run();

