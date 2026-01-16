
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import util from 'util';

const execAsync = util.promisify(exec);

// Load env vars
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const databaseUrl = envConfig.DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL not found in .env.local or process.env');
  process.exit(1);
}

const migrationFile = path.join(process.cwd(), 'src/app/supabase/migrations/001_avatar_3d_tables.sql');

async function applyMigration() {
  console.log('Applying migration:', migrationFile);
  try {
    // Basic psql command. Note: This might expose the URL in process list if monitored, 
    // but in this environment it is acceptable for the task.
    // Using simple string replacement to avoid complexities with shell escaping for now, 
    // assuming URL is standard.
    const command = `psql "${databaseUrl}" -f "${migrationFile}"`;
    const { stdout, stderr } = await execAsync(command);
    console.log('STDOUT:', stdout);
    if (stderr) console.error('STDERR:', stderr);
    console.log('Migration applied successfully.');
  } catch (error: any) {
    console.error('Migration failed:', error.message);
    if (error.stderr) console.error('STDERR:', error.stderr);
    process.exit(1);
  }
}

applyMigration();
