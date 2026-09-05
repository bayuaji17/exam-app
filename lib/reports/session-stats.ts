import type {
  SessionAttendanceRow,
  SessionGroupBreakdown,
  SessionKPIStats,
} from "./session-types"

function roundToOneDecimal(num: number): number {
  return Math.round(num * 10) / 10
}

/**
 * Computes high-level KPI attendance metrics from session roster rows.
 */
export function calculateSessionKPIs(
  rows: SessionAttendanceRow[]
): SessionKPIStats {
  const eligibleCount = rows.length

  let presentCount = 0
  let completedCount = 0
  let inProgressCount = 0
  let absentCount = 0
  let manualSubmitCount = 0
  let autoSubmitCount = 0

  for (const row of rows) {
    if (row.status === "completed") {
      presentCount++
      completedCount++
      if (row.submissionType === "participant") {
        manualSubmitCount++
      } else if (row.submissionType === "system") {
        autoSubmitCount++
      }
    } else if (row.status === "in_progress") {
      presentCount++
      inProgressCount++
    } else if (row.status === "absent") {
      absentCount++
    }
  }

  const attendanceRate =
    eligibleCount > 0
      ? roundToOneDecimal((presentCount / eligibleCount) * 100)
      : 0

  const completionRate =
    presentCount > 0
      ? roundToOneDecimal((completedCount / presentCount) * 100)
      : 0

  return {
    eligibleCount,
    presentCount,
    completedCount,
    inProgressCount,
    absentCount,
    attendanceRate,
    completionRate,
    manualSubmitCount,
    autoSubmitCount,
  }
}

/**
 * Computes breakdown metrics grouped by student group/class.
 */
export function calculateGroupBreakdowns(
  rows: SessionAttendanceRow[]
): SessionGroupBreakdown[] {
  const map = new Map<
    string,
    {
      groupName: string
      eligibleCount: number
      presentCount: number
      completedCount: number
      scores: number[]
      passingCount: number
      gradedCount: number
    }
  >()

  for (const row of rows) {
    const gName = row.groupName?.trim() || "Tanpa Grup"
    let entry = map.get(gName)
    if (!entry) {
      entry = {
        groupName: gName,
        eligibleCount: 0,
        presentCount: 0,
        completedCount: 0,
        scores: [],
        passingCount: 0,
        gradedCount: 0,
      }
      map.set(gName, entry)
    }

    entry.eligibleCount++

    if (row.status === "completed" || row.status === "in_progress") {
      entry.presentCount++
    }
    if (row.status === "completed") {
      entry.completedCount++
    }

    if (row.score !== null) {
      entry.scores.push(row.score)
    }

    if (row.passing !== null) {
      entry.gradedCount++
      if (row.passing) {
        entry.passingCount++
      }
    }
  }

  const result: SessionGroupBreakdown[] = []

  for (const entry of map.values()) {
    const attendanceRate =
      entry.eligibleCount > 0
        ? roundToOneDecimal((entry.presentCount / entry.eligibleCount) * 100)
        : 0

    const averageScore =
      entry.scores.length > 0
        ? roundToOneDecimal(
            entry.scores.reduce((acc, val) => acc + val, 0) /
              entry.scores.length
          )
        : null

    const passRate =
      entry.gradedCount > 0
        ? roundToOneDecimal((entry.passingCount / entry.gradedCount) * 100)
        : null

    result.push({
      groupName: entry.groupName,
      eligibleCount: entry.eligibleCount,
      presentCount: entry.presentCount,
      completedCount: entry.completedCount,
      attendanceRate,
      averageScore,
      passRate,
    })
  }

  // Sort alphabetically by group name
  return result.sort((a, b) => a.groupName.localeCompare(b.groupName))
}
