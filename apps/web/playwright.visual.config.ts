import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: ['verify-email.spec.ts', 'theme-visual.spec.ts'],
  workers: 1,
  reporter: 'list',
  webServer: {
    command: 'pnpm exec next dev --hostname 127.0.0.1 --port 3000',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    channel: 'chrome',
    screenshot: 'only-on-failure',
  },
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.01,
    },
  },
});
