import { describe, expect, it } from "vitest"

import { participantGroupSchema } from "@/lib/participants/validation"

describe("participantGroupSchema", () => {
  it("accepts a minimal valid group", () => {
    const result = participantGroupSchema.safeParse({ name: "Kelas 12 IPA" })

    expect(result.success).toBe(true)
    expect(result.success && result.data.name).toBe("Kelas 12 IPA")
  })

  it("accepts an optional description and normalizes empties to absent", () => {
    const withDescription = participantGroupSchema.safeParse({
      name: "Grup A",
      description: "  Peserta seleksi beasiswa  ",
    })

    expect(withDescription.success).toBe(true)
    expect(withDescription.success && withDescription.data.description).toBe(
      "Peserta seleksi beasiswa"
    )

    const emptyDescription = participantGroupSchema.safeParse({
      name: "Grup B",
      description: "   ",
    })

    expect(emptyDescription.success).toBe(true)
    expect(emptyDescription.success && emptyDescription.data.description).toBe(
      undefined
    )
  })

  it("trims the name", () => {
    const result = participantGroupSchema.safeParse({ name: "  Grup Baru  " })

    expect(result.success).toBe(true)
    expect(result.success && result.data.name).toBe("Grup Baru")
  })

  it("rejects a missing or blank name", () => {
    expect(participantGroupSchema.safeParse({}).success).toBe(false)
    expect(participantGroupSchema.safeParse({ name: "" }).success).toBe(false)
    expect(participantGroupSchema.safeParse({ name: "   " }).success).toBe(
      false
    )
  })

  it("enforces the name and description length caps", () => {
    const longName = participantGroupSchema.safeParse({
      name: "a".repeat(101),
    })

    expect(longName.success).toBe(false)

    const longDescription = participantGroupSchema.safeParse({
      name: "Grup",
      description: "b".repeat(501),
    })

    expect(longDescription.success).toBe(false)
  })
})
