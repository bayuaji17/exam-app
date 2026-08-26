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

vi.mock("@/lib/slugs", () => ({
  ensureUniqueSlug: vi.fn().mockResolvedValue("kategori-1"),
}))

vi.mock("@/lib/question-banks/queries", () => ({
  questionCategorySlugTaken: vi.fn().mockResolvedValue(false),
}))

import {
  createQuestionCategoryAction,
  deleteQuestionCategoryAction,
  updateQuestionCategoryAction,
} from "@/lib/question-banks/category-actions"

describe("Category Actions Cache Invalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("calls revalidateTag with CACHE_TAGS.CATEGORIES upon successful creation", async () => {
    const result = await createQuestionCategoryAction({
      name: "Kategori Matematika",
      description: "Deskripsi",
    })

    expect(result).toEqual({ ok: true, id: "cat-1" })
    expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.CATEGORIES, "default")
  })

  it("does not call revalidateTag when category creation validation fails", async () => {
    const result = await createQuestionCategoryAction({
      name: "",
      description: "Deskripsi",
    })

    expect(result).toEqual({
      ok: false,
      message: "Nama kategori wajib diisi.",
    })
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it("calls revalidateTag with CACHE_TAGS.CATEGORIES upon successful update", async () => {
    const result = await updateQuestionCategoryAction("cat-1", {
      name: "Kategori Fisika",
      description: "Deskripsi Baru",
    })

    expect(result).toEqual({ ok: true, id: "cat-1" })
    expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.CATEGORIES, "default")
  })

  it("calls revalidateTag with CACHE_TAGS.CATEGORIES upon successful deletion", async () => {
    const result = await deleteQuestionCategoryAction("cat-1")

    expect(result).toEqual({ ok: true, id: "cat-1" })
    expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.CATEGORIES, "default")
  })
})
