import { defineConfig, devices } from "@playwright/test"

/**
 * The E2E suite always runs against a freshly built production server. The
 * `test:e2e` script (scripts/run-e2e.mjs) owns the server lifecycle:
 *
 *   pnpm run test:e2e
 *
 * It builds, frees port 3000 (killing anything squatting there, dev server
 * included), starts `pnpm start`, runs the suite, and stops the server
 * afterwards. `webServer.command` here is only a fallback for direct
 * `playwright test` invocations; `reuseExistingServer` attaches to the
 * production server the runner started.
 *
 * Do not invoke `playwright test` directly against a `pnpm run dev` server —
 * on-demand compilation latency makes post-action assertions flake.
 */

/**
 * Worker count: CI pins a single worker; locally, capped at 2 workers to stay
 * within memory constraints on dev environments while assertions stay fast and stable.
 */
const WORKERS = process.env.CI ? 1 : 2

export default defineConfig({
  testDir: "./__test__/e2e",
  globalSetup: "./__test__/e2e/global-setup.ts",
  globalTeardown: "./__test__/e2e/global-teardown.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // A retried-then-passed test is reported as flaky rather than silently
  // passing, so local flakes stay visible while CI gets one extra attempt.
  retries: process.env.CI ? 2 : 1,
  workers: WORKERS,
  outputDir: "__test__/e2e/test-results",
  reporter: [
    ["list"],
    [
      "html",
      {
        open: "never",
        outputFolder: "__test__/e2e/playwright-report",
      },
    ],
  ],
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: "http://localhost:3000",
    actionTimeout: 10_000,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
