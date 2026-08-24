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

vi.mock("@/lib/db", () => {
  const selectMock = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      }),
    }),
  })

  const insertMock = vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: "cat-1" }]),
    }),
  })

  const updateMock = vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "cat-1" }]),
      }),
    }),
  })

  const deleteMock = vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: "cat-1" }]),
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

describe("Category Actions Cache Invalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("calls revalidateTag with CACHE_TAGS.CATEGORIES upon successful creation", async () => {
    const { createQuestionCategoryAction } = await import(
      "@/lib/question-banks/category-actions"
    )

    const result = await createQuestionCategoryAction({
      name: "Matematika Dasar",
      description: "Soal-soal matematika",
    })

    expect(result).toEqual({ ok: true, id: "cat-1" })
    expect(revalidateTag).toHaveBeenCalledTimes(1)
    expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.CATEGORIES, "default")
  })

  it("does not call revalidateTag when category validation fails", async () => {
    const { createQuestionCategoryAction } = await import(
      "@/lib/question-banks/category-actions"
    )

    const result = await createQuestionCategoryAction({
      name: "", // empty name fails validation
    })

    expect(result.ok).toBe(false)
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it("calls revalidateTag with CACHE_TAGS.CATEGORIES upon successful update", async () => {
    const { updateQuestionCategoryAction } = await import(
      "@/lib/question-banks/category-actions"
    )

    const result = await updateQuestionCategoryAction("cat-1", {
      name: "Matematika Lanjutan",
    })

    expect(result).toEqual({ ok: true, id: "cat-1" })
    expect(revalidateTag).toHaveBeenCalledTimes(1)
    expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.CATEGORIES, "default")
  })

  it("calls revalidateTag with CACHE_TAGS.CATEGORIES upon successful deletion", async () => {
    const { deleteQuestionCategoryAction } = await import(
      "@/lib/question-banks/category-actions"
    )

    const result = await deleteQuestionCategoryAction("cat-1")

    expect(result).toEqual({ ok: true, id: "cat-1" })
    expect(revalidateTag).toHaveBeenCalledTimes(1)
    expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.CATEGORIES, "default")
  })
})
