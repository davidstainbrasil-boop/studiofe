/**
 * Playwright Configuration with Complete URL Isolation
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/app/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    
    // Block ALL external requests in E2E
    extraHTTPHeaders: {
      'X-E2E-Test': 'true',
    },
  },

  // Global setup to enforce URL isolation
  globalSetup: require.resolve('./src/app/e2e/global-setup.ts'),

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Block external domains
        serviceWorkers: 'block',
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    env: {
      NODE_ENV: 'test',
      E2E_TEST: 'true',
      PLAYWRIGHT_TEST: 'true',
      // DEV_BYPASS removed for security
      DISABLE_SUPABASE_REALTIME: 'true',
      DISABLE_SENTRY: 'true',
      DISABLE_ANALYTICS: 'true',
    },
  },
});
