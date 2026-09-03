const MAX_FAILED_ATTEMPTS = 5
const WINDOW_MS = 60 * 1000 // 1 minute
const COOLDOWN_SECONDS = 60

interface RateLimitRecord {
  timestamps: number[]
  lockedUntil?: number
}

const attemptsStore = new Map<string, RateLimitRecord>()

function getStoreKey(participantId: string, scheduleId: string): string {
  return `${participantId}:${scheduleId}`
}

export interface RateLimitResult {
  allowed: boolean
  remainingAttempts: number
  retryAfterSeconds?: number
}

/**
 * Checks whether the participant is allowed to attempt token verification for a schedule.
 */
export function checkTokenRateLimit(
  participantId: string,
  scheduleId: string
): RateLimitResult {
  const key = getStoreKey(participantId, scheduleId)
  const now = Date.now()
  const record = attemptsStore.get(key)

  if (!record) {
    return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS }
  }

  // If currently locked out in cooldown
  if (record.lockedUntil && record.lockedUntil > now) {
    const retryAfterSeconds = Math.ceil((record.lockedUntil - now) / 1000)
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds,
    }
  }

  // Filter timestamps within sliding window
  const recentTimestamps = record.timestamps.filter((ts) => now - ts < WINDOW_MS)
  record.timestamps = recentTimestamps
  record.lockedUntil = undefined

  if (recentTimestamps.length >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + COOLDOWN_SECONDS * 1000
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds: COOLDOWN_SECONDS,
    }
  }

  return {
    allowed: true,
    remainingAttempts: MAX_FAILED_ATTEMPTS - recentTimestamps.length,
  }
}

/**
 * Records a failed token verification attempt.
 */
export function recordFailedTokenAttempt(
  participantId: string,
  scheduleId: string
): RateLimitResult {
  const key = getStoreKey(participantId, scheduleId)
  const now = Date.now()
  let record = attemptsStore.get(key)

  if (!record) {
    record = { timestamps: [] }
    attemptsStore.set(key, record)
  }

  // Keep only recent timestamps
  record.timestamps = record.timestamps.filter((ts) => now - ts < WINDOW_MS)
  record.timestamps.push(now)

  if (record.timestamps.length >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + COOLDOWN_SECONDS * 1000
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds: COOLDOWN_SECONDS,
    }
  }

  return {
    allowed: true,
    remainingAttempts: MAX_FAILED_ATTEMPTS - record.timestamps.length,
  }
}

/**
 * Resets the rate limiter for the participant upon a successful token verification.
 */
export function resetTokenRateLimit(
  participantId: string,
  scheduleId: string
): void {
  const key = getStoreKey(participantId, scheduleId)
  attemptsStore.delete(key)
}
