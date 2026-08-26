import { describe, expect, it, vi } from "vitest"

import {
  PERMISSION_MODULES,
  PERMISSIONS,
} from "@/lib/auth/permissions-catalog"
import {
  WILDCARD_PERMISSION,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  requirePermission,
  requireSuperAdmin,
} from "@/lib/auth/rbac-guards"
import { getAllPermissionsGrouped } from "@/lib/auth/rbac-queries"

// Mock Next.js headers and navigation
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}))

const redirectMock = vi.fn().mockImplementation((url: string) => {
  throw new Error(`REDIRECT:${url}`)
})

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}))

// Mock Better Auth
const getSessionMock = vi.fn()
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: () => getSessionMock(),
    },
  },
}))

// Mock getUserEffectivePermissions
const getUserEffectivePermissionsMock = vi.fn()
vi.mock("@/lib/auth/rbac-queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/rbac-queries")>()
  return {
    ...actual,
    getUserEffectivePermissions: (userId: string) =>
      getUserEffectivePermissionsMock(userId),
  }
})

describe("RBAC Permission Checker Guards", () => {
  describe("hasPermission", () => {
    it("returns true when user has wildcard permission", () => {
      const perms = [WILDCARD_PERMISSION]
      expect(hasPermission(perms, PERMISSIONS.USERS_CREATE)).toBe(true)
      expect(hasPermission(perms, PERMISSIONS.SYSTEM_SETTINGS_UPDATE)).toBe(true)
      expect(hasPermission(new Set(perms), PERMISSIONS.ROLES_CREATE)).toBe(true)
    })

    it("returns true when user has exact matching permission", () => {
      const perms = [PERMISSIONS.USERS_READ, PERMISSIONS.EXAMS_CREATE]
      expect(hasPermission(perms, PERMISSIONS.USERS_READ)).toBe(true)
      expect(hasPermission(perms, PERMISSIONS.EXAMS_CREATE)).toBe(true)
      expect(hasPermission(new Set(perms), PERMISSIONS.USERS_READ)).toBe(true)
    })

    it("returns false when user does not have permission", () => {
      const perms = [PERMISSIONS.USERS_READ]
      expect(hasPermission(perms, PERMISSIONS.USERS_DELETE)).toBe(false)
      expect(hasPermission(perms, PERMISSIONS.SYSTEM_SETTINGS_UPDATE)).toBe(false)
      expect(hasPermission([], PERMISSIONS.USERS_READ)).toBe(false)
    })
  })

  describe("hasAnyPermission", () => {
    it("returns true if wildcard is present", () => {
      const perms = [WILDCARD_PERMISSION]
      expect(
        hasAnyPermission(perms, [
          PERMISSIONS.USERS_CREATE,
          PERMISSIONS.USERS_DELETE,
        ])
      ).toBe(true)
    })

    it("returns true if at least one permission matches", () => {
      const perms = [PERMISSIONS.USERS_READ]
      expect(
        hasAnyPermission(perms, [
          PERMISSIONS.USERS_CREATE,
          PERMISSIONS.USERS_READ,
        ])
      ).toBe(true)
    })

    it("returns false if none of the permissions match", () => {
      const perms = [PERMISSIONS.USERS_READ]
      expect(
        hasAnyPermission(perms, [
          PERMISSIONS.USERS_CREATE,
          PERMISSIONS.USERS_DELETE,
        ])
      ).toBe(false)
    })

    it("returns true for empty required permissions array", () => {
      expect(hasAnyPermission([], [])).toBe(true)
    })
  })

  describe("hasAllPermissions", () => {
    it("returns true if wildcard is present", () => {
      const perms = [WILDCARD_PERMISSION]
      expect(
        hasAllPermissions(perms, [
          PERMISSIONS.USERS_CREATE,
          PERMISSIONS.USERS_DELETE,
          PERMISSIONS.ROLES_CREATE,
        ])
      ).toBe(true)
    })

    it("returns true if all permissions are present", () => {
      const perms = [
        PERMISSIONS.USERS_CREATE,
        PERMISSIONS.USERS_READ,
        PERMISSIONS.USERS_UPDATE,
      ]
      expect(
        hasAllPermissions(perms, [
          PERMISSIONS.USERS_CREATE,
          PERMISSIONS.USERS_READ,
        ])
      ).toBe(true)
    })

    it("returns false if any required permission is missing", () => {
      const perms = [PERMISSIONS.USERS_CREATE, PERMISSIONS.USERS_READ]
      expect(
        hasAllPermissions(perms, [
          PERMISSIONS.USERS_CREATE,
          PERMISSIONS.USERS_DELETE,
        ])
      ).toBe(false)
    })
  })
})

describe("RBAC Server Action Guard Functions", () => {
  it("redirects to /login if user is unauthenticated", async () => {
    getSessionMock.mockResolvedValueOnce(null)

    await expect(requirePermission(PERMISSIONS.USERS_READ)).rejects.toThrow(
      "REDIRECT:/login"
    )
  })

  it("redirects to /dashboard/forbidden if user lacks required permission", async () => {
    getSessionMock.mockResolvedValueOnce({
      user: { id: "user-123", email: "test@example.com" },
    })
    getUserEffectivePermissionsMock.mockResolvedValueOnce([
      PERMISSIONS.USERS_READ,
    ])

    await expect(
      requirePermission(PERMISSIONS.SYSTEM_SETTINGS_UPDATE)
    ).rejects.toThrow("REDIRECT:/dashboard/forbidden")
  })

  it("allows access and returns session info if user has permission", async () => {
    const mockUser = { id: "user-123", email: "admin@example.com" }
    getSessionMock.mockResolvedValueOnce({
      user: mockUser,
    })
    getUserEffectivePermissionsMock.mockResolvedValueOnce([
      PERMISSIONS.EXAMS_CREATE,
    ])

    const result = await requirePermission(PERMISSIONS.EXAMS_CREATE)
    expect(result.user).toEqual(mockUser)
    expect(result.permissions).toContain(PERMISSIONS.EXAMS_CREATE)
  })

  it("guards super admin only actions", async () => {
    // Non-super-admin
    getSessionMock.mockResolvedValueOnce({
      user: { id: "user-123", email: "admin@example.com" },
    })
    getUserEffectivePermissionsMock.mockResolvedValueOnce([
      PERMISSIONS.USERS_CREATE,
    ])

    await expect(requireSuperAdmin()).rejects.toThrow(
      "REDIRECT:/dashboard/forbidden"
    )

    // Super-admin
    getSessionMock.mockResolvedValueOnce({
      user: { id: "super-1", email: "super@example.com" },
    })
    getUserEffectivePermissionsMock.mockResolvedValueOnce([WILDCARD_PERMISSION])

    const result = await requireSuperAdmin()
    expect(result.permissions).toContain(WILDCARD_PERMISSION)
  })
})

describe("RBAC Module Grouping", () => {
  it("groups all permission definitions under correct module keys", () => {
    const grouped = getAllPermissionsGrouped()

    for (const mod of PERMISSION_MODULES) {
      expect(Array.isArray(grouped[mod])).toBe(true)
      expect(grouped[mod].length).toBeGreaterThan(0)
      for (const def of grouped[mod]) {
        expect(def.module).toBe(mod)
      }
    }
  })
})
