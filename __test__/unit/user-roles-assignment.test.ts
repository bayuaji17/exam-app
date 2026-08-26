import { describe, expect, it, vi } from "vitest"

import { SYSTEM_ROLES } from "@/lib/auth/seed-definitions"
import { assignUserRolesAction } from "@/lib/users/roles-actions"

// Mock Next.js cache
const revalidateTagMock = vi.fn()
vi.mock("next/cache", () => ({
  revalidateTag: (...args: unknown[]) => revalidateTagMock(...args),
}))

// Mock guards
const requirePermissionMock = vi.fn()
const isSuperAdminMock = vi.fn()
vi.mock("@/lib/auth/rbac-guards", () => ({
  requirePermission: () => requirePermissionMock(),
}))

vi.mock("@/lib/auth/rbac-queries", () => ({
  isSuperAdmin: (userId: string) => isSuperAdminMock(userId),
}))

// Mock DB
const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  delete: vi.fn(),
  transaction: vi.fn().mockImplementation((cb) =>
    cb({
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({}),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue({}),
      }),
    })
  ),
}

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => mockDb.select(...args),
    delete: (...args: unknown[]) => mockDb.delete(...args),
    insert: (...args: unknown[]) => mockDb.insert(...args),
    transaction: (...args: unknown[]) => mockDb.transaction(...args),
  },
}))

describe("User Role Assignment Action", () => {
  it("blocks non-super-admin from assigning super-admin role (privilege escalation guard)", async () => {
    requirePermissionMock.mockResolvedValueOnce({
      user: { id: "admin-actor", email: "admin@example.com" },
    })
    isSuperAdminMock.mockResolvedValueOnce(false)

    // User lookup query
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: "target-user-1" }]),
        }),
      }),
    })

    // DB query for role definitions
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: "role-super", slug: SYSTEM_ROLES.SUPER_ADMIN, isSystem: true },
        ]),
      }),
    })

    const result = await assignUserRolesAction("target-user-1", ["role-super"])
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toContain("Hanya Super Administrator")
    }
  })

  it("allows super admin to assign any roles and revalidates user permission tag", async () => {
    requirePermissionMock.mockResolvedValueOnce({
      user: { id: "super-actor", email: "super@example.com" },
    })
    isSuperAdminMock.mockResolvedValueOnce(true)

    // User lookup query
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: "target-user-2" }]),
        }),
      }),
    })

    // DB query for target role definitions
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: "role-admin", slug: SYSTEM_ROLES.ADMIN, isSystem: false },
        ]),
      }),
    })

    const result = await assignUserRolesAction("target-user-2", ["role-admin"])
    expect(result.ok).toBe(true)
    expect(revalidateTagMock).toHaveBeenCalledWith(
      "permissions:user:target-user-2",
      "default"
    )
  })
})
