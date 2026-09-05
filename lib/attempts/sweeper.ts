import { and, eq, lte, or, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import { attempt, examSchedule } from "@/lib/db/schema"
import { finalizeAttempt } from "./actions"

export interface SweepResult {
  sweptCount: number
  attemptIds: string[]
}

/**
 * Sweeps all open attempts whose deadline has passed (deadlineAt <= now)
 * or whose exam schedule has closed (endsAt <= now), finalizing them with
 * submissionType = 'system'.
 */
export async function sweepExpiredAttempts(
  now: Date = new Date()
): Promise<SweepResult> {
  const expiredRows = await db
    .select({
      id: attempt.id,
    })
    .from(attempt)
    .innerJoin(examSchedule, eq(attempt.scheduleId, examSchedule.id))
    .where(
      and(
        sql`${attempt.submittedAt} is null`,
        or(
          and(
            sql`${attempt.deadlineAt} is not null`,
            lte(attempt.deadlineAt, now)
          ),
          lte(examSchedule.endsAt, now)
        )
      )
    )

  const sweptIds: string[] = []
  for (const row of expiredRows) {
    await finalizeAttempt(row.id, "system")
    sweptIds.push(row.id)
  }

  return {
    sweptCount: sweptIds.length,
    attemptIds: sweptIds,
  }
}
