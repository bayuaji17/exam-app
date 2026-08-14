import { z } from "zod"

import {
  ANSWER_POLICY,
  PROMPT_POLICY,
  extractPlainText,
  validateContent,
  type TipTapDoc,
} from "@/lib/content-policy"

export const QUESTION_TYPES = ["single", "scored", "manual"] as const

export type QuestionType = (typeof QUESTION_TYPES)[number]

export const questionTypeSchema = z.enum(QUESTION_TYPES)

export interface QuestionOptionInput {
  content: TipTapDoc
  isCorrect?: boolean
  score?: number | string
}

export interface QuestionPayload {
  bankId: string
  type: QuestionType
  content: TipTapDoc
  categoryId?: string | null
  options: QuestionOptionInput[]
}

export interface QuestionEditPayload {
  content: TipTapDoc
  categoryId?: string | null
  options: QuestionOptionInput[]
}

export interface QuestionInvariantIssue {
  path: string
  message: string
}

/**
 * Per-type invariants (Q8, ticket 03 acceptance):
 * - single: at least two options, exactly one marked correct
 * - scored: at least two options, every option carries a numeric score
 * - manual: no options
 */
export function validateQuestionInvariants(
  type: QuestionType,
  options: QuestionOptionInput[]
): QuestionInvariantIssue[] {
  const issues: QuestionInvariantIssue[] = []

  if (type === "manual") {
    if (options.length > 0) {
      issues.push({ path: "options", message: "Soal manual tidak boleh memiliki opsi jawaban." })
    }

    return issues
  }

  if (options.length < 2) {
    issues.push({ path: "options", message: "Minimal dua opsi jawaban." })
  }

  if (type === "single") {
    const correct = options.filter((option) => option.isCorrect === true).length

    if (correct !== 1) {
      issues.push({
        path: "options",
        message: "Tandai tepat satu opsi sebagai jawaban benar.",
      })
    }
  }

  if (type === "scored") {
    for (let index = 0; index < options.length; index += 1) {
      const score = options[index]?.score

      if (typeof score !== "number" || !Number.isFinite(score)) {
        issues.push({
          path: `options[${index}].score`,
          message: "Setiap opsi harus memiliki skor berupa angka.",
        })
      }
    }
  }

  return issues
}

/**
 * Validate a whole question payload: content policy for the prompt and every
 * option, then the type invariants. Returns the first policy issue or the
 * invariant issues.
 */
export function validateQuestionPayload(
  type: QuestionType,
  content: TipTapDoc,
  options: QuestionOptionInput[]
): QuestionInvariantIssue[] {
  const promptIssues = validateContent(PROMPT_POLICY, content).issues

  if (promptIssues.length > 0) {
    return promptIssues
  }

  for (let index = 0; index < options.length; index += 1) {
    const optionIssues = validateContent(ANSWER_POLICY, options[index]?.content ?? { type: "doc" }).issues

    if (optionIssues.length > 0) {
      return optionIssues.map((issue) => ({ ...issue, path: `options[${index}].${issue.path}` }))
    }
  }

  return validateQuestionInvariants(type, options)
}

export function extractQuestionSearchText(
  content: TipTapDoc,
  options: QuestionOptionInput[]
): string {
  const parts = [extractPlainText(content)]

  for (const option of options) {
    parts.push(extractPlainText(option.content))
  }

  return parts.join(" ").replace(/\s+/g, " ").trim()
}

const optionInputSchema = z
  .object({
    content: z.unknown(),
    isCorrect: z.boolean().optional(),
    score: z.number().finite().optional(),
  })
  .passthrough()

/**
 * Shape-only check for the action payload; semantic validation happens in
 * validateQuestionPayload.
 */
export const questionPayloadSchema = z.object({
  bankId: z.string().min(1),
  type: questionTypeSchema,
  content: z.unknown(),
  categoryId: z.string().min(1).nullable().optional(),
  options: z.array(optionInputSchema).default([]),
})

export const questionEditPayloadSchema = z.object({
  content: z.unknown(),
  categoryId: z.string().min(1).nullable().optional(),
  options: z.array(optionInputSchema).default([]),
})
