import { beforeEach, describe, expect, it, vi } from "vitest"
import { revalidateTag } from "next/cache"
import {
  regenerateScheduleTokenAction,
  verifyExamScheduleTokenAction,
} from "@/lib/exam-schedules/actions"
import { CACHE_TAGS } from "@/lib/cache-tags"
import { resetTokenRateLimit } from "@/lib/exam-schedules/token-rate-limiter"

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}))

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}))

const { mockSessionUser, isEligibleMock, selectMock, updateMock } =
  vi.hoisted(() => ({
    mockSessionUser: {
      id: "user-123",
      name: "Test Participant",
      role: "user",
    },
    isEligibleMock: vi.fn().mockResolvedValue(true),
    selectMock: vi.fn(),
    updateMock: vi.fn(),
  }))

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue({
        user: mockSessionUser,
      }),
    },
  },
}))

vi.mock("@/lib/auth/rbac-guards", () => ({
  requirePermission: vi.fn().mockResolvedValue({
    user: { id: "admin-1", role: "admin" },
  }),
}))

vi.mock("@/lib/eligibility/queries", () => ({
  isUserEligibleForSchedule: (...args: unknown[]) => isEligibleMock(...args),
}))

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => selectMock(...args),
    update: (...args: unknown[]) => updateMock(...args),
  },
}))

describe("verifyExamScheduleTokenAction", () => {
  const scheduleId = "schedule-1"

  beforeEach(() => {
    vi.clearAllMocks()
    resetTokenRateLimit("user-123", scheduleId)
  })

  it("fails when participant is not eligible", async () => {
    isEligibleMock.mockResolvedValueOnce(false)

    const result = await verifyExamScheduleTokenAction({
      scheduleId,
      token: "ABC123",
    })

    expect(result.ok).toBe(false)
    expect((result as { message: string }).message).toContain("tidak berhak")
  })

  it("fails when token does not match schedule token", async () => {
    isEligibleMock.mockResolvedValueOnce(true)
    selectMock.mockReturnValueOnce({
      from: () => ({
        where: () => ({
          limit: () =>
            Promise.resolve([
              {
                id: scheduleId,
                token: "CORRECT",
                startsAt: new Date(Date.now() - 10000),
                endsAt: new Date(Date.now() + 60000),
              },
            ]),
        }),
      }),
    })

    const result = await verifyExamScheduleTokenAction({
      scheduleId,
      token: "WRONG1",
    })

    expect(result.ok).toBe(false)
    expect((result as { message: string }).message).toContain("Token ujian tidak valid")
  })

  it("succeeds when token matches and schedule is active", async () => {
    isEligibleMock.mockResolvedValueOnce(true)
    selectMock.mockReturnValueOnce({
      from: () => ({
        where: () => ({
          limit: () =>
            Promise.resolve([
              {
                id: scheduleId,
                token: "CORRECT",
                startsAt: new Date(Date.now() - 10000),
                endsAt: new Date(Date.now() + 60000),
              },
            ]),
        }),
      }),
    })

    const result = await verifyExamScheduleTokenAction({
      scheduleId,
      token: "correct",
    })

    expect(result.ok).toBe(true)
  })
})

describe("regenerateScheduleTokenAction", () => {
  it("generates a new token and revalidates cache", async () => {
    const updateSetMock = vi.fn().mockReturnValue({
      where: () => ({
        returning: () => Promise.resolve([{ id: "schedule-1" }]),
      }),
    })
    updateMock.mockReturnValueOnce({
      set: updateSetMock,
    })

    const result = await regenerateScheduleTokenAction({
      scheduleId: "schedule-1",
    })

    expect(result.ok).toBe(true)
    expect((result as { token: string }).token).toBeDefined()
    expect((result as { token: string }).token).toHaveLength(6)
    expect(revalidateTag).toHaveBeenCalledWith(
      CACHE_TAGS.EXAM_SCHEDULES,
      "default"
    )
  })
})
