import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables based on NODE_ENV
const isStaging = process.env.NODE_ENV === 'staging';
const envFile = isStaging ? '.env.staging' : 'estudio_ia_videos/.env.local';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

export default defineConfig({
  testDir: '.',
  testMatch: ['**/estudio_ia_videos/src/app/tests/e2e/**/*.spec.ts', '**/estudio_ia_videos/src/app/e2e/**/*.spec.ts'],
  testIgnore: ['**/_archive/**', '**/node_modules/**'],
  globalSetup: './tests/global-setup.ts',
  globalTeardown: './tests/global-teardown.ts',
  timeout: 60000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.NEXT_PUBLIC_APP_URL || process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    ignoreHTTPSErrors: true
  },
  webServer: (process.env.E2E_SKIP_SERVER || isStaging) ? undefined : {
    command: 'cd estudio_ia_videos && npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 90000
  },
  reporter: [ ['list'], ['html', { outputFolder: 'evidencias/fase-2/playwright-report' }] ]
});