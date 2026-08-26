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

vi.mock("@/lib/auth/rbac-guards", () => ({
  requirePermission: vi.fn().mockResolvedValue({
    user: { id: "user-1", email: "admin@example.com" },
  }),
}))

vi.mock("@/lib/users/identifiers", () => ({
  identifierTaken: vi.fn().mockResolvedValue(false),
}))

vi.mock("@/lib/db", () => {
  const selectMock = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      }),
    }),
  })

  const insertMock = vi.fn().mockReturnValue({
    values: vi.fn().mockResolvedValue(undefined),
  })

  const updateMock = vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "pkg-1" }]),
      }),
    }),
  })

  const deleteMock = vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: "pkg-1" }]),
    }),
  })

  return {
    db: {
      select: selectMock,
      insert: insertMock,
      update: updateMock,
      delete: deleteMock,
    },
  }
})

vi.mock("@/lib/slugs", () => ({
  ensureUniqueSlug: vi.fn().mockResolvedValue("paket-1"),
}))

vi.mock("@/lib/exam-packages/queries", () => ({
  examPackageSlugTaken: vi.fn().mockResolvedValue(false),
}))

import {
  createExamPackageAction,
  deleteExamPackageAction,
  updateExamPackageAction,
} from "@/lib/exam-packages/actions"

describe("Exam Package Actions Cache Invalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("calls revalidateTag with CACHE_TAGS.EXAM_PACKAGES upon successful creation", async () => {
    const result = await createExamPackageAction({
      name: "Paket Ujian 1",
      kodePaket: "PKT-001",
      description: "Deskripsi",
      durationMinutes: 60,
      shuffle: false,
      passScore: 70,
      wrongPenalty: 0,
    })

    expect(result).toEqual({ ok: true })
    expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.EXAM_PACKAGES, "default")
  })

  it("does not call revalidateTag when validation fails", async () => {
    const result = await createExamPackageAction({
      name: "",
      kodePaket: "PKT-001",
      description: "Deskripsi",
      durationMinutes: 60,
      shuffle: false,
      passScore: 70,
      wrongPenalty: 0,
    })

    expect(result.ok).toBe(false)
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it("calls revalidateTag with CACHE_TAGS.EXAM_PACKAGES upon successful update", async () => {
    const result = await updateExamPackageAction("pkg-1", {
      name: "Paket Ujian 1 Updated",
      kodePaket: "PKT-001-UPD",
      description: "Deskripsi Baru",
      durationMinutes: 90,
      shuffle: true,
      passScore: 75,
      wrongPenalty: 0,
    })

    expect(result).toEqual({ ok: true })
    expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.EXAM_PACKAGES, "default")
  })

  it("calls revalidateTag with CACHE_TAGS.EXAM_PACKAGES upon successful delete", async () => {
    const result = await deleteExamPackageAction("pkg-1")

    expect(result).toEqual({ ok: true })
    expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.EXAM_PACKAGES, "default")
  })
})
