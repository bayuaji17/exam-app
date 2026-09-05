import { beforeEach, describe, expect, it } from "vitest"
import {
  generateExamToken,
  isValidTokenFormat,
  normalizeExamToken,
} from "@/lib/exam-schedules/token"
import {
  checkTokenRateLimit,
  recordFailedTokenAttempt,
  resetTokenRateLimit,
} from "@/lib/exam-schedules/token-rate-limiter"

describe("Exam Token Utility", () => {
  it("generates a 6-character uppercase alphanumeric token", () => {
    const token = generateExamToken()
    expect(token).toHaveLength(6)
    expect(token).toMatch(/^[A-Z0-9]{6}$/)
  })

  it("normalizes user input by trimming and uppercasing", () => {
    expect(normalizeExamToken("  ab12cd  ")).toBe("AB12CD")
    expect(normalizeExamToken("xyz789")).toBe("XYZ789")
  })

  it("validates token format", () => {
    expect(isValidTokenFormat("ABC123")).toBe(true)
    expect(isValidTokenFormat("ab-12")).toBe(false)
    expect(isValidTokenFormat("")).toBe(false)
    expect(isValidTokenFormat("12")).toBe(false)
  })
})

describe("Token Rate Limiter", () => {
  const userId = "user-123"
  const scheduleId = "schedule-456"

  beforeEach(() => {
    resetTokenRateLimit(userId, scheduleId)
  })

  it("allows initial attempts", () => {
    const status = checkTokenRateLimit(userId, scheduleId)
    expect(status.allowed).toBe(true)
    expect(status.remainingAttempts).toBe(5)
  })

  it("throttles after 5 failed attempts within 60 seconds", () => {
    for (let i = 0; i < 4; i++) {
      recordFailedTokenAttempt(userId, scheduleId)
      expect(checkTokenRateLimit(userId, scheduleId).allowed).toBe(true)
    }

    // 5th failed attempt triggers lockout
    recordFailedTokenAttempt(userId, scheduleId)
    const status = checkTokenRateLimit(userId, scheduleId)
    expect(status.allowed).toBe(false)
    expect(status.remainingAttempts).toBe(0)
    expect(status.retryAfterSeconds).toBeGreaterThan(0)
    expect(status.retryAfterSeconds).toBeLessThanOrEqual(60)
  })

  it("resets rate limit upon successful verification", () => {
    recordFailedTokenAttempt(userId, scheduleId)
    recordFailedTokenAttempt(userId, scheduleId)
    expect(checkTokenRateLimit(userId, scheduleId).remainingAttempts).toBe(3)

    resetTokenRateLimit(userId, scheduleId)
    expect(checkTokenRateLimit(userId, scheduleId).allowed).toBe(true)
    expect(checkTokenRateLimit(userId, scheduleId).remainingAttempts).toBe(5)
  })
})
