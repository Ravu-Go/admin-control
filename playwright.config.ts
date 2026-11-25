import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testIgnore: ['**/private/**'], fullyParallel: true, workers: 2, forbidOnly: !!process.env.CI, retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { channel: 'chromium', baseURL: process.env.STAGING_URL || 'http://127.0.0.1:4173', viewport: { width: 1440, height: 1000 }, locale: 'en-TZ', timezoneId: 'Africa/Dar_es_Salaam', trace: 'retain-on-failure' },
  ...(process.env.STAGING_URL ? {} : { webServer: { command: 'npm run dev -- --port 4173', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI } }),
});
