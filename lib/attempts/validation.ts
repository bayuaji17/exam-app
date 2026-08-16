import { z } from "zod"

import type { QuestionType } from "@/lib/question-banks/question-validation"

/**
 * The answer payload for single-choice and score-based questions: the id of
 * the chosen option, or null when the participant cleared their choice.
 */
export const optionAnswerSchema = z.object({
  chosenOptionId: z.string().nullable(),
})

/**
 * The answer payload for manual-graded questions: plain text. Rich text and
 * media stay out of scope (ADR-0007); grading arrives in a later slice.
 */
export const textAnswerSchema = z.object({
  text: z
    .string()
    .trim()
    .max(4000, "Jawaban maksimal 4000 karakter."),
})

export type OptionAnswer = z.infer<typeof optionAnswerSchema>
export type TextAnswer = z.infer<typeof textAnswerSchema>
export type AttemptAnswerPayload = OptionAnswer | TextAnswer

/**
 * Parse and validate an answer against the question type. Returns the
 * validated payload or an error message.
 */
export function parseAnswer(
  type: QuestionType,
  value: unknown
): { ok: true; data: AttemptAnswerPayload } | { ok: false; message: string } {
  const schema = type === "manual" ? textAnswerSchema : optionAnswerSchema
  const parsed = schema.safeParse(value)

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Jawaban tidak valid." }
  }

  return { ok: true, data: parsed.data }
}
