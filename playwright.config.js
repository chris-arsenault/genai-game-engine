import { defineConfig } from '@playwright/test';

const DEV_SERVER_PORT = 5173;
const isCI = Boolean(process.env.CI);
const baseReporter = isCI ? 'line' : 'list';
const junitOutput = process.env.PLAYWRIGHT_JUNIT_OUTPUT_NAME || 'playwright-results.xml';
const htmlOutput = process.env.PLAYWRIGHT_HTML_REPORT || 'playwright-report';
const htmlOpen = 'never'; // isCI ? 'never' : 'on-failure';
const outputDir = process.env.PLAYWRIGHT_OUTPUT_DIR || 'test-results';

const DEV_COMMAND = 'npm run dev -- --host 127.0.0.1 --port 5173 --strictPort';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45000,
  expect: {
    timeout: 5000,
  },
  retries: isCI ? 1 : 0,
  reporter: [
    [baseReporter],
    ['junit', { outputFile: junitOutput }],
    ['html', { outputFolder: htmlOutput, open: htmlOpen }],
  ],
  outputDir,
  use: {
    baseURL: `http://localhost:${DEV_SERVER_PORT}`,
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
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
