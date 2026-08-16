import { defineConfig, devices } from "@playwright/test"

/**
 * The E2E suite runs against a manually started production server. The flow
 * is always:
 *
 *   pnpm run lint && pnpm run typecheck && pnpm run test:unit   # gate first
 *   pnpm run build
 *   pnpm start
 *   pnpm run test:e2e
 *
 * `webServer.command` is `pnpm run start` only: if the server was already
 * started by hand, `reuseExistingServer` attaches to it; if not, Playwright
 * tries `next start` and fails loudly when there is no production build.
 *
 * Do not leave `pnpm run dev` running on port 3000 while running the suite:
 * `reuseExistingServer` would silently attach to the Turbopack dev server,
 * which reintroduces the on-demand compilation latency that made post-action
 * assertions flake.
 */

/**
 * Worker count: CI pins a single worker; locally, full parallelism means one
 * browser per core (12 on a typical dev box), which saturates the dev server
 * alongside Postgres and MinIO. Four workers keep runs fast and the
 * assertions stable.
 */
const WORKERS = process.env.CI ? 1 : 4

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
