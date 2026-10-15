import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export default defineConfig({
  testDir: './website/e2e',
  fullyParallel: true,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  use: {
    baseURL: process.env.SITE_TEST_URL || 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    launchOptions: existsSync(chrome) ? { executablePath: chrome } : {},
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.SITE_TEST_URL
    ? undefined
    : [
        {
          command: 'npm run dev',
          url: 'http://127.0.0.1:5173',
          reuseExistingServer: !process.env.CI,
        },
        {
          command: 'npm run preview -- --base /study/',
          url: 'http://127.0.0.1:4173/study/',
          reuseExistingServer: !process.env.CI,
        },
      ],
});
