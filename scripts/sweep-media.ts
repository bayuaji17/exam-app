/**
 * Run the media sweep: delete the objects of tombstoned ledger rows, purge
 * the rows after successful deletion, then reconcile — delete `media/*`
 * objects with no ledger row that are past the grace period.
 *
 *   pnpm exec tsx scripts/sweep-media.ts
 */
import nextEnv from "@next/env"
import pg from "pg"

import { deleteMediaObject } from "../lib/storage/confirm"
import { listMediaObjects } from "../lib/storage/list"
import {
  ORPHAN_GRACE_PERIOD_MS,
  reconcileOrphans,
  sweepTombstonedRows,
} from "../lib/storage/sweeper"

const { loadEnvConfig } = nextEnv

loadEnvConfig(process.cwd())

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

async function sweepTombstoned() {
  const rows = await pool.query<{ id: string; "objectKey": string }>(
    'select "id", "objectKey" from "question_media" where "deletedAt" is not null order by "createdAt" asc limit 100'
  )

  const result = await sweepTombstonedRows(
    rows.rows.map((row) => ({ id: row.id, objectKey: row.objectKey })),
    deleteMediaObject
  )

  if (result.deleted.length > 0) {
    await pool.query('delete from "question_media" where "id" = any($1)', [
      result.deleted,
    ])
  }

  return result
}

async function reconcile() {
  const objects = await listMediaObjects()

  if (objects.length === 0) {
    return { deleted: [] as string[] }
  }

  const owned = await pool.query<{ "objectKey": string }>(
    'select distinct "objectKey" from "question_media"'
  )
  const ownedKeys = new Set(owned.rows.map((row) => row.objectKey))

  const deleted = await reconcileOrphans(
    objects,
    ownedKeys,
    ORPHAN_GRACE_PERIOD_MS,
    deleteMediaObject
  )

  return { deleted }
}

async function main() {
  const tombstoned = await sweepTombstoned()
  const orphans = await reconcile()

  console.log(
    `sweep done: ${tombstoned.deleted.length} tombstoned objects deleted, ` +
      `${tombstoned.failed.length} failed (retry next sweep), ` +
      `${orphans.deleted.length} orphans removed`
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })
