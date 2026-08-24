import { beforeEach, describe, expect, it, vi } from "vitest"
import { revalidateTag } from "next/cache"

import { CACHE_TAGS } from "@/lib/cache-tags"

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}))

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}))

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue({
        user: { id: "user-1", role: "admin" },
      }),
    },
  },
}))

vi.mock("@/lib/auth/permissions", () => ({
  userHasPermission: vi.fn().mockReturnValue(true),
}))

vi.mock("@/lib/slugs", () => ({
  ensureUniqueSlug: vi.fn().mockResolvedValue("sesi-ujian-pagi"),
}))

const selectMock = vi.fn()
const insertMock = vi.fn()
const updateMock = vi.fn()
const deleteMock = vi.fn()

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => selectMock(...args),
    insert: (...args: unknown[]) => insertMock(...args),
    update: (...args: unknown[]) => updateMock(...args),
    delete: (...args: unknown[]) => deleteMock(...args),
  },
}))

describe("Exam Schedule and Introduction Actions Cache Invalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    selectMock.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockImplementation(() =>
            // First call for assertPackageExists: returns package row
            // Subsequent call for assertNoOverlap: returns empty
            Promise.resolve([{ id: "pkg-1", name: "Paket 1" }])
          ),
        }),
      }),
    })

    insertMock.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    })

    updateMock.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "sched-1" }]),
        }),
      }),
    })

    deleteMock.mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "sched-1" }]),
      }),
    })
  })

  it("calls revalidateTag with CACHE_TAGS.EXAM_SCHEDULES upon successful schedule creation", async () => {
    // For assertNoOverlap, limit returns null/empty
    let callCount = 0
    selectMock.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockImplementation(() => {
            callCount++
            if (callCount === 1) {
              // assertPackageExists
              return Promise.resolve([{ id: "pkg-1" }])
            }
            // assertNoOverlap
            return Promise.resolve([])
          }),
        }),
      }),
    })

    const { createExamScheduleAction } = await import(
      "@/lib/exam-schedules/actions"
    )

    const result = await createExamScheduleAction({
      name: "Sesi Ujian Pagi",
      packageId: "pkg-1",
      startsAt: "2026-09-01T08:00:00Z",
      endsAt: "2026-09-01T10:00:00Z",
      durationMinutes: 90,
      attemptLimit: 1,
    })

    expect(result).toEqual({ ok: true })
    expect(revalidateTag).toHaveBeenCalledTimes(1)
    expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.EXAM_SCHEDULES, "default")
  })

  it("calls revalidateTag for INTRODUCTIONS and EXAM_SCHEDULES upon updating introduction", async () => {
    const { updateExamScheduleIntroductionAction } = await import(
      "@/lib/exam-schedules/actions"
    )

    const validDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Kerjakan dengan jujur." }],
        },
      ],
    }

    const result = await updateExamScheduleIntroductionAction("sched-1", validDoc)

    expect(result).toEqual({ ok: true })
    expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.INTRODUCTIONS, "default")
    expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.EXAM_SCHEDULES, "default")
  })
})
