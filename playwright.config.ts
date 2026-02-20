// @ts-ignore - Node.js globals in Playwright config
declare const process: any;
declare const console: any;

import { defineConfig } from '@playwright/test';

const isStaging = process.env.NODE_ENV === 'staging';

export default defineConfig({
  testDir: '.',
  testMatch: [
    '**/estudio_ia_videos/src/app/tests/e2e/**/*.spec.ts',
    '**/estudio_ia_videos/src/app/e2e/**/*.spec.ts',
    '**/tests/e2e/**/*.spec.ts',
  ],
  testIgnore: ['**/_archive/**', '**/node_modules/**'],
  globalSetup: './tests/global-setup.ts',
  globalTeardown: './tests/global-teardown.ts',
  timeout: 60000,
  retries: process.env.CI ? 1 : 0,
  use: {
    // Prefer explicit E2E base URL to avoid accidentally running local tests against production
    baseURL: process.env.E2E_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    ignoreHTTPSErrors: true,
  },
  webServer:
    process.env.E2E_SKIP_SERVER || isStaging
      ? undefined
      : {
          command: 'cd estudio_ia_videos && npm run dev',
          url: 'http://localhost:3000',
          reuseExistingServer: !process.env.CI,
          timeout: 90000,
        },
  reporter: [['list'], ['html', { outputFolder: 'evidencias/fase-2/playwright-report' }]],
});
