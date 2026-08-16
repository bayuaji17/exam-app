import { describe, expect, it } from "vitest"

import { attemptsRemaining, canStartAttempt } from "@/lib/attempts/limits"
import { deadlineFor, isExpired, resolveDuration } from "@/lib/attempts/timer"

describe("resolveDuration", () => {
  it("prefers the schedule duration", () => {
    expect(resolveDuration(45, 90)).toBe(45)
  })

  it("falls back to the package duration", () => {
    expect(resolveDuration(null, 90)).toBe(90)
  })

  it("is null when neither is configured", () => {
    expect(resolveDuration(null, null)).toBeNull()
  })
})

describe("deadlineFor", () => {
  it("adds the duration to the start", () => {
    const startedAt = new Date("2026-08-16T10:00:00Z")

    expect(deadlineFor(startedAt, 60)).toEqual(new Date("2026-08-16T11:00:00Z"))
  })

  it("is null for a null duration (no deadline)", () => {
    expect(deadlineFor(new Date(), null)).toBeNull()
  })
})

describe("isExpired", () => {
  it("expires when now is at or past the deadline", () => {
    const deadline = new Date("2026-08-16T11:00:00Z")

    expect(isExpired(deadline, new Date("2026-08-16T10:59:59Z"))).toBe(false)
    expect(isExpired(deadline, new Date("2026-08-16T11:00:00Z"))).toBe(true)
    expect(isExpired(deadline, new Date("2026-08-16T11:00:01Z"))).toBe(true)
  })

  it("never expires without a deadline", () => {
    expect(isExpired(null, new Date("2999-01-01T00:00:00Z"))).toBe(false)
  })
})

describe("attemptsRemaining", () => {
  it("treats null and 0 as unlimited", () => {
    expect(attemptsRemaining(null, 0)).toBe(Number.POSITIVE_INFINITY)
    expect(attemptsRemaining(0, 0)).toBe(Number.POSITIVE_INFINITY)
    expect(attemptsRemaining(null, 100)).toBe(Number.POSITIVE_INFINITY)
  })

  it("counts down a positive limit", () => {
    expect(attemptsRemaining(3, 0)).toBe(3)
    expect(attemptsRemaining(3, 2)).toBe(1)
    expect(attemptsRemaining(3, 3)).toBe(0)
  })

  it("never goes negative", () => {
    expect(attemptsRemaining(2, 5)).toBe(0)
  })
})

describe("canStartAttempt", () => {
  it("blocks when an attempt is already open", () => {
    expect(canStartAttempt(null, 0, "attempt-1")).toBe(false)
    expect(canStartAttempt(3, 0, "attempt-1")).toBe(false)
  })

  it("allows under the limit with no open attempt", () => {
    expect(canStartAttempt(3, 1, null)).toBe(true)
    expect(canStartAttempt(null, 42, null)).toBe(true)
  })

  it("blocks when the limit is exhausted", () => {
    expect(canStartAttempt(2, 2, null)).toBe(false)
    expect(canStartAttempt(1, 3, null)).toBe(false)
  })
})
