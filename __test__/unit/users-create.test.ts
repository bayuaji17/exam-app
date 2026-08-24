import { describe, expect, it } from "vitest"

import { APP_ROLES } from "@/lib/auth-roles"
import {
  canAssignRole,
  createUserSchema,
  getAssignableRoles,
} from "@/lib/users/create"

const ALL_ROLES = Object.values(APP_ROLES)

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    name: "Budi Santoso",
    email: "budi@example.com",
    password: "password123",
    role: APP_ROLES.USER,
    nisn: 1234567890,
    ...overrides,
  }
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
})

describe("canAssignRole", () => {
  it("is the single rule behind both the server and the forms", () => {
    for (const actor of ALL_ROLES) {
      for (const target of ALL_ROLES) {
        const offered = getAssignableRoles([actor])

        // `some` rather than `includes`: the offered list is narrowed to the
        // creatable roles, so `includes` would not accept `super-admin` as an
        // argument — which is exactly the case worth asserting.
        const isOffered = offered.some((role) => role === target)

        expect(isOffered).toBe(canAssignRole([actor], target))
      }
    }
  })

  it("never allows assigning a super admin", () => {
    for (const actor of ALL_ROLES) {
      expect(canAssignRole([actor], APP_ROLES.SUPER_ADMIN)).toBe(false)
    }
  })

  it("lets a super admin assign user and admin", () => {
    expect(canAssignRole([APP_ROLES.SUPER_ADMIN], APP_ROLES.USER)).toBe(true)
    expect(canAssignRole([APP_ROLES.SUPER_ADMIN], APP_ROLES.ADMIN)).toBe(true)
  })

  it("lets an admin assign user only", () => {
    expect(canAssignRole([APP_ROLES.ADMIN], APP_ROLES.USER)).toBe(true)
    expect(canAssignRole([APP_ROLES.ADMIN], APP_ROLES.ADMIN)).toBe(false)
  })

  it("lets a regular user assign nothing", () => {
    expect(canAssignRole([APP_ROLES.USER], APP_ROLES.USER)).toBe(false)
    expect(canAssignRole([APP_ROLES.USER], APP_ROLES.ADMIN)).toBe(false)
  })
})

describe("createUserSchema", () => {
  it("accepts a complete, valid submission for user role with NISN and NIS", () => {
    const result = createUserSchema.safeParse(
      validInput({ nisn: 1234567890, nis: "2026-001" })
    )

    expect(result.success).toBe(true)
  })

  it("rejects user role without NISN", () => {
    const result = createUserSchema.safeParse(
      validInput({ nisn: undefined })
    )

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe("NISN harus berupa angka.")
  })

  it("rejects user role with invalid 9-digit NISN", () => {
    const result = createUserSchema.safeParse(
      validInput({ nisn: 123456789 })
    )

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe("NISN harus 10 digit.")
  })

  it("accepts valid admin submission with NIP", () => {
    const result = createUserSchema.safeParse({
      name: "Admin User",
      email: "admin@example.com",
      password: "password123",
      role: APP_ROLES.ADMIN,
      nip: "198501012010011001",
    })

    expect(result.success).toBe(true)
  })

  it("rejects admin submission without NIP", () => {
    const result = createUserSchema.safeParse({
      name: "Admin User",
      email: "admin@example.com",
      password: "password123",
      role: APP_ROLES.ADMIN,
      nip: "",
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe("NIP minimal 3 karakter.")
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
