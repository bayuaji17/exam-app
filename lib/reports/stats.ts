import type {
  RawStatsInput,
  ScheduleStatistics,
  ScoreDistributionBucket,
} from "./types"

/**
 * Calculates arithmetic mean of scores rounded to 2 decimal places.
 */
export function calculateMean(scores: number[]): number {
  if (scores.length === 0) return 0
  const sum = scores.reduce((acc, score) => acc + score, 0)
  return Math.round((sum / scores.length) * 100) / 100
}

/**
 * Calculates median score of scores array.
 */
export function calculateMedian(scores: number[]): number {
  if (scores.length === 0) return 0
  const sorted = [...scores].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)

  if (sorted.length % 2 !== 0) {
    return sorted[mid]!
  }

  const median = (sorted[mid - 1]! + sorted[mid]!) / 2
  return Math.round(median * 100) / 100
}

/**
 * Calculates population standard deviation rounded to 2 decimal places.
 */
export function calculateStandardDeviation(scores: number[]): number {
  if (scores.length <= 1) return 0
  const mean = scores.reduce((acc, score) => acc + score, 0) / scores.length
  const variance =
    scores.reduce((acc, score) => acc + Math.pow(score - mean, 2), 0) /
    scores.length

  return Math.round(Math.sqrt(variance) * 100) / 100
}

/**
 * Evaluates pass/fail counts and percentage rate against inclusive passScore.
 */
export function calculatePassFail(
  scores: number[],
  passScore: number | null
): { pass: number; fail: number; rate: number } {
  if (passScore === null || scores.length === 0) {
    return { pass: 0, fail: 0, rate: 0 }
  }

  const pass = scores.filter((score) => score >= passScore).length
  const fail = scores.length - pass
  const rate = Math.round((pass / scores.length) * 10000) / 100

  return { pass, fail, rate }
}

const DEFAULT_BUCKETS = [
  { range: "0-20", min: 0, max: 20 },
  { range: "21-40", min: 20, max: 40 },
  { range: "41-60", min: 40, max: 60 },
  { range: "61-80", min: 60, max: 80 },
  { range: "81-100", min: 80, max: 100 },
]

/**
 * Distributes numeric scores into standard percentile / point intervals.
 */
export function calculateDistributionBuckets(
  scores: number[]
): ScoreDistributionBucket[] {
  const total = scores.length

  return DEFAULT_BUCKETS.map((b, index) => {
    let count = 0
    if (index === 0) {
      // First bucket includes exact boundary [min, max]
      count = scores.filter((s) => s >= b.min && s <= b.max).length
    } else {
      // Subsequent buckets are (min, max]
      count = scores.filter((s) => s > b.min && s <= b.max).length
    }

    const percentage =
      total > 0 ? Math.round((count / total) * 10000) / 100 : 0

    return {
      range: b.range,
      min: b.min,
      max: b.max,
      count,
      percentage,
    }
  })
}

/**
 * Computes full aggregated schedule statistics from raw attempt inputs.
 * Excludes ungraded manual attempts from score calculations while retaining
 * total submitted counts.
 */
export function computeScheduleStatistics(
  input: RawStatsInput
): ScheduleStatistics {
  const totalAttemptsStarted = input.attempts.length
  const submittedAttempts = input.attempts.filter(
    (att) => att.submittedAt !== null
  )
  const totalAttemptsSubmitted = submittedAttempts.length

  const fullyGradedAttempts = submittedAttempts.filter(
    (att) => att.fullyGraded && att.score !== null
  )
  const totalFullyGraded = fullyGradedAttempts.length

  const validScores = fullyGradedAttempts.map((att) => Number(att.score))

  const passFail = calculatePassFail(validScores, input.passScore)
  const averageScore = calculateMean(validScores)
  const medianScore = calculateMedian(validScores)
  const highestScore =
    validScores.length > 0 ? Math.max(...validScores) : 0
  const lowestScore =
    validScores.length > 0 ? Math.min(...validScores) : 0
  const standardDeviation = calculateStandardDeviation(validScores)
  const distribution = calculateDistributionBuckets(validScores)

  return {
    totalParticipantsEligible: input.totalEligible,
    totalAttemptsStarted,
    totalAttemptsSubmitted,
    totalFullyGraded,
    passingCount: passFail.pass,
    failingCount: passFail.fail,
    passingRate: passFail.rate,
    averageScore,
    medianScore,
    highestScore,
    lowestScore,
    standardDeviation,
    distribution,
  }
}
