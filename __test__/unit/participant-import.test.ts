import { describe, expect, it } from "vitest"

import {
  generatePassword,
  parseImportRow,
  validateImportPlan,
  validateImportRow,
} from "@/lib/participants/import"

const GROUPS = new Set(["kelas a", "kelas b"])

function row(overrides: Partial<ReturnType<typeof parseImportRow>> = {}) {
  return {
    rowNumber: 2,
    name: "Budi",
    email: "budi@example.com",
    username: null,
    password: null,
    groupNames: [],
    ...overrides,
  }
}

describe("parseImportRow", () => {
  it("parses cells and lowercases the email", () => {
    const parsed = parseImportRow(2, {
      Nama: "  Budi  ",
      Email: "  Budi@Example.COM ",
      Username: "budi",
      "Kata Sandi": "Rahasia123!",
      Grup: " Kelas A , Kelas B ",
    })

    expect(parsed).toEqual({
      rowNumber: 2,
      name: "Budi",
      email: "budi@example.com",
      username: "budi",
      password: "Rahasia123!",
      groupNames: ["Kelas A", "Kelas B"],
    })
  })

  it("handles missing optional cells", () => {
    const parsed = parseImportRow(2, { Nama: "Siti", Email: "siti@example.com" })

    expect(parsed.username).toBeNull()
    expect(parsed.password).toBeNull()
    expect(parsed.groupNames).toEqual([])
  })
})

describe("validateImportRow", () => {
  it("accepts a valid row", () => {
    expect(validateImportRow(row(), GROUPS)).toEqual([])
  })

  it("rejects a missing name and an invalid email", () => {
    const errors = validateImportRow(
      row({ name: "", email: "not-an-email" }),
      GROUPS
    )

    expect(errors.map((entry) => entry.message)).toEqual([
      "Nama wajib diisi.",
      "Email tidak valid.",
    ])
  })

  it("rejects short passwords", () => {
    const errors = validateImportRow(row({ password: "short" }), GROUPS)

    expect(errors[0]?.message).toContain("minimal 8")
  })

  it("rejects malformed usernames", () => {
    const errors = validateImportRow(
      row({ username: "ab" }),
      GROUPS
    )

    expect(errors[0]?.message).toContain("3–30")
  })

  it("rejects unknown group names", () => {
    const errors = validateImportRow(
      row({ groupNames: ["Kelas A", "Tidak Ada"] }),
      GROUPS
    )

    expect(errors[0]?.message).toContain('Grup "Tidak Ada" tidak ditemukan.')
  })
})

describe("validateImportPlan", () => {
  it("is valid when every row is valid", () => {
    const plan = validateImportPlan(
      [row(), row({ rowNumber: 3, name: "Siti", email: "siti@example.com" })],
      new Set(),
      GROUPS
    )

    expect(plan.valid).toBe(true)
    expect(plan.errors).toEqual([])
  })

  it("flags emails already in the database", () => {
    const plan = validateImportPlan([row()], new Set(["budi@example.com"]), GROUPS)

    expect(plan.valid).toBe(false)
    expect(plan.errors[0]?.message).toContain("sudah terdaftar")
  })

  it("flags emails duplicated within the file", () => {
    const plan = validateImportPlan(
      [row(), row({ rowNumber: 3, name: "Budi Lagi" })],
      new Set(),
      GROUPS
    )

    expect(plan.valid).toBe(false)
    expect(plan.errors.some((entry) => entry.message.includes("duplikat"))).toBe(true)
  })

  it("aggregates errors across rows (all-or-nothing)", () => {
    const plan = validateImportPlan(
      [
        row({ name: "" }),
        row({ rowNumber: 3, email: "bad" }),
      ],
      new Set(),
      GROUPS
    )

    expect(plan.valid).toBe(false)
    expect(plan.errors).toHaveLength(2)
  })
})

describe("generatePassword", () => {
  it("produces 12-character passwords with letters, digits, and symbols", () => {
    const password = generatePassword()

    expect(password).toHaveLength(12)
    expect(password).toMatch(/[A-Z]/)
    expect(password).toMatch(/[a-z]/)
    expect(password).toMatch(/[0-9]/)
    expect(password).toMatch(/[!@#$%^&*]/)
  })

  it("produces different passwords on consecutive calls", () => {
    expect(generatePassword()).not.toBe(generatePassword())
  })
})
