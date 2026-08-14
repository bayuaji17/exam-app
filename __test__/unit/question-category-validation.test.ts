import { describe, expect, it } from "vitest"

import { questionCategorySchema } from "@/lib/question-banks/category-validation"

describe("questionCategorySchema", () => {
  it("accepts a minimal valid category", () => {
    const result = questionCategorySchema.safeParse({ name: "Aljabar" })

    expect(result.success).toBe(true)
  })

  it("trims and normalizes an empty description", () => {
    const result = questionCategorySchema.safeParse({
      name: "  Aljabar  ",
      description: "   ",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe("Aljabar")
      expect(result.data.description).toBeUndefined()
    }
  })

  it("rejects a missing or blank name", () => {
    expect(questionCategorySchema.safeParse({}).success).toBe(false)
    expect(questionCategorySchema.safeParse({ name: "  " }).success).toBe(false)
  })

  it("rejects a name over 100 characters", () => {
    expect(questionCategorySchema.safeParse({ name: "a".repeat(101) }).success).toBe(false)
  })

  it("rejects a description over 500 characters", () => {
    expect(
      questionCategorySchema.safeParse({ name: "Kategori", description: "d".repeat(501) }).success
    ).toBe(false)
  })
})
