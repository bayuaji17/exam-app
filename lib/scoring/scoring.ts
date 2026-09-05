import type { QuestionType } from "@/lib/question-banks/question-validation"

/**
 * The scoring module (Aturan Penilaian, v0.6.0). Pure and unit-tested;
 * consumed by the results slice (S5). Semantics (ADR-0001 + locked slice
 * decisions):
 *
 * - single:  correct -> points (default 1, equal points); wrong -> -wrongPenalty
 *            (default 0); unanswered -> 0, no penalty.
 * - scored:  chosen option's score * points (points is a multiplier, default 1);
 *            no penalty (no right/wrong).
 * - manual:  no auto score (null); points is the grading weight for S5.
 * - Package score: sum, rounded to 2 decimals; isPassing compares against
 *   passScore (null -> no threshold).
 */

export interface SingleQuestionAnswer {
  /** The id of the option the participant chose, or null when unanswered. */
  chosenOptionId: string | null
}

export interface ScoredQuestionAnswer {
  chosenOptionId: string | null
}

export type QuestionAnswer = SingleQuestionAnswer | ScoredQuestionAnswer

export interface QuestionScoringInput {
  type: QuestionType
  /** Per-question points override (exam_question.score); null = default. */
  points: number | null
  /** The single question's correct option id. */
  correctOptionId?: string | null
  /** The scored question's options with their scores. */
  options?: Array<{ id: string; score: number | null }>
}

export interface ScoringConfig {
  /** Package-level wrong-answer penalty; null = 0. */
  wrongPenalty: number | null
}

export const DEFAULT_POINTS = 1
export const DEFAULT_PENALTY = 0
export const DEFAULT_MULTIPLIER = 1

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * The auto score for one question, or null when the type is manual.
 */
export function computeAutoScore(
  type: QuestionType,
  answer: QuestionAnswer | null,
  question: QuestionScoringInput,
  config: ScoringConfig
): number | null {
  if (type === "manual") {
    return null
  }

  if (type === "single") {
    const points = question.points ?? DEFAULT_POINTS
    const chosen =
      (answer as SingleQuestionAnswer | null)?.chosenOptionId ?? null

    if (chosen === null) {
      return 0
    }

    if (chosen === question.correctOptionId) {
      return round2(points)
    }

    const penalty = config.wrongPenalty ?? DEFAULT_PENALTY

    return round2(-penalty)
  }

  // scored
  const multiplier = question.points ?? DEFAULT_MULTIPLIER
  const chosen = (answer as ScoredQuestionAnswer | null)?.chosenOptionId ?? null

  if (chosen === null) {
    return 0
  }

  const option = (question.options ?? []).find(
    (candidate) => candidate.id === chosen
  )

  if (!option) {
    return 0
  }

  return round2((option.score ?? 0) * multiplier)
}

export interface PackageQuestionResult {
  questionId: string
  type: QuestionType
  answer: QuestionAnswer | null
  question: QuestionScoringInput
}

/**
 * The package score: the sum of every auto-scored question's result plus
 * the provided manual-graded scores, rounded to 2 decimals. An empty
 * package scores 0.
 */
export function computePackageScore(
  results: PackageQuestionResult[],
  config: ScoringConfig,
  manualScores: Array<{ questionId: string; score: number }> = []
): number {
  let total = 0

  for (const result of results) {
    const auto = computeAutoScore(
      result.type,
      result.answer,
      result.question,
      config
    )

    if (auto !== null) {
      total += auto
      continue
    }

    const manual = manualScores.find(
      (entry) => entry.questionId === result.questionId
    )

    if (manual) {
      total += manual.score
    }
  }

  return round2(total)
}

/**
 * Whether a score meets the pass threshold. A null passScore means no
 * threshold — the package never fails on its own.
 */
export function isPassing(score: number, passScore: number | null): boolean {
  if (passScore === null) {
    return true
  }

  return score >= passScore
}
