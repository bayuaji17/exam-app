import { describe, expect, it, vi } from "vitest"

import { PERMISSIONS } from "@/lib/auth/permissions-catalog"
import { createRoleAction, deleteRoleAction } from "@/lib/roles/actions"
import { roleFormSchema } from "@/lib/roles/validation"

// Mock requirePermission
vi.mock("@/lib/auth/rbac-guards", () => ({
  requirePermission: vi.fn().mockResolvedValue({
    user: { id: "admin-1", email: "admin@example.com" },
  }),
}))

// Mock revalidateTag
const revalidateTagMock = vi.fn()
vi.mock("next/cache", () => ({
  revalidateTag: (...args: unknown[]) => revalidateTagMock(...args),
}))

// Mock DB
const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  transaction: vi.fn().mockImplementation((cb) =>
    cb({
      insert: vi
        .fn()
        .mockReturnValue({ values: vi.fn().mockResolvedValue({}) }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({}),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({}),
      }),
    })
  ),
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

describe("Role Form Validation", () => {
  it("validates correct role input", () => {
    const valid = {
      name: "Editor Konten",
      description: "Bertugas membuat dan mengedit soal.",
      permissions: [
        PERMISSIONS.QUESTION_BANKS_CREATE,
        PERMISSIONS.QUESTION_BANKS_UPDATE,
      ],
    }

    const result = roleFormSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it("rejects short or empty names", () => {
    const invalid = {
      name: " ",
      description: "Deskripsi",
      permissions: [],
    }

    const result = roleFormSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it("rejects invalid permission identifiers", () => {
    const invalid = {
      name: "Manager",
      description: "Deskripsi",
      permissions: ["non_existent:permission"],
    }

    const result = roleFormSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it("handles null or empty description properly", () => {
    const valid = {
      name: "Pengawas",
      description: "",
      permissions: [PERMISSIONS.RESULTS_READ],
    }

    const result = roleFormSchema.safeParse(valid)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.description).toBeNull()
    }
  })
})

describe("Role Management Server Actions", () => {
  it("creates a new role successfully and triggers cache revalidation", async () => {
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    })
    // for slug taken check
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    })
    // for permissions fetch
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: "p1" }]),
      }),
    })

    const result = await createRoleAction({
      name: "Koordinator Ujian",
      description: "Mengatur jadwal dan kelompok peserta",
      permissions: [PERMISSIONS.EXAM_SCHEDULES_CREATE],
    })

    expect(result.ok).toBe(true)
    expect(revalidateTagMock).toHaveBeenCalledWith("roles", "default")
  })

  it("guards against deleting system roles", async () => {
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi
            .fn()
            .mockResolvedValue([
              { id: "super-id", slug: "super-admin", isSystem: true },
            ]),
        }),
      }),
    })

    const result = await deleteRoleAction("super-id")
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toContain("Role sistem tidak dapat dihapus")
    }
  })

  it("guards against deleting roles with assigned active users", async () => {
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi
            .fn()
            .mockResolvedValue([
              { id: "custom-role-1", slug: "guru", isSystem: false },
            ]),
        }),
      }),
    })
    // Count query
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 5 }]),
      }),
    })

    const result = await deleteRoleAction("custom-role-1")
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toContain("digunakan oleh 5 pengguna")
    }
  })

  it("deletes unused custom role and revalidates cache", async () => {
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi
            .fn()
            .mockResolvedValue([
              { id: "custom-role-2", slug: "guru-lama", isSystem: false },
            ]),
        }),
      }),
    })
    // Count query
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 0 }]),
      }),
    })

    const result = await deleteRoleAction("custom-role-2")
    expect(result.ok).toBe(true)
    expect(revalidateTagMock).toHaveBeenCalledWith("roles", "default")
  })
})
