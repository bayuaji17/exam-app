import { describe, expect, it } from "vitest"

import { questionBankSchema } from "@/lib/question-banks/validation"

describe("questionBankSchema", () => {
  it("accepts a minimal valid bank", () => {
    const result = questionBankSchema.safeParse({ name: "Matematika Dasar" })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe("Matematika Dasar")
      expect(result.data.description).toBeUndefined()
    }
  })

  it("accepts a bank with an optional description", () => {
    const result = questionBankSchema.safeParse({
      name: "Fisika",
      description: "Kinematika dan dinamika",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.description).toBe("Kinematika dan dinamika")
    }
  })

  it("trims surrounding whitespace from name and description", () => {
    const result = questionBankSchema.safeParse({
      name: "  Biologi  ",
      description: "  Sel  ",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe("Biologi")
      expect(result.data.description).toBe("Sel")
    }
  })

  it("normalizes an empty description to undefined", () => {
    const result = questionBankSchema.safeParse({
      name: "Kimia",
      description: "   ",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.description).toBeUndefined()
    }
  })

  it("rejects a missing name", () => {
    const result = questionBankSchema.safeParse({})

    expect(result.success).toBe(false)
  })

  it("rejects an empty name after trimming", () => {
    const result = questionBankSchema.safeParse({ name: "   " })

    expect(result.success).toBe(false)
  })

  it("rejects a name over 255 characters", () => {
    const result = questionBankSchema.safeParse({ name: "a".repeat(256) })

    expect(result.success).toBe(false)
  })

  it("rejects a description over 2000 characters", () => {
    const result = questionBankSchema.safeParse({
      name: "Bank",
      description: "d".repeat(2001),
    })

    expect(result.success).toBe(false)
  })
})
