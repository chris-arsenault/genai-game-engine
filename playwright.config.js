import { defineConfig } from '@playwright/test';

const DEV_SERVER_PORT = 5173;
const isCI = Boolean(process.env.CI);

const DEV_COMMAND = 'npm run dev -- --host 127.0.0.1 --port 5173 --strictPort';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45000,
  expect: {
    timeout: 5000,
  },
  retries: isCI ? 1 : 0,
  use: {
    baseURL: `http://localhost:${DEV_SERVER_PORT}`,
    headless: !process.env.PLAYWRIGHT_HEADED,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  },
  webServer: {
    command: DEV_COMMAND,
    port: DEV_SERVER_PORT,
    timeout: 120000,
    reuseExistingServer: true,
    env: {
      NODE_ENV: 'test',
      BROWSER: 'wslview',
    },
  },
});
