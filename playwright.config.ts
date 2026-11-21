import { defineConfig, devices } from '@playwright/test';

const port = 4174;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: './test/e2e',
  timeout: 120_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: { pathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}{ext}' },
  },
  // Run the canvas tests serially to avoid CPU contention.
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run preview -- --host localhost --port ${port} --strictPort`,
    url: baseURL,
  },
});
