import { describe, expect, it } from "vitest"

import {
  generateNomorPeserta,
  kodePaketSchema,
  nisSchema,
  nisnSchema,
  nipSchema,
} from "@/lib/identifiers"

const safeParse = (schema: unknown, value: unknown) =>
  (schema as { safeParse: (v: unknown) => { success: boolean } }).safeParse(value)

describe("nisnSchema", () => {
  it("accepts a 10-digit integer", () => {
    expect(safeParse(nisnSchema, 1_234_567_890).success).toBe(true)
  })

  it("rejects 9-digit and 11-digit values", () => {
    expect(safeParse(nisnSchema, 123_456_789).success).toBe(false)
    expect(safeParse(nisnSchema, 12_345_678_901).success).toBe(false)
  })

  it("rejects non-integers, negatives, and non-numbers", () => {
    expect(safeParse(nisnSchema, 12.5).success).toBe(false)
    expect(safeParse(nisnSchema, -1_234_567_890).success).toBe(false)
    expect(safeParse(nisnSchema, "1234567890").success).toBe(false)
    expect(safeParse(nisnSchema, undefined).success).toBe(false)
  })
})

describe("nisSchema", () => {
  it("accepts 3–20 characters and trims whitespace", () => {
    expect(safeParse(nisSchema, "ABC").success).toBe(true)
    expect(safeParse(nisSchema, "  AB-12345  ").success).toBe(true)
  })

  it("rejects values shorter than 3 or longer than 20 characters", () => {
    expect(safeParse(nisSchema, "AB").success).toBe(false)
    expect(safeParse(nisSchema, "A".repeat(21)).success).toBe(false)
  })

  it("is optional", () => {
    expect(safeParse(nisSchema, undefined).success).toBe(true)
  })
})

describe("nipSchema", () => {
  it("accepts 3–20 characters and trims whitespace", () => {
    expect(safeParse(nipSchema, "NIP-123").success).toBe(true)
    expect(safeParse(nipSchema, "  NIP-123  ").success).toBe(true)
  })

  it("rejects values shorter than 3 or longer than 20 characters", () => {
    expect(safeParse(nipSchema, "AB").success).toBe(false)
    expect(safeParse(nipSchema, "A".repeat(21)).success).toBe(false)
  })

  it("is required", () => {
    expect(safeParse(nipSchema, undefined).success).toBe(false)
  })
})

describe("kodePaketSchema", () => {
  it("accepts 3–20 characters and trims whitespace", () => {
    expect(safeParse(kodePaketSchema, "UAS-2026").success).toBe(true)
    expect(safeParse(kodePaketSchema, "  UAS-2026  ").success).toBe(true)
  })

  it("rejects values shorter than 3 or longer than 20 characters", () => {
    expect(safeParse(kodePaketSchema, "AB").success).toBe(false)
    expect(safeParse(kodePaketSchema, "A".repeat(21)).success).toBe(false)
  })
})

describe("generateNomorPeserta", () => {
  it("prefixes the kode paket and appends a hyphen", () => {
    expect(generateNomorPeserta("UAS-2026")).toMatch(/^UAS-2026-[A-Z2-9]{4,8}$/)
  })

  it("produces suffixes of 4–8 characters", () => {
    for (let i = 0; i < 200; i += 1) {
      const suffix = generateNomorPeserta("PKG").split("-")[1]!
      expect(suffix.length).toBeGreaterThanOrEqual(4)
      expect(suffix.length).toBeLessThanOrEqual(8)
    }
  })

  it("never emits ambiguous characters (0/O/1/I)", () => {
    for (let i = 0; i < 500; i += 1) {
      const suffix = generateNomorPeserta("PKG").split("-")[1]!
      expect(suffix).not.toMatch(/[0O1I]/)
    }
  })

  it("produces distinct values across a sample run", () => {
    const seen = new Set<string>()
    for (let i = 0; i < 1000; i += 1) {
      seen.add(generateNomorPeserta("PKG"))
    }
    expect(seen.size).toBe(1000)
  })
})
