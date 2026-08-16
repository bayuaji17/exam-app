import { randomUUID } from "node:crypto"
import nextEnv from "@next/env"
import pg from "pg"

const { loadEnvConfig } = nextEnv

export const SEEDED_SCHEDULE_PREFIX = "E2E Seeded Schedule"

function databaseUrl(): string {
  loadEnvConfig(process.cwd())

  const url = process.env.DATABASE_URL

  if (!url) {
    throw new Error("DATABASE_URL is not set.")
  }

  return url
}

/**
 * Delete every schedule these tests created (see global-teardown.ts for
 * the fullyParallel note).
 */
export async function deleteSeededExamSchedules(): Promise<void> {
  const pool = new pg.Pool({ connectionString: databaseUrl() })

  try {
    await pool.query('delete from "exam_schedule" where "name" like $1', [
      `${SEEDED_SCHEDULE_PREFIX}%`,
    ])
  } finally {
    await pool.end()
  }
}

export async function seedExamSchedule(
  input: {
    name: string
    packageId: string
    startsAt: Date
    endsAt: Date
    durationMinutes?: number | null
    attemptLimit?: number | null
  }
): Promise<string> {
  const pool = new pg.Pool({ connectionString: databaseUrl() })
  const client = await pool.connect()

  const id = randomUUID()

  try {
    await client.query("begin")

    await client.query(
      `insert into "exam_schedule" ("id", "name", "packageId", "startsAt", "endsAt", "durationMinutes", "attemptLimit")
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        input.name,
        input.packageId,
        input.startsAt,
        input.endsAt,
        input.durationMinutes ?? null,
        input.attemptLimit ?? null,
      ]
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
