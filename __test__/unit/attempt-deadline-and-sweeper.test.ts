import { beforeEach, describe, expect, it, vi } from "vitest"
import { deadlineFor, isExpired, resolveDuration } from "@/lib/attempts/timer"
import { sweepExpiredAttempts } from "@/lib/attempts/sweeper"

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}))

const { selectMock, updateMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  updateMock: vi.fn(),
}))

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => selectMock(...args),
    update: (...args: unknown[]) => updateMock(...args),
  },
}))

vi.mock("@/lib/attempts/actions", () => ({
  finalizeAttempt: vi.fn().mockResolvedValue(undefined),
}))

describe("Deadline Clamping & Timer Functions", () => {
  it("resolves duration prioritizing schedule over package", () => {
    expect(resolveDuration(60, 90)).toBe(60)
    expect(resolveDuration(null, 90)).toBe(90)
    expect(resolveDuration(null, null)).toBeNull()
  })

  it("calculates natural deadline when endsAt is beyond duration", () => {
    const startedAt = new Date("2026-09-01T10:00:00Z")
    const endsAt = new Date("2026-09-01T12:00:00Z")
    const durationMinutes = 60 // Ends at 11:00:00Z

    const deadline = deadlineFor(startedAt, durationMinutes, endsAt)
    expect(deadline?.toISOString()).toBe("2026-09-01T11:00:00.000Z")
  })

  it("clamps deadline to schedule endsAt when remaining time is less than duration", () => {
    const startedAt = new Date("2026-09-01T10:30:00Z")
    const endsAt = new Date("2026-09-01T11:00:00Z") // only 30m left
    const durationMinutes = 60 // natural 11:30:00Z

    const deadline = deadlineFor(startedAt, durationMinutes, endsAt)
    expect(deadline?.toISOString()).toBe("2026-09-01T11:00:00.000Z")
  })

  it("detects expired status accurately against deadline and schedule endsAt", () => {
    const deadline = new Date("2026-09-01T11:00:00Z")
    const endsAt = new Date("2026-09-01T11:30:00Z")

    expect(
      isExpired(deadline, endsAt, new Date("2026-09-01T10:59:59Z"))
    ).toBe(false)
    expect(
      isExpired(deadline, endsAt, new Date("2026-09-01T11:00:01Z"))
    ).toBe(true)

    // Schedule endsAt passed before deadline
    expect(
      isExpired(
        new Date("2026-09-01T12:00:00Z"),
        new Date("2026-09-01T11:00:00Z"),
        new Date("2026-09-01T11:01:00Z")
      )
    ).toBe(true)
  })
})

describe("Expired Attempts Sweeper", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("finds and finalizes expired open attempts as 'system'", async () => {
    selectMock.mockReturnValueOnce({
      from: () => ({
        innerJoin: () => ({
          where: () =>
            Promise.resolve([
              { id: "attempt-expired-1" },
              { id: "attempt-expired-2" },
            ]),
        }),
      }),
    })

    const result = await sweepExpiredAttempts(new Date("2026-09-01T12:00:00Z"))
    expect(result.sweptCount).toBe(2)
    expect(result.attemptIds).toEqual([
      "attempt-expired-1",
      "attempt-expired-2",
    ])
  })
})
