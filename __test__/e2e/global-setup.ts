import nextEnv from "@next/env"

import { seedTestUsers } from "./fixtures/test-users"

const { loadEnvConfig } = nextEnv

/**
 * Playwright global setup: seed the role fixtures once before the suite runs.
 */
export default async function globalSetup() {
  loadEnvConfig(process.cwd())

  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. E2E tests need a database — copy .env.example to .env.local and run pnpm run db:migrate."
    )
  }

  await seedTestUsers(databaseUrl)
}
