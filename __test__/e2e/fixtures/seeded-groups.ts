import { randomUUID } from "node:crypto"
import nextEnv from "@next/env"
import pg from "pg"

const { loadEnvConfig } = nextEnv

/**
 * Marks every group these tests seed, so cleanup can find them without
 * risking real groups.
 */
const SEEDED_GROUP_PREFIX = "E2E Seeded Group"

function databaseUrl(): string {
  loadEnvConfig(process.cwd())

  const url = process.env.DATABASE_URL

  if (!url) {
    throw new Error("DATABASE_URL is not set.")
  }

  return url
}

/**
 * Delete every group these tests seeded.
 *
 * Group membership rows cascade with the group. Groups referenced by a
 * schedule's eligibility (FK RESTRICT) must be un-granted first — the global
 * teardown runs the eligibility cleanup before this.
 */
export async function deleteSeededParticipantGroups(): Promise<void> {
  const pool = new pg.Pool({ connectionString: databaseUrl() })

  try {
    await pool.query('delete from "participant_group" where "name" like $1', [
      `${SEEDED_GROUP_PREFIX}%`,
    ])
  } finally {
    await pool.end()
  }
}

/**
 * Insert a group directly, skipping the UI, for tests that need a group to
 * act on without filling the form.
 */
export async function seedParticipantGroup(name: string): Promise<string> {
  const pool = new pg.Pool({ connectionString: databaseUrl() })

  try {
    const id = randomUUID()

    await pool.query(
      'insert into "participant_group" ("id", "name", "slug", "createdAt", "updatedAt") values ($1, $2, $3, now(), now())',
      [id, name, `group-${id}`]
    )

    return id
  } finally {
    await pool.end()
  }
}

/**
 * Add a participant to a group directly, resolving the account by email.
 */
export async function addGroupMember(
  groupId: string,
  email: string
): Promise<string> {
  const pool = new pg.Pool({ connectionString: databaseUrl() })

  try {
    const id = randomUUID()

    await pool.query(
      `insert into "participant_group_member" ("id", "groupId", "userId", "createdAt")
       select $1, $2, "id", now() from "user" where lower("email") = lower($3) limit 1`,
      [id, groupId, email]
    )

    return id
  } finally {
    await pool.end()
  }
}

/**
 * The ids of a group's members, for asserting membership reached the DB.
 */
export async function groupMemberIds(groupId: string): Promise<string[]> {
  const pool = new pg.Pool({ connectionString: databaseUrl() })

  try {
    const result = await pool.query<{ userId: string }>(
      'select "userId" from "participant_group_member" where "groupId" = $1',
      [groupId]
    )

    return result.rows.map((row) => row.userId)
  } finally {
    await pool.end()
  }
}

/**
 * Whether a group still exists — for asserting a delete really landed.
 */
export async function groupExists(groupId: string): Promise<boolean> {
  const pool = new pg.Pool({ connectionString: databaseUrl() })

  try {
    const result = await pool.query(
      'select 1 from "participant_group" where "id" = $1 limit 1',
      [groupId]
    )

    return (result.rowCount ?? 0) > 0
  } finally {
    await pool.end()
  }
}

export { SEEDED_GROUP_PREFIX }
