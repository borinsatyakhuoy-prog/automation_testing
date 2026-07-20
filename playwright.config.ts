import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Playwright wipes this directory at the start of every run. Point it
   * elsewhere so it never collides with test-results/, which holds our
   * hand-authored reports (SCRUM.md, exploratory-findings.md). */
  outputDir: './playwright-output',
  /* This suite runs against a single shared live account (develop-fapa.allweb.cloud),
   * not an isolated per-test backend. Running tests in parallel caused two real
   * flakes: two files generating reports for the same client at the same time,
   * and multiple workers writing trace archives concurrently corrupting a trace
   * zip. Both reproduced under parallelism and passed cleanly in isolation, so
   * the whole suite now runs sequentially by default rather than relying on
   * remembering --workers=1 every time. */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [['list'], ['html'], ['allure-playwright']],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: process.env.FAPA_BASE_URL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Capture a screenshot on failure for debugging/healing. */
    screenshot: 'only-on-failure',

    /* Family Partners charts/tables clip content below this size. Kept as
     * the default for every project except chromium below, which gets an
     * equivalent effective size through a real OS window instead (see its
     * comment) so headed runs render at native scale instead of
     * CDP-scaled-down inside a small window. Firefox/WebKit don't reliably
     * honor a --window-size-style launch arg the way Chromium does, so they
     * keep this CDP-based override to guarantee the same rendered size. */
    viewport: { width: 2000, height: 1200 },
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // deviceScaleFactor from the preset above can't be combined with a
        // null viewport, so drop it.
        deviceScaleFactor: undefined,
        // null disables the CDP device-metrics override from the shared
        // viewport above; the real OS window (sized below) becomes the
        // viewport instead. Verified this renders at exactly 2000x1200 in
        // BOTH headless and headed Chromium, so it's safe as the default,
        // and headed runs now show a correctly-sized window instead of a
        // small one with the page scaled down inside it.
        viewport: null,
        launchOptions: {
          args: ['--window-size=2000,1200', '--window-position=0,0'],
        },
      },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
