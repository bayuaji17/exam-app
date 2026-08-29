/**
 * Attempt timing, as pure functions so the rules are unit-testable.
 *
 * The deadline is server-authoritative: it is computed once at attempt start
 * and stored on the attempt row. The client countdown only displays it.
 */

/**
 * The effective duration: the schedule overrides the package. Null when
 * neither is configured — an attempt with no duration has no deadline.
 */
export function resolveDuration(
  scheduleMinutes: number | null,
  packageMinutes: number | null
): number | null {
  return scheduleMinutes ?? packageMinutes
}

/**
 * The deadline for an attempt, or null when the duration is null (no time
 * limit — the participant submits manually). When endsAt is provided,
 * the deadline is clamped so it never exceeds the schedule closing window.
 */
export function deadlineFor(
  startedAt: Date,
  durationMinutes: number | null,
  endsAt?: Date | null
): Date | null {
  if (durationMinutes === null) {
    return endsAt ? new Date(endsAt) : null
  }

  const naturalDeadline = new Date(
    startedAt.getTime() + durationMinutes * 60 * 1000
  )

  if (endsAt && endsAt.getTime() < naturalDeadline.getTime()) {
    return new Date(endsAt)
  }

  return naturalDeadline
}

/**
 * Whether a deadline has passed. Supports both isExpired(deadlineAt, now)
 * and isExpired(deadlineAt, endsAt, now).
 */
export function isExpired(
  deadlineAt: Date | null,
  endsAtOrNow?: Date | null,
  nowArg?: Date
): boolean {
  let endsAt: Date | null = null
  let now = new Date()

  if (nowArg !== undefined) {
    endsAt = endsAtOrNow ?? null
    now = nowArg
  } else if (endsAtOrNow !== undefined && endsAtOrNow !== null) {
    now = endsAtOrNow
  }

  if (deadlineAt !== null && now >= deadlineAt) {
    return true
  }

  if (endsAt !== null && now >= endsAt) {
    return true
  }

  return false
}
