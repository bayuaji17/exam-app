/**
 * The tombstone + sweeper lifecycle (Q2, ADR-0003).
 *
 * The core sweep is dependency-injected so it is unit-testable and usable
 * from E2E: it takes tombstoned rows and a delete function, and reports
 * which objects were deleted. The database wrapper (or the operational
 * script) purges rows only after their object deletion succeeded.
 */

export interface TombstonedRow {
  id: string
  objectKey: string
}

export interface SweepResult {
  deleted: string[]
  failed: string[]
}

/**
 * Delete the objects of tombstoned rows.
 *
 * - Purge ordering: the caller deletes the row only for ids in `deleted`;
 *   failed rows stay tombstoned and retry next sweep.
 * - Batch isolation: one failing row never blocks the rest.
 * - Empty batch: returns empty results, no calls.
 */
export async function sweepTombstonedRows(
  rows: TombstonedRow[],
  deleteObject: (objectKey: string) => Promise<void>
): Promise<SweepResult> {
  const result: SweepResult = { deleted: [], failed: [] }

  for (const row of rows) {
    try {
      await deleteObject(row.objectKey)
      result.deleted.push(row.id)
    } catch {
      result.failed.push(row.id)
    }
  }

  return result
}

/**
 * Reconciliation pass: objects with no ledger row older than the grace
 * period are orphans (uploads never saved into content, failed tombstones,
 * anything else). Returns the ids of the objects it deleted.
 */
export async function reconcileOrphans(
  objects: Array<{ key: string; lastModified?: Date }>,
  ownedKeys: Set<string>,
  gracePeriodMs: number,
  deleteObject: (objectKey: string) => Promise<void>
): Promise<string[]> {
  const now = Date.now()
  const deleted: string[] = []

  for (const object of objects) {
    if (ownedKeys.has(object.key)) {
      continue
    }

    const ageMs = now - (object.lastModified?.getTime() ?? now)

    if (ageMs >= gracePeriodMs) {
      try {
        await deleteObject(object.key)
        deleted.push(object.key)
      } catch {
        // Orphans are reclaimed on the next sweep.
      }
    }
  }

  return deleted
}

/** The reconciliation grace period: an upload abandoned before any save. */
export const ORPHAN_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000
