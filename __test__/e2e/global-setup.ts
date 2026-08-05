import nextEnv from "@next/env"
import type { FullConfig } from "@playwright/test"

import { createRoleStorageStates } from "./fixtures/auth"
import { seedTestUsers } from "./fixtures/test-users"

const { loadEnvConfig } = nextEnv

/**
 * Playwright global setup: seed the role fixtures, then sign in once per role
 * and persist the cookies so individual tests can reuse a session instead of
 * logging in again (Better Auth rate-limits sign-in attempts).
 */
export default async function globalSetup(config: FullConfig) {
  loadEnvConfig(process.cwd())

  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. E2E tests need a database — copy .env.example to .env.local and run pnpm run db:migrate."
    )
  }

  await seedTestUsers(databaseUrl)

  const baseURL = config.projects[0]?.use?.baseURL ?? "http://localhost:3000"

  await createRoleStorageStates(baseURL)
}
