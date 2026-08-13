import nextEnv from "@next/env"
import pg from "pg"

const { loadEnvConfig } = nextEnv

/**
 * Marks every category these tests create, so cleanup can find them without
 * risking real categories.
 */
export const SEEDED_CATEGORY_PREFIX = "E2E Seeded Category"

function databaseUrl(): string {
  loadEnvConfig(process.cwd())

  const url = process.env.DATABASE_URL

  if (!url) {
    throw new Error("DATABASE_URL is not set.")
  }

  return url
}

/**
 * Delete every category these tests created (see global-teardown.ts: with
 * `fullyParallel`, per-file afterAll hooks run once per worker and would
 * delete rows another worker is still using).
 */
export async function deleteSeededCategories(): Promise<void> {
  const pool = new pg.Pool({ connectionString: databaseUrl() })

  try {
    await pool.query('delete from "question_category" where "name" like $1', [
      `${SEEDED_CATEGORY_PREFIX}%`,
    ])
  } finally {
    await pool.end()
  }
}
