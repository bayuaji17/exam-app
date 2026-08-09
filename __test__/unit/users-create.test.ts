import { describe, expect, it } from "vitest"

import { APP_ROLES, type AppRole } from "@/lib/auth-roles"
import { createUserSchema, getAssignableRoles } from "@/lib/users/create"

const ALL_ROLES = Object.values(APP_ROLES)

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    name: "Budi Santoso",
    email: "budi@example.com",
    password: "password123",
    role: APP_ROLES.USER,
    ...overrides,
  }
}

/**
 * The server rule, restated from lib/auth.ts. The tests below assert the two
 * agree, so a change to one without the other fails here rather than in
 * production.
 */
function serverAllowsCreating(actor: AppRole[], target: AppRole): boolean {
  if (target === APP_ROLES.SUPER_ADMIN) {
    return false
  }

  if (actor.includes(APP_ROLES.SUPER_ADMIN)) {
    return true
  }

  return actor.includes(APP_ROLES.ADMIN) && target === APP_ROLES.USER
}

describe("getAssignableRoles", () => {
  it("lets an admin create regular users only", () => {
    expect(getAssignableRoles([APP_ROLES.ADMIN])).toEqual([APP_ROLES.USER])
  })

  it("lets a super admin create users and admins", () => {
    expect(getAssignableRoles([APP_ROLES.SUPER_ADMIN])).toEqual([
      APP_ROLES.USER,
      APP_ROLES.ADMIN,
    ])
  })

  it("offers a regular user nothing", () => {
    expect(getAssignableRoles([APP_ROLES.USER])).toEqual([])
  })

  it("offers nothing when the actor has no recognised role", () => {
    expect(getAssignableRoles([])).toEqual([])
  })

  it("never offers super admin, whoever is asking", () => {
    for (const actor of ALL_ROLES) {
      expect(getAssignableRoles([actor])).not.toContain(APP_ROLES.SUPER_ADMIN)
    }
  })

  it("agrees with the server rule for every actor and target pair", () => {
    for (const actor of ALL_ROLES) {
      const offered = getAssignableRoles([actor])

      for (const target of ALL_ROLES) {
        // `some` rather than `includes`: the offered list is narrowed to the
        // creatable roles, so `includes` would not accept `super-admin` as an
        // argument — which is exactly the case worth asserting.
        const isOffered = offered.some((role) => role === target)

        expect(isOffered).toBe(serverAllowsCreating([actor], target))
      }
    }
  })
})

describe("createUserSchema", () => {
  it("accepts a complete, valid submission", () => {
    const result = createUserSchema.safeParse(validInput())

    expect(result.success).toBe(true)
  })

  it("rejects an address that is not an email", () => {
    const result = createUserSchema.safeParse(validInput({ email: "budi@" }))

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe("Enter a valid email address")
  })

  it("rejects a password shorter than eight characters", () => {
    const result = createUserSchema.safeParse(
      validInput({ password: "short12" })
    )

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe(
      "Password must be at least 8 characters"
    )
  })

  it("accepts a password of exactly eight characters", () => {
    const result = createUserSchema.safeParse(
      validInput({ password: "12345678" })
    )

    expect(result.success).toBe(true)
  })

  it("requires a name", () => {
    const result = createUserSchema.safeParse(validInput({ name: "" }))

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe("Name is required")
  })

  it("trims surrounding whitespace from the name and email", () => {
    const result = createUserSchema.safeParse(
      validInput({ name: "  Budi  ", email: "  budi@example.com  " })
    )

    expect(result.success).toBe(true)
    expect(result.data?.name).toBe("Budi")
    expect(result.data?.email).toBe("budi@example.com")
  })

  it("lowercases the email so addresses cannot differ by case alone", () => {
    const result = createUserSchema.safeParse(
      validInput({ email: "Budi@Example.COM" })
    )

    expect(result.data?.email).toBe("budi@example.com")
  })

  it("rejects a role the app does not define", () => {
    const result = createUserSchema.safeParse(validInput({ role: "owner" }))

    expect(result.success).toBe(false)
  })

  it("rejects super admin, which is never created from the app", () => {
    const result = createUserSchema.safeParse(
      validInput({ role: APP_ROLES.SUPER_ADMIN })
    )

    expect(result.success).toBe(false)
  })
})
