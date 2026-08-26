import { describe, expect, it } from "vitest"

import { ensureUniqueSlug, slugify } from "@/lib/slugs"

const taken = (...slugs: string[]) => {
  const set = new Set(slugs)
  return async (slug: string) => set.has(slug)
}

describe("slugify", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(slugify("Bank Soal")).toBe("bank-soal")
  })

  it("trims surrounding whitespace", () => {
    expect(slugify("  Ujian Akhir  ")).toBe("ujian-akhir")
  })

  it("collapses runs of separators and strips symbols", () => {
    expect(slugify("Ujian (Akhir)  — 2024!")).toBe("ujian-akhir-2024")
  })

  it("decomposes accented characters", () => {
    expect(slugify("Café Ujian")).toBe("cafe-ujian")
  })

  it("drops other scripts", () => {
    expect(slugify("Matematika 数学")).toBe("matematika")
  })

  it("falls back to a neutral slug when nothing survives", () => {
    expect(slugify("   ")).toBe("item")
    expect(slugify("!!!")).toBe("item")
  })

  it("truncates to the max length on a hyphen boundary", () => {
    const long = `${"a-".repeat(60)}zzzzzzzzzzzz`
    const slug = slugify(long)

    expect(slug.length).toBeLessThanOrEqual(80)
    expect(slug.endsWith("-")).toBe(false)
  })
})

describe("ensureUniqueSlug", () => {
  it("returns the base slug when free", async () => {
    await expect(ensureUniqueSlug("Bank Soal", taken())).resolves.toBe(
      "bank-soal"
    )
  })

  it("appends -2 when the base is taken", async () => {
    await expect(
      ensureUniqueSlug("Bank Soal", taken("bank-soal"))
    ).resolves.toBe("bank-soal-2")
  })

  it("walks up -2, -3, … until one is free", async () => {
    await expect(
      ensureUniqueSlug("Bank Soal", taken("bank-soal", "bank-soal-2"))
    ).resolves.toBe("bank-soal-3")
  })

  it("falls back then dedups an empty name", async () => {
    await expect(ensureUniqueSlug("   ", taken("item"))).resolves.toBe("item-2")
  })
})
