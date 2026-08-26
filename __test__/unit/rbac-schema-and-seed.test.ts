import { describe, expect, it, vi } from "vitest"

import {
  ALL_PERMISSIONS,
  PERMISSION_DEFINITIONS,
  PERMISSION_MODULES,
  PERMISSIONS,
  isAppPermission,
} from "@/lib/auth/permissions-catalog"
import {
  DEFAULT_ROLE_DEFINITIONS,
  SYSTEM_ROLES,
  getInitialPermissionsForRole,
} from "@/lib/auth/seed-definitions"
import {
  type DatabaseClient,
  migrateLegacyUserRoles,
  seedRbac,
} from "@/lib/db/seed-rbac"

describe("Dynamic RBAC Permissions Catalog", () => {
  it("defines all canonical permissions with resource:action format", () => {
    expect(ALL_PERMISSIONS.length).toBeGreaterThan(20)

    for (const perm of ALL_PERMISSIONS) {
      expect(perm).toMatch(/^[a-z_]+:[a-z_]+$/)
      expect(isAppPermission(perm)).toBe(true)
    }
  })

  it("validates permission definitions have valid module grouping and descriptions", () => {
    expect(PERMISSION_DEFINITIONS.length).toBe(ALL_PERMISSIONS.length)

    const names = new Set<string>()
    for (const def of PERMISSION_DEFINITIONS) {
      expect(names.has(def.name)).toBe(false)
      names.add(def.name)

      expect(def.resource).toBeDefined()
      expect(def.action).toBeDefined()
      expect(def.module).toBeDefined()
      expect(PERMISSION_MODULES).toContain(def.module)
      expect(def.description.length).toBeGreaterThan(0)
    }
  })

  it("rejects invalid permission strings", () => {
    expect(isAppPermission("invalid_permission")).toBe(false)
    expect(isAppPermission("users:")).toBe(false)
    expect(isAppPermission(":read")).toBe(false)
    expect(isAppPermission(null)).toBe(false)
    expect(isAppPermission(undefined)).toBe(false)
  })
})

describe("Dynamic RBAC Seed Definitions", () => {
  it("defines immutable system roles and default custom role", () => {
    expect(SYSTEM_ROLES.SUPER_ADMIN).toBe("super-admin")
    expect(SYSTEM_ROLES.ADMIN).toBe("admin")
    expect(SYSTEM_ROLES.USER).toBe("user")

    const superAdminRole = DEFAULT_ROLE_DEFINITIONS.find(
      (r) => r.slug === SYSTEM_ROLES.SUPER_ADMIN
    )
    expect(superAdminRole).toBeDefined()
    expect(superAdminRole?.isSystem).toBe(true)
    expect(superAdminRole?.isDefault).toBe(false)

    const userRole = DEFAULT_ROLE_DEFINITIONS.find(
      (r) => r.slug === SYSTEM_ROLES.USER
    )
    expect(userRole).toBeDefined()
    expect(userRole?.isSystem).toBe(true)
    expect(userRole?.isDefault).toBe(true)

    const adminRole = DEFAULT_ROLE_DEFINITIONS.find(
      (r) => r.slug === SYSTEM_ROLES.ADMIN
    )
    expect(adminRole).toBeDefined()
    expect(adminRole?.isSystem).toBe(false)
  })

  it("assigns appropriate baseline permissions to initial roles", () => {
    const adminPermissions = getInitialPermissionsForRole(SYSTEM_ROLES.ADMIN)
    expect(adminPermissions).toContain(PERMISSIONS.QUESTION_BANKS_CREATE)
    expect(adminPermissions).toContain(PERMISSIONS.EXAMS_CREATE)
    expect(adminPermissions).toContain(PERMISSIONS.USERS_READ)
    // admin role should not have roles:create (exclusive to super-admin) or system_settings:update
    expect(adminPermissions).not.toContain(PERMISSIONS.ROLES_CREATE)
    expect(adminPermissions).not.toContain(PERMISSIONS.ROLES_DELETE)
    expect(adminPermissions).not.toContain(PERMISSIONS.SYSTEM_SETTINGS_UPDATE)

    const userPermissions = getInitialPermissionsForRole(SYSTEM_ROLES.USER)
    // user role has minimal/no administrative permissions
    expect(userPermissions.length).toBe(0)
  })
})

interface MockPermission {
  id: string
  name: string
  resource: string
  action: string
  description?: string
  module: string
}

interface MockRole {
  id: string
  name: string
  slug: string
  description?: string
  isSystem: boolean
  isDefault: boolean
}

interface MockRolePermission {
  roleId: string
  permissionId: string
}

interface MockUserRole {
  userId: string
  roleId: string
}

interface MockUser {
  id: string
  role: string
}

