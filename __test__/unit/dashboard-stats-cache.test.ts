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

vi.mock("@/lib/auth/permissions", () => ({
  userHasPermission: vi.fn().mockReturnValue(true),
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
      where: vi.fn().mockImplementation(() => createQueryChain([{ id: "bank-1" }])),
    }),
  })

  const deleteMock = vi.fn().mockReturnValue({
    where: vi.fn().mockImplementation(() => createQueryChain([{ id: "bank-1" }])),
  })

  const transactionMock = vi.fn().mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
    const txMock = {
      select: selectMock,
      insert: insertMock,
      update: updateMock,
      delete: deleteMock,
    }
    return callback(txMock)
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

import { db } from "@/lib/db"
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
      name: "Bank Soal Matematika",
      description: "Deskripsi",
    })

    expect(result).toEqual({ ok: true })
    expect(mockRevalidateTag).toHaveBeenCalledWith(
      CACHE_TAGS.DASHBOARD_STATS,
      "default"
    )
  })

  it("revalidates CACHE_TAGS.DASHBOARD_STATS when deleting a question bank", async () => {
    const selectMock = vi.fn()
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() =>
            createQueryChain([{ archivedAt: new Date() }])
          ),
        }),
      })
      .mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() =>
            createQueryChain([{ id: "q-1" }])
          ),
        }),
      })
    vi.mocked(db).select = selectMock as never

    const result = await deleteQuestionBankAction("bank-123")

    expect(result).toEqual({ ok: true })
    expect(mockRevalidateTag).toHaveBeenCalledWith(
      CACHE_TAGS.DASHBOARD_STATS,
      "default"
    )
  })

  it("does not revalidate CACHE_TAGS.DASHBOARD_STATS on archiving a question bank (counts remain same)", async () => {
    const selectMock = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() =>
          createQueryChain([{ archivedAt: null }])
        ),
      }),
    })
    vi.mocked(db).select = selectMock as never

    const result = await archiveQuestionBankAction("bank-123")

    expect(result).toEqual({ ok: true })
    expect(mockRevalidateTag).not.toHaveBeenCalledWith(
      CACHE_TAGS.DASHBOARD_STATS,
      "default"
    )
  })
})
