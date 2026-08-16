/**
 * Pure scoring math for grading, kept free of server-only imports so unit
 * tests can run it directly.
 */

/**
 * The attempt total: the sum of every auto score and every manual score,
 * rounded to 2 decimals — the same rounding the scoring module applies.
 */
export function sumAttemptScores(
  entries: ReadonlyArray<{ autoScore: string | number | null; manualScore: string | number | null }>
): number {
  let total = 0

  for (const entry of entries) {
    if (entry.autoScore !== null) {
      total += Number(entry.autoScore)
    }

    if (entry.manualScore !== null) {
      total += Number(entry.manualScore)
    }
  }

  return Math.round(total * 100) / 100
}
