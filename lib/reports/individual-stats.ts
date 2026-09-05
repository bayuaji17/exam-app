import type {
  CategoryCompetency,
  ItemizedQuestionResult,
} from "./individual-types"

function round2(val: number): number {
  return Math.round(val * 100) / 100
}

function round1(val: number): number {
  return Math.round(val * 10) / 10
}

/**
 * Calculates duration in minutes from start to submission.
 */
export function calculateAttemptDurationMinutes(
  startedAt: Date,
  submittedAt: Date | null
): number | null {
  if (!submittedAt) {
    return null
  }
  const diffMs = submittedAt.getTime() - startedAt.getTime()
  if (diffMs <= 0) return 0
  return Math.round(diffMs / (1000 * 60))
}

/**
 * Groups question results by category and computes mastery statistics per category.
 */
export function calculateCompetencyBreakdown(
  questions: ItemizedQuestionResult[]
): CategoryCompetency[] {
  if (questions.length === 0) {
    return []
  }

  const categoryMap = new Map<
    string,
    {
      categoryId: string
      categoryName: string
      earnedPoints: number
      maxPoints: number
      totalQuestions: number
      correctQuestions: number
    }
  >()

  for (const q of questions) {
    const catId = q.categoryId || "general"
    const catName = q.categoryName && q.categoryName.trim().length > 0
      ? q.categoryName
      : "Umum / Tanpa Kategori"

    const existing = categoryMap.get(catId) ?? {
      categoryId: catId,
      categoryName: catName,
      earnedPoints: 0,
      maxPoints: 0,
      totalQuestions: 0,
      correctQuestions: 0,
    }

    const pointsAwarded = q.pointsAwarded ?? 0
    existing.earnedPoints += pointsAwarded
    existing.maxPoints += q.maxPoints
    existing.totalQuestions += 1

    const isFullyCorrect =
      q.isCorrect === true ||
      (q.type === "manual" && q.maxPoints > 0 && pointsAwarded === q.maxPoints)

    if (isFullyCorrect) {
      existing.correctQuestions += 1
    }

    categoryMap.set(catId, existing)
  }

  const result: CategoryCompetency[] = []

  for (const item of categoryMap.values()) {
    const percentage =
      item.maxPoints > 0
        ? round1((item.earnedPoints / item.maxPoints) * 100)
        : 0

    result.push({
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      earnedPoints: round2(item.earnedPoints),
      maxPoints: round2(item.maxPoints),
      percentage,
      totalQuestions: item.totalQuestions,
      correctQuestions: item.correctQuestions,
    })
  }

  return result.sort((a, b) => a.categoryName.localeCompare(b.categoryName))
}
