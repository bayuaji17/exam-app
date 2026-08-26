import { beforeEach, describe, expect, it, vi } from "vitest"
import { CACHE_TAGS } from "@/lib/cache-tags"

const { mockRevalidateTag } = vi.hoisted(() => ({
  mockRevalidateTag: vi.fn(),
}))

vi.mock("next/cache", () => ({
  revalidateTag: mockRevalidateTag,
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
        user: { id: "user-1", name: "Admin", role: "admin" },
      }),
    },
  },
}))

vi.mock("@/lib/auth/rbac-guards", () => ({
  requirePermission: vi.fn().mockResolvedValue({
    user: { id: "user-1", email: "admin@example.com" },
  }),
}))

const createQueryChain = (resolvedValue: unknown) => {
  const promise = Promise.resolve(resolvedValue)
  return Object.assign(promise, {
    limit: vi.fn().mockResolvedValue(resolvedValue),
  })
}

vi.mock("@/lib/db", () => {
  const selectMock = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockImplementation(() => createQueryChain([])),
    }),
  })

  const insertMock = vi.fn().mockReturnValue({
    values: vi.fn().mockResolvedValue([{ id: "bank-1" }]),
  })

  const updateMock = vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi
        .fn()
        .mockImplementation(() => createQueryChain([{ id: "bank-1" }])),
    }),
  })

  const deleteMock = vi.fn().mockReturnValue({
    where: vi
      .fn()
      .mockImplementation(() => createQueryChain([{ id: "bank-1" }])),
  })

  const transactionMock = vi.fn().mockImplementation(async (callback) => {
    return callback({
      select: selectMock,
      insert: insertMock,
      update: updateMock,
      delete: deleteMock,
    })
  })

  return {
    db: {
      select: selectMock,
      insert: insertMock,
      update: updateMock,
      delete: deleteMock,
      transaction: transactionMock,
    },
  }
})

vi.mock("@/lib/slugs", () => ({
  ensureUniqueSlug: vi.fn().mockResolvedValue("slug-1"),
}))

vi.mock("@/lib/question-banks/queries", () => ({
  questionBankSlugTaken: vi.fn().mockResolvedValue(false),
}))

import { createQuestionBankAction } from "@/lib/question-banks/actions"
import {
  archiveQuestionBankAction,
  deleteQuestionBankAction,
} from "@/lib/question-banks/lifecycle-actions"

describe("Dashboard Stats Cache Invalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("revalidates CACHE_TAGS.DASHBOARD_STATS when creating a question bank", async () => {
    const result = await createQuestionBankAction({
      name: "Bank Soal IPA",
      description: "Deskripsi",
    })

    expect(result).toEqual({ ok: true })
    expect(mockRevalidateTag).toHaveBeenCalledWith(
      CACHE_TAGS.DASHBOARD_STATS,
      "default"
    )
  })

  it("does not revalidate CACHE_TAGS.DASHBOARD_STATS on question bank validation failure", async () => {
    const result = await createQuestionBankAction({
      name: "",
      description: "Deskripsi",
    })

    expect(result.ok).toBe(false)
    expect(mockRevalidateTag).not.toHaveBeenCalled()
  })

  it("revalidates CACHE_TAGS.DASHBOARD_STATS when deleting a question bank", async () => {
    const { db } = await import("@/lib/db")
    // Mock getBankState returning an archived bank so delete is allowed
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ archivedAt: new Date() }]),
        }),
      }),
    } as never)

    const result = await deleteQuestionBankAction("bank-1")

    expect(result).toEqual({ ok: true })
    expect(mockRevalidateTag).toHaveBeenCalledWith(
      CACHE_TAGS.DASHBOARD_STATS,
      "default"
    )
  })

  it("does not revalidate CACHE_TAGS.DASHBOARD_STATS on archiving a question bank (counts remain same)", async () => {
    const { db } = await import("@/lib/db")
    // Mock getBankState returning an unarchived bank
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ archivedAt: null }]),
        }),
      }),
    } as never)

    const result = await archiveQuestionBankAction("bank-1")

    expect(result).toEqual({ ok: true })
    expect(mockRevalidateTag).not.toHaveBeenCalledWith(
      CACHE_TAGS.DASHBOARD_STATS,
      "default"
    )
  })
})
