import { defineConfig, devices } from "@playwright/test"

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
  retries: process.env.CI ? 2 : 0,
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
  use: {
    baseURL: "http://localhost:3000",
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
    command: "pnpm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
