import { randomUUID } from "node:crypto"
import nextEnv from "@next/env"
import pg from "pg"

const { loadEnvConfig } = nextEnv

/**
 * Marks every bank these tests seed, so cleanup can find them without
 * risking real banks.
 */
const SEEDED_BANK_PREFIX = "E2E Seeded Bank"

function databaseUrl(): string {
  loadEnvConfig(process.cwd())

  const url = process.env.DATABASE_URL

  if (!url) {
    throw new Error("DATABASE_URL is not set.")
  }

  return url
}

/**
 * Delete every bank these tests seeded.
 *
 * Scoped to the prefix above: a broader delete would take out real banks.
 * Banks owned by seeded test users carry a foreign key, so an owner with no
 * banks still deletes cleanly.
 */
export async function deleteSeededBanks(): Promise<void> {
  const pool = new pg.Pool({ connectionString: databaseUrl() })

  try {
    await pool.query('delete from "question_bank" where "name" like $1', [
      `${SEEDED_BANK_PREFIX}%`,
    ])
  } finally {
    await pool.end()
  }
}

/**
 * Insert a bank directly, skipping the UI, for list/pagination tests that
 * need more rows than it is sensible to create through forms.
 *
 * `createdBy` is the seeded super-admin, who always exists.
 */
export async function seedBank(name: string): Promise<string> {
  const pool = new pg.Pool({ connectionString: databaseUrl() })
  const client = await pool.connect()

  const id = randomUUID()

  try {
    await client.query("begin")

    await client.query(
      'insert into "question_bank" ("id", "name", "description", "createdBy") select $1, $2, null, "id" from "user" where "email" = $3 limit 1',
      [id, name, "test-superadmin@example.com"]
    )

    await client.query("commit")

    return id
  } catch (error) {
    await client.query("rollback")
    throw error
  } finally {
    await client.release()
    await pool.end()
  }
}

export { SEEDED_BANK_PREFIX }
