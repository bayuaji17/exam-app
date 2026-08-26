import { describe, expect, it, vi } from "vitest"

import { PERMISSIONS } from "@/lib/auth/permissions-catalog"
import { createExamPackageAction, deleteExamPackageAction, updateExamPackageAction } from "@/lib/exam-packages/actions"
import { createExamScheduleAction, deleteExamScheduleAction, updateExamScheduleAction } from "@/lib/exam-schedules/actions"
import { createParticipantGroupAction, deleteParticipantGroupAction, updateParticipantGroupAction } from "@/lib/participants/actions"
import { createQuestionBankAction, updateQuestionBankAction } from "@/lib/question-banks/actions"
import { createQuestionCategoryAction, deleteQuestionCategoryAction, updateQuestionCategoryAction } from "@/lib/question-banks/category-actions"
import { deleteQuestionBankAction } from "@/lib/question-banks/lifecycle-actions"

// Mock requirePermission
const requirePermissionMock = vi.fn().mockResolvedValue({
  user: { id: "user-123", email: "test@example.com" },
})

vi.mock("@/lib/auth/rbac-guards", () => ({
  requirePermission: (permission: string) => requirePermissionMock(permission),
}))

// Mock revalidateTag
vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
}))

// Mock DB
const mockDb = {
  select: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      }),
    }),
  }),
  insert: vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: "new-id" }]),
    }),
  }),
  update: vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "updated-id" }]),
      }),
    }),
  }),
  delete: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: "deleted-id" }]),
    }),
  }),
  transaction: vi.fn().mockImplementation((cb) => cb(mockDb)),
}

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => mockDb.select(...args),
    insert: (...args: unknown[]) => mockDb.insert(...args),
    update: (...args: unknown[]) => mockDb.update(...args),
    delete: (...args: unknown[]) => mockDb.delete(...args),
    transaction: (...args: unknown[]) => mockDb.transaction(...args),
  },
}))

describe("Domain Actions Authorization Migration", () => {
  it("enforces QUESTION_BANKS_CREATE on createQuestionBankAction", async () => {
    await createQuestionBankAction({
      name: "Bank Soal Matematika",
      description: "Soal Ujian Matematika",
    })

    expect(requirePermissionMock).toHaveBeenCalledWith(
      PERMISSIONS.QUESTION_BANKS_CREATE
    )
  })

  it("enforces QUESTION_BANKS_UPDATE on updateQuestionBankAction", async () => {
    await updateQuestionBankAction("bank-1", {
      name: "Bank Soal Matematika Revisi",
      description: "Deskripsi",
    })

    expect(requirePermissionMock).toHaveBeenCalledWith(
      PERMISSIONS.QUESTION_BANKS_UPDATE
    )
  })

  it("enforces QUESTION_BANKS_DELETE on deleteQuestionBankAction", async () => {
    // Mock existing bank in archived state
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            { id: "bank-1", archivedAt: new Date() },
          ]),
        }),
      }),
    })

    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    })

    await deleteQuestionBankAction("bank-1")
    expect(requirePermissionMock).toHaveBeenCalledWith(
      PERMISSIONS.QUESTION_BANKS_DELETE
    )
  })

  it("enforces QUESTION_CATEGORIES permissions on category actions", async () => {
    await createQuestionCategoryAction({
      name: "Aljabar",
      description: undefined,
    })
    expect(requirePermissionMock).toHaveBeenCalledWith(
      PERMISSIONS.QUESTION_CATEGORIES_CREATE
    )

    await updateQuestionCategoryAction("cat-1", {
      name: "Geometri",
      description: undefined,
    })
    expect(requirePermissionMock).toHaveBeenCalledWith(
      PERMISSIONS.QUESTION_CATEGORIES_UPDATE
    )

    await deleteQuestionCategoryAction("cat-1")
    expect(requirePermissionMock).toHaveBeenCalledWith(
      PERMISSIONS.QUESTION_CATEGORIES_DELETE
    )
  })

  it("enforces EXAMS permissions on exam package actions", async () => {
    await createExamPackageAction({
      name: "Paket Ujian Akhir",
      kodePaket: "PUA-2026",
      description: undefined,
      durationMinutes: 90,
      shuffle: false,
      passScore: 75,
      wrongPenalty: 0,
    })
    expect(requirePermissionMock).toHaveBeenCalledWith(PERMISSIONS.EXAMS_CREATE)

    await updateExamPackageAction("pkg-1", {
      name: "Paket Ujian Akhir Revisi",
      kodePaket: "PUA-2026-REV",
      description: undefined,
      durationMinutes: 90,
      shuffle: false,
      passScore: 75,
      wrongPenalty: 0,
    })
    expect(requirePermissionMock).toHaveBeenCalledWith(PERMISSIONS.EXAMS_UPDATE)

    await deleteExamPackageAction("pkg-1")
    expect(requirePermissionMock).toHaveBeenCalledWith(PERMISSIONS.EXAMS_DELETE)
  })

  it("enforces EXAM_SCHEDULES permissions on exam schedule actions", async () => {
    const startsAt = new Date(Date.now() + 86400000).toISOString()
    const endsAt = new Date(Date.now() + 172800000).toISOString()

    await createExamScheduleAction({
      name: "Sesi 1 Pagi",
      packageId: "pkg-1",
      startsAt,
      endsAt,
      durationMinutes: 60,
      attemptLimit: 1,
      introduction: undefined,
    })
    expect(requirePermissionMock).toHaveBeenCalledWith(
      PERMISSIONS.EXAM_SCHEDULES_CREATE
    )

    await updateExamScheduleAction("sch-1", {
      name: "Sesi 1 Pagi Revisi",
      packageId: "pkg-1",
      startsAt,
      endsAt,
      durationMinutes: 60,
      attemptLimit: 1,
      introduction: undefined,
    })
    expect(requirePermissionMock).toHaveBeenCalledWith(
      PERMISSIONS.EXAM_SCHEDULES_UPDATE
    )

    await deleteExamScheduleAction("sch-1")
    expect(requirePermissionMock).toHaveBeenCalledWith(
      PERMISSIONS.EXAM_SCHEDULES_DELETE
    )
  })

  it("enforces USER_GROUPS permissions on participant group actions", async () => {
    await createParticipantGroupAction({
      name: "Kelas XII IPA 1",
      description: undefined,
    })
    expect(requirePermissionMock).toHaveBeenCalledWith(
      PERMISSIONS.USER_GROUPS_CREATE
    )

    await updateParticipantGroupAction("grp-1", {
      name: "Kelas XII IPA 2",
      description: undefined,
    })
    expect(requirePermissionMock).toHaveBeenCalledWith(
      PERMISSIONS.USER_GROUPS_UPDATE
    )

    await deleteParticipantGroupAction("grp-1")
    expect(requirePermissionMock).toHaveBeenCalledWith(
      PERMISSIONS.USER_GROUPS_DELETE
    )
  })
})
