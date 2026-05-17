import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./__test__/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
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
