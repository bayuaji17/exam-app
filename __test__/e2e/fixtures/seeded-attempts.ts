import { randomUUID } from "node:crypto"
import nextEnv from "@next/env"
import pg from "pg"

import { SEEDED_SCHEDULE_PREFIX } from "./seeded-schedules"

const { loadEnvConfig } = nextEnv

function databaseUrl(): string {
  loadEnvConfig(process.cwd())

  const url = process.env.DATABASE_URL

  if (!url) {
    throw new Error("DATABASE_URL is not set.")
  }

  return url
}

/**
 * Remove every attempt these tests created, before schedules are deleted
 * (attempt -> schedule is FK RESTRICT).
 */
export async function deleteSeededAttempts(): Promise<void> {
  const pool = new pg.Pool({ connectionString: databaseUrl() })

  try {
    await pool.query(
      `delete from "attempt"
       where "scheduleId" in (
         select "id" from "exam_schedule" where "name" like $1
       )`,
      [`${SEEDED_SCHEDULE_PREFIX}%`]
    )
  } finally {
    await pool.end()
  }
}

export interface SeededAttemptOptions {
  startedAt?: Date
  deadlineAt?: Date | null
  submittedAt?: Date | null
  questionOrder?: string[]
  score?: string | null
}

/**
 * Insert an attempt directly, skipping the UI, for expiry tests that need a
 * precise deadline. Answers cascade with the attempt.
 */
export async function seedAttempt(
  scheduleId: string,
  participantEmail: string,
  options: SeededAttemptOptions = {}
): Promise<string> {
  const pool = new pg.Pool({ connectionString: databaseUrl() })
  const client = await pool.connect()

  const id = randomUUID()
  const now = new Date()

  try {
    await client.query("begin")

    await client.query(
      `insert into "attempt" (
        "id", "scheduleId", "participantId", "startedAt", "deadlineAt",
        "submittedAt", "questionOrder", "score", "createdAt", "updatedAt"
      )
      select $1, $2, "id", $3, $4, $5, $6::jsonb, $7, now(), now()
      from "user" where lower("email") = lower($8) limit 1`,
      [
        id,
        scheduleId,
        options.startedAt ?? now,
        options.deadlineAt ?? null,
        options.submittedAt ?? null,
        JSON.stringify(options.questionOrder ?? []),
        options.score ?? null,
        participantEmail,
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

/**
 * Move an attempt's deadline, for the lazy-finalization test.
 */
export async function setAttemptDeadline(
  attemptId: string,
  deadlineAt: Date
): Promise<void> {
  const pool = new pg.Pool({ connectionString: databaseUrl() })

  try {
    await pool.query('update "attempt" set "deadlineAt" = $2 where "id" = $1', [
      attemptId,
      deadlineAt,
    ])
  } finally {
    await pool.end()
  }
}

export interface AttemptState {
  submittedAt: Date | null
  score: string | null
}

export async function attemptState(attemptId: string): Promise<AttemptState | null> {
  const pool = new pg.Pool({ connectionString: databaseUrl() })

  try {
    const result = await pool.query<AttemptState>(
      'select "submittedAt", "score" from "attempt" where "id" = $1 limit 1',
      [attemptId]
    )

    return result.rows[0] ?? null
  } finally {
    await pool.end()
  }
}
