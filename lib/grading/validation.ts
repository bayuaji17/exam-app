import { z } from "zod"

import { DEFAULT_POINTS } from "@/lib/scoring/scoring"

/**
 * The weight of a manual question: the per-question points override
 * (`exam_question.score`) for the schedule's package, defaulting to
 * `DEFAULT_POINTS`. This is the maximum manual grade (ADR-0011).
 */
export function manualGradeWeight(
  pointsOverride: number | null | undefined
): number {
  return pointsOverride ?? DEFAULT_POINTS
}

/**
 * Validate a manual grade: a finite number within `0..weight`. Passing null
 * clears an existing grade.
 */
export function parseManualGrade(
  value: unknown,
  weight: number
): { ok: true; score: number | null } | { ok: false; message: string } {
  if (value === null || value === undefined) {
    return { ok: true, score: null }
  }

  const parsed = z.coerce.number().safeParse(value)

  if (!parsed.success || !Number.isFinite(parsed.data)) {
    return { ok: false, message: "Nilai harus berupa angka." }
  }

  const score = Math.round(parsed.data * 100) / 100

  if (score < 0) {
    return { ok: false, message: "Nilai tidak boleh negatif." }
  }

  if (score > weight) {
    return { ok: false, message: `Nilai maksimal ${weight}.` }
  }

  return { ok: true, score }
}
