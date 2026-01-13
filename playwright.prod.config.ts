
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Force load production env if needed, but primarily we rely on the config itself
dotenv.config({ path: path.resolve(process.cwd(), '.env.production') });

export default defineConfig({
  testDir: './src/app/e2e',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1, // Serial execution for clarity on logs
  reporter: 'list',
  use: {
    baseURL: 'https://cursostecno.com.br',
    trace: 'on-first-retry',
    screenshot: 'on',
    video: 'retain-on-failure',
  },
  // NO WEBSERVER BLOCK HERE - STRICT COMPLIANCE
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
