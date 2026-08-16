/**
 * Attempt-limit rules, as pure functions so they are unit-testable.
 *
 * A limit of `0` or `null` means unlimited; any positive number is the
 * maximum number of attempts (counted rows — attempts are never deleted).
 * One open attempt per (schedule, participant): starting while one is open
 * resumes it instead of creating a fresh attempt.
 */

/**
 * How many attempts remain, or Infinity when unlimited.
 */
export function attemptsRemaining(
  limit: number | null,
  attemptCount: number
): number {
  if (limit === null || limit === 0) {
    return Number.POSITIVE_INFINITY
  }

  return Math.max(0, limit - attemptCount)
}

/**
 * Whether the participant may start a fresh attempt: under the limit, with
 * no attempt already open (an open attempt must be resumed, not restarted).
 */
export function canStartAttempt(
  limit: number | null,
  attemptCount: number,
  openAttemptId: string | null
): boolean {
  if (openAttemptId !== null) {
    return false
  }

  return attemptsRemaining(limit, attemptCount) > 0
}
