import { describe, expect, it } from "vitest"

import { parseAnswer } from "@/lib/attempts/validation"

describe("parseAnswer", () => {
  it("accepts an option id for single questions", () => {
    const result = parseAnswer("single", { chosenOptionId: "opt-1" })

    expect(result.ok).toBe(true)
  })

  it("accepts a null option id (cleared answer)", () => {
    const result = parseAnswer("scored", { chosenOptionId: null })

    expect(result.ok).toBe(true)
  })

  it("rejects a missing or malformed option payload", () => {
    expect(parseAnswer("single", {}).ok).toBe(false)
    expect(parseAnswer("single", { chosenOptionId: 42 }).ok).toBe(false)
    expect(parseAnswer("single", undefined).ok).toBe(false)
  })

  it("accepts a text answer for manual questions and trims it", () => {
    const result = parseAnswer("manual", { text: "  jawaban  " })

    expect(result.ok).toBe(true)
    expect(result.ok && "text" in result.data && result.data.text).toBe(
      "jawaban"
    )
  })

  it("rejects oversized manual answers", () => {
    const result = parseAnswer("manual", { text: "x".repeat(4001) })

    expect(result.ok).toBe(false)
  })

  it("rejects a text payload for non-manual questions and vice versa", () => {
    expect(parseAnswer("single", { text: "bukan opsi" }).ok).toBe(false)
    expect(parseAnswer("manual", { chosenOptionId: "opt-1" }).ok).toBe(false)
  })
})
