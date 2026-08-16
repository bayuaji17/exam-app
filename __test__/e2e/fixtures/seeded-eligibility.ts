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
 * Remove every grant these tests created.
 *
 * Scoped to grants on seeded schedules: a broader delete would take out real
 * access rules. Deleting grants before schedules also frees groups that a
 * leftover grant would otherwise pin (FK RESTRICT).
 */
export async function deleteSeededEligibility(): Promise<void> {
  const pool = new pg.Pool({ connectionString: databaseUrl() })

  try {
    await pool.query(
      `delete from "schedule_user_eligibility"
       where "scheduleId" in (
         select "id" from "exam_schedule" where "name" like $1
       )`,
      [`${SEEDED_SCHEDULE_PREFIX}%`]
    )
    await pool.query(
      `delete from "schedule_group_eligibility"
       where "scheduleId" in (
         select "id" from "exam_schedule" where "name" like $1
       )`,
      [`${SEEDED_SCHEDULE_PREFIX}%`]
    )
  } finally {
    await pool.end()
  }
}

/**
 * Grant a participant directly, skipping the UI.
 */
export async function grantUserEligibility(
  scheduleId: string,
  userId: string
): Promise<void> {
  const pool = new pg.Pool({ connectionString: databaseUrl() })

  try {
    await pool.query(
      'insert into "schedule_user_eligibility" ("id", "scheduleId", "userId", "createdAt") values ($1, $2, $3, now())',
      [randomUUID(), scheduleId, userId]
    )
  } finally {
    await pool.end()
  }
}

/**
 * Grant a group, skipping the UI.
 */
export async function grantGroupEligibility(
  scheduleId: string,
  groupId: string
): Promise<void> {
  const pool = new pg.Pool({ connectionString: databaseUrl() })

  try {
    await pool.query(
      'insert into "schedule_group_eligibility" ("id", "scheduleId", "groupId", "createdAt") values ($1, $2, $3, now())',
      [randomUUID(), scheduleId, groupId]
    )
  } finally {
    await pool.end()
  }
}

/**
 * Whether a direct grant exists — for asserting a revoke really landed.
 */
export async function userEligibilityExists(
  scheduleId: string,
  userId: string
): Promise<boolean> {
  const pool = new pg.Pool({ connectionString: databaseUrl() })

  try {
    const result = await pool.query(
      `select 1 from "schedule_user_eligibility"
       where "scheduleId" = $1 and "userId" = $2 limit 1`,
      [scheduleId, userId]
    )

    return (result.rowCount ?? 0) > 0
  } finally {
    await pool.end()
  }
}