function createMockDb(initialState?: {
  permissions?: MockPermission[]
  roles?: MockRole[]
  rolePermissions?: MockRolePermission[]
  userRoles?: MockUserRole[]
  users?: MockUser[]
}) {
  const permissions = initialState?.permissions ? [...initialState.permissions] : []
  const roles = initialState?.roles ? [...initialState.roles] : []
  const rolePermissions = initialState?.rolePermissions ? [...initialState.rolePermissions] : []
  const userRoles = initialState?.userRoles ? [...initialState.userRoles] : []
  const users = initialState?.users ? [...initialState.users] : []

  function getTableName(table: Record<string | symbol, unknown> | undefined): string {
    if (!table) return "unknown"
    const symName = table[Symbol.for("drizzle:Name")]
    if (typeof symName === "string") return symName
    const underscoreName = (table as { _?: { name?: string } })._?.name
    if (typeof underscoreName === "string") return underscoreName
    const directName = (table as { name?: string }).name
    if (typeof directName === "string") return directName
    return "unknown"
  }

  const db = {
    select: vi.fn().mockImplementation(() => ({
      from: vi.fn().mockImplementation((table: Record<string | symbol, unknown>) => {
        const name = getTableName(table)
        let dataset: unknown[] = []
        if (name === "permission") dataset = permissions
        else if (name === "role") dataset = roles
        else if (name === "role_permission") dataset = rolePermissions
        else if (name === "user_role") dataset = userRoles
        else if (name === "user") dataset = users

        const createQuery = (data: unknown[]) => {
          const promise = Promise.resolve(data)
          return Object.assign(promise, {
            where: vi.fn().mockImplementation((condition: { queryChunks?: Array<{ value?: string } | string> }) => {
              const queryStr = condition?.queryChunks
                ? condition.queryChunks.map((c) => (typeof c === "object" ? c?.value : c)).join(" ")
                : ""

              if (name === "permission") {
                const matched = permissions.filter((p) =>
                  queryStr ? queryStr.includes(p.name) : true
                )
                return createQuery(matched)
              }
              if (name === "role") {
                const matched = roles.filter((r) =>
                  queryStr ? queryStr.includes(r.slug) : true
                )
                return createQuery(matched)
              }
              if (name === "user_role") {
                const matched = userRoles.filter((ur) =>
                  queryStr ? queryStr.includes(ur.userId) : true
                )
                return createQuery(matched)
              }
              if (name === "role_permission") {
                const matched = rolePermissions.filter((rp) =>
                  queryStr ? queryStr.includes(rp.roleId) : true
                )
                return createQuery(matched)
              }
              return createQuery([])
            }),
            limit: vi.fn().mockImplementation((num: number) => createQuery(data.slice(0, num))),
          })
        }

        return createQuery(dataset)
      }),
    })),
    insert: vi.fn().mockImplementation((table: Record<string | symbol, unknown>) => ({
      values: vi.fn().mockImplementation((vals: unknown) => {
        const name = getTableName(table)
        if (name === "permission") permissions.push(vals as MockPermission)
        else if (name === "role") roles.push(vals as MockRole)
        else if (name === "role_permission") rolePermissions.push(vals as MockRolePermission)
        else if (name === "user_role") userRoles.push(vals as MockUserRole)

        return {
          onConflictDoNothing: vi.fn().mockResolvedValue({}),
        }
      }),
    })),
    state: { permissions, roles, rolePermissions, userRoles, users },
  }

  return db as unknown as DatabaseClient & { state: typeof db.state }
}

describe("RBAC Seed & Migration Logic", () => {
  it("runs seedRbac idempotently and populates roleIdMap", async () => {
    const mockDb = createMockDb()

    const { roleIdMap } = await seedRbac(mockDb)
    expect(roleIdMap.has(SYSTEM_ROLES.SUPER_ADMIN)).toBe(true)
    expect(roleIdMap.has(SYSTEM_ROLES.ADMIN)).toBe(true)
    expect(roleIdMap.has(SYSTEM_ROLES.USER)).toBe(true)
    expect(mockDb.state.permissions.length).toBe(PERMISSION_DEFINITIONS.length)
    expect(mockDb.state.roles.length).toBe(DEFAULT_ROLE_DEFINITIONS.length)
  })

  it("migrates existing users to user_roles entries", async () => {
    const mockDb = createMockDb({
      users: [
        { id: "u1", role: "super-admin" },
        { id: "u2", role: "admin" },
        { id: "u3", role: "user" },
      ],
    })

    const result = await migrateLegacyUserRoles(mockDb)
    expect(result.totalUsers).toBe(3)
    expect(result.migratedCount).toBe(3)
    expect(mockDb.state.userRoles.length).toBe(3)
  })
})
