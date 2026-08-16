import { defineConfig, devices } from "@playwright/test"

/**
 * The default E2E flow runs against a production build on a dedicated port
 * (3100), so a Turbopack dev server on 3000 can never be picked up by
 * `reuseExistingServer`. Set `E2E_SERVER=dev` (or run `pnpm run test:e2e:dev`)
 * to iterate against the dev server on 3000 instead.
 */
const devMode = process.env.E2E_SERVER === "dev"

const PORT = devMode ? 3000 : 3100

const BASE_URL = `http://localhost:${PORT}`

/**
 * Worker count: CI pins a single worker; locally, full parallelism means one
 * browser per core (12 on a typical dev box), which saturates the Turbopack
 * dev server alongside Postgres and MinIO. Server actions then answer late
 * ("destination stream closed early") and post-action assertions flake.
 * Four workers keep runs fast and the assertions stable.
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
    baseURL: BASE_URL,
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
    command: devMode ? "pnpm run dev" : "pnpm run build && PORT=3100 pnpm run start",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Better Auth trusts only BETTER_AUTH_URL (`.env.local` points at 3000),
    // so the E2E server must be spawned with the port it actually serves.
    env: devMode ? undefined : { ...process.env, BETTER_AUTH_URL: BASE_URL },
  },
})
