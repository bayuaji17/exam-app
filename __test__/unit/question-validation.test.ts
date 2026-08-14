import { describe, expect, it } from "vitest"

import type { TipTapDoc } from "@/lib/content-policy"
import {
  extractQuestionSearchText,
  validateQuestionInvariants,
  validateQuestionPayload,
  type QuestionOptionInput,
} from "@/lib/question-banks/question-validation"

const DOC: TipTapDoc = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "teks" }] }] }

function option(
  content: TipTapDoc = DOC,
  extra: Partial<{ isCorrect: boolean; score: number }> = {}
): QuestionOptionInput {
  return { content, ...extra }
}



describe("validateQuestionInvariants", () => {
  it("accepts a single question with two options and exactly one correct", () => {
    const issues = validateQuestionInvariants("single", [
      option(undefined, { isCorrect: true }),
      option(),
    ])

    expect(issues).toEqual([])
  })

  it("rejects a single question without a correct option", () => {
    const issues = validateQuestionInvariants("single", [option(), option()])

    expect(issues.some((issue) => issue.message.includes("jawaban benar"))).toBe(true)
  })

  it("rejects a single question with two correct options", () => {
    const issues = validateQuestionInvariants("single", [
      option(undefined, { isCorrect: true }),
      option(undefined, { isCorrect: true }),
    ])

    expect(issues.some((issue) => issue.message.includes("tepat satu"))).toBe(true)
  })

  it("rejects fewer than two options", () => {
    const issues = validateQuestionInvariants("single", [option(undefined, { isCorrect: true })])

    expect(issues.some((issue) => issue.message.includes("Minimal dua opsi"))).toBe(true)
  })

  it("accepts a scored question with numeric scores", () => {
    const issues = validateQuestionInvariants("scored", [
      option(undefined, { score: 0 }),
      option(undefined, { score: -1.5 }),
    ])

    expect(issues).toEqual([])
  })

  it("rejects a scored question with a missing or non-numeric score", () => {
    const issues = validateQuestionInvariants("scored", [option(), option(undefined, { score: 2 })])

    expect(issues.some((issue) => issue.path === "options[0].score")).toBe(true)
  })

  it("accepts a manual question without options", () => {
    expect(validateQuestionInvariants("manual", [])).toEqual([])
  })

  it("rejects a manual question carrying options", () => {
    const issues = validateQuestionInvariants("manual", [option()])

    expect(issues.some((issue) => issue.message.includes("tidak boleh memiliki opsi"))).toBe(true)
  })
})

describe("validateQuestionPayload", () => {
  it("rejects content that violates the prompt policy", () => {
    const badDoc = { type: "doc" as const, content: [{ type: "video" }] }
    const issues = validateQuestionPayload("manual", badDoc, [])

    expect(issues.some((issue) => issue.message.includes("video"))).toBe(true)
  })

  it("rejects an option that violates the answer policy", () => {
    const badOption = option({ type: "doc" as const, content: [{ type: "heading", attrs: { level: 1 } }] })
    const issues = validateQuestionPayload("single", DOC, [badOption, option(undefined, { isCorrect: true })])

    expect(issues.some((issue) => issue.path.startsWith("options[0]."))).toBe(true)
  })
})

describe("extractQuestionSearchText", () => {
  it("joins prompt and option text", () => {
    const text = extractQuestionSearchText(DOC, [option(), option()])

    expect(text).toBe("teks teks teks")
  })
})
