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
 * limit — the participant submits manually).
 */
export function deadlineFor(
  startedAt: Date,
  durationMinutes: number | null
): Date | null {
  if (durationMinutes === null) {
    return null
  }

  return new Date(startedAt.getTime() + durationMinutes * 60 * 1000)
}

/**
 * Whether a deadline has passed. A null deadline (no time limit) never
 * expires.
 */
export function isExpired(deadlineAt: Date | null, now: Date = new Date()): boolean {
  return deadlineAt !== null && now >= deadlineAt
}
