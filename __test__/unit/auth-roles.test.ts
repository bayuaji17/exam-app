import { describe, expect, it } from "vitest"

import { APP_ROLES, getAppRoles, isAppRole } from "@/lib/auth-roles"

describe("auth roles", () => {
  it("recognizes supported app roles", () => {
    expect(isAppRole(APP_ROLES.SUPER_ADMIN)).toBe(true)
    expect(isAppRole(APP_ROLES.ADMIN)).toBe(true)
    expect(isAppRole(APP_ROLES.USER)).toBe(true)
  })

  it("rejects unsupported roles", () => {
    expect(isAppRole("owner")).toBe(false)
    expect(isAppRole(null)).toBe(false)
  })

  it("parses comma-separated role strings", () => {
    expect(getAppRoles("super-admin, admin, user, owner")).toEqual([
      APP_ROLES.SUPER_ADMIN,
      APP_ROLES.ADMIN,
      APP_ROLES.USER,
    ])
  })

  it("returns an empty list for non-string roles", () => {
    expect(getAppRoles(undefined)).toEqual([])
    expect(getAppRoles(["admin"])).toEqual([])
  })
})
