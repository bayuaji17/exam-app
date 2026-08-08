import { randomUUID } from "node:crypto"
import nextEnv from "@next/env"
import pg from "pg"

const { loadEnvConfig } = nextEnv

/**
 * Marks every account these tests create, so cleanup can find them without
 * risking the seeded fixtures or a real super-admin.
 */
const CREATED_EMAIL_PREFIX = "e2e-created-"

/**
 * A fresh address per call.
 *
 * Better Auth rejects a duplicate email, so reusing one address would make the
 * suite pass once and fail on every re-run.
 */
export function uniqueTestEmail(label: string): string {
  return `${CREATED_EMAIL_PREFIX}${label}-${randomUUID().slice(0, 8)}@example.com`
}

function databaseUrl(): string {
  loadEnvConfig(process.cwd())

  const url = process.env.DATABASE_URL

  if (!url) {
    throw new Error("DATABASE_URL is not set.")
  }

  return url
}

/**
 * Delete every account these tests created.
 *
 * Scoped to the prefix above: a broader delete would take out the seeded role
 * fixtures and break the rest of the suite. Accounts cascade on user delete
 * (see the `account` foreign key), so removing the user is enough.
 */
export async function deleteCreatedTestUsers(): Promise<void> {
  const pool = new pg.Pool({ connectionString: databaseUrl() })

  try {
    await pool.query('delete from "user" where "email" like $1', [
      `${CREATED_EMAIL_PREFIX}%`,
    ])
  } finally {
    await pool.end()
  }
}

/**
 * Whether an account with this email exists — used to assert a create really
 * reached the database rather than only re-rendering the list.
 */
export async function userExists(email: string): Promise<boolean> {
  const pool = new pg.Pool({ connectionString: databaseUrl() })

  try {
    const result = await pool.query(
      'select 1 from "user" where lower("email") = lower($1) limit 1',
      [email]
    )

    return (result.rowCount ?? 0) > 0
  } finally {
    await pool.end()
  }
}

/**
 * The role stored for an account, or null when it does not exist.
 */
export async function storedRoleFor(email: string): Promise<string | null> {
  const pool = new pg.Pool({ connectionString: databaseUrl() })

  try {
    const result = await pool.query<{ role: string }>(
      'select "role" from "user" where lower("email") = lower($1) limit 1',
      [email]
    )

    return result.rows[0]?.role ?? null
  } finally {
    await pool.end()
  }
}
