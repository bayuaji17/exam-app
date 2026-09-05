import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import {
  attempt,
  attemptAnswer,
  examPackage,
  examQuestion,
  examSchedule,
  question,
  user,
} from "@/lib/db/schema"
import { eligibleParticipantConditions } from "@/lib/eligibility/queries"
import { computeScheduleStatistics } from "./stats"
import type {
  RawAttemptScoreInput,
  ReportScheduleHubItem,
  ScheduleReportParticipantItem,
  ScheduleReportSummary,
} from "./types"

/**
 * Manual-question counts per attempt, derived from order snapshot.
 */
async function manualQuestionCountsByAttempt(
  attempts: Array<{ id: string; questionOrder: string[] }>
): Promise<Map<string, number>> {
  const allQuestionIds = [
    ...new Set(attempts.flatMap((entry) => entry.questionOrder)),
  ]

  if (allQuestionIds.length === 0) {
    return new Map()
  }

  const rows = await db
    .select({ id: question.id })
    .from(question)
    .where(
      and(inArray(question.id, allQuestionIds), eq(question.type, "manual"))
    )

  const manualIds = new Set(rows.map((row) => row.id))
  const counts = new Map<string, number>()

  for (const entry of attempts) {
    counts.set(
      entry.id,
      entry.questionOrder.filter((questionId) => manualIds.has(questionId))
        .length
    )
  }

  return counts
}

/**
 * Count of graded manual answers per attempt (manualScore is not null).
 */
async function gradedManualCountsByAttempt(
  attemptIds: string[]
): Promise<Map<string, number>> {
  if (attemptIds.length === 0) {
    return new Map()
  }

  const rows = await db
    .select({
      attemptId: attemptAnswer.attemptId,
      count: sql<number>`count(*)::int`,
    })
    .from(attemptAnswer)
    .where(
      and(
        inArray(attemptAnswer.attemptId, attemptIds),
        sql`${attemptAnswer.manualScore} is not null`
      )
    )
    .groupBy(attemptAnswer.attemptId)

  const map = new Map<string, number>()
  for (const row of rows) {
    map.set(row.attemptId, row.count)
  }
  return map
}

/**
 * Fetches comprehensive analytical report data for a specific schedule.
 */
export async function getScheduleReportData(
  scheduleSlugOrId: string
): Promise<ScheduleReportSummary | null> {
  const [scheduleRow] = await db
    .select({
      id: examSchedule.id,
      name: examSchedule.name,
      slug: examSchedule.slug,
      packageId: examSchedule.packageId,
      packageName: examPackage.name,
      passScore: examPackage.passScore,
    })
    .from(examSchedule)
    .innerJoin(examPackage, eq(examSchedule.packageId, examPackage.id))
    .where(
      or(
        eq(examSchedule.slug, scheduleSlugOrId),
        eq(examSchedule.id, scheduleSlugOrId)
      )
    )
    .limit(1)

  if (!scheduleRow) {
    return null
  }

  const passScore =
    scheduleRow.passScore !== null && scheduleRow.passScore !== undefined
      ? Number(scheduleRow.passScore)
      : null

  // 1. Calculate total available package points
  const questionScores = await db
    .select({
      score: examQuestion.score,
    })
    .from(examQuestion)
    .where(eq(examQuestion.examId, scheduleRow.packageId))

  const totalPoints = questionScores.reduce(
    (sum, q) => sum + (q.score !== null ? Number(q.score) : 1),
    0
  )

  // 2. Count eligible participants
  const [eligibleRow] = await db
    .select({ count: sql<number>`count(distinct ${user.id})::int` })
    .from(user)
    .where(and(...eligibleParticipantConditions(scheduleRow.id)))

  const totalEligible = eligibleRow?.count ?? 0

  // 3. Fetch all attempts for this schedule
  const attemptRows = await db
    .select({
      attemptId: attempt.id,
      participantId: attempt.participantId,
      participantName: user.name,
      participantEmail: user.email,
      nisn: user.nisn,
      nis: user.nis,
      nip: user.nip,
      submittedAt: attempt.submittedAt,
      score: attempt.score,
      questionOrder: attempt.questionOrder,
    })
    .from(attempt)
    .innerJoin(user, eq(attempt.participantId, user.id))
    .where(eq(attempt.scheduleId, scheduleRow.id))
    .orderBy(desc(attempt.submittedAt), asc(user.name))

  const orderRows = attemptRows.map((row) => ({
    id: row.attemptId,
    questionOrder: (row.questionOrder as string[]) || [],
  }))

  const [manualCounts, gradedCounts] = await Promise.all([
    manualQuestionCountsByAttempt(orderRows),
    gradedManualCountsByAttempt(attemptRows.map((r) => r.attemptId)),
  ])

  // 4. Map participants and prepare raw inputs for statistical calculations
  const rawAttempts: RawAttemptScoreInput[] = []
  const participants: ScheduleReportParticipantItem[] = []

  for (const row of attemptRows) {
    const manualCount = manualCounts.get(row.attemptId) ?? 0
    const gradedCount = gradedCounts.get(row.attemptId) ?? 0
    const fullyGraded = manualCount === 0 || gradedCount >= manualCount
    const numScore = row.score !== null ? Number(row.score) : null

    rawAttempts.push({
      attemptId: row.attemptId,
      score: numScore,
      submittedAt: row.submittedAt,
      fullyGraded,
    })

    const passing =
      fullyGraded && numScore !== null && passScore !== null
        ? numScore >= passScore
        : null

    participants.push({
      attemptId: row.attemptId,
      participantId: row.participantId,
      participantName: row.participantName,
      participantEmail: row.participantEmail,
      identifierNisn: row.nisn !== null ? String(row.nisn) : null,
      identifierNis: row.nis,
      identifierNip: row.nip,
      submittedAt: row.submittedAt,
      score: numScore,
      fullyGraded,
      passing,
    })
  }

  const stats = computeScheduleStatistics({
    totalEligible,
    attempts: rawAttempts,
    passScore,
  })

  return {
    scheduleId: scheduleRow.id,
    scheduleTitle: scheduleRow.name,
    scheduleSlug: scheduleRow.slug,
    packageTitle: scheduleRow.packageName,
    passScore,
    totalPoints,
    stats,
    participants,
  }
}

/**
 * Lists schedules with summary metrics for the reports hub overview.
 */
export async function listReportSchedules(params?: {
  search?: string
}): Promise<ReportScheduleHubItem[]> {
  const conditions = []
  if (params?.search) {
    const pattern = `%${params.search}%`
    conditions.push(
      or(
        sql`${examSchedule.name} ilike ${pattern}`,
        sql`${examPackage.name} ilike ${pattern}`
      )!
    )
  }

  const schedules = await db
    .select({
      id: examSchedule.id,
      name: examSchedule.name,
      slug: examSchedule.slug,
      packageName: examPackage.name,
      passScore: examPackage.passScore,
    })
    .from(examSchedule)
    .innerJoin(examPackage, eq(examSchedule.packageId, examPackage.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(examSchedule.startsAt))

  if (schedules.length === 0) {
    return []
  }

  const scheduleIds = schedules.map((s) => s.id)

  const attemptRows = await db
    .select({
      id: attempt.id,
      scheduleId: attempt.scheduleId,
      submittedAt: attempt.submittedAt,
      score: attempt.score,
      questionOrder: attempt.questionOrder,
    })
    .from(attempt)
    .where(inArray(attempt.scheduleId, scheduleIds))

  const orderRows = attemptRows.map((row) => ({
    id: row.id,
    questionOrder: (row.questionOrder as string[]) || [],
  }))

  const [manualCounts, gradedCounts] = await Promise.all([
    manualQuestionCountsByAttempt(orderRows),
    gradedManualCountsByAttempt(attemptRows.map((r) => r.id)),
  ])

  // Group attempts by schedule
  const attemptsBySchedule = new Map<string, typeof attemptRows>()
  for (const row of attemptRows) {
    const existing = attemptsBySchedule.get(row.scheduleId) || []
    existing.push(row)
    attemptsBySchedule.set(row.scheduleId, existing)
  }

  return schedules.map((schedule) => {
    const schedAttempts = attemptsBySchedule.get(schedule.id) || []
    const totalAttempts = schedAttempts.length
    const submitted = schedAttempts.filter((a) => a.submittedAt !== null)
    const submittedAttempts = submitted.length

    const fullyGradedAttempts = submitted.filter((a) => {
      const mCount = manualCounts.get(a.id) ?? 0
      const gCount = gradedCounts.get(a.id) ?? 0
      return mCount === 0 || gCount >= mCount
    })

    const validScores = fullyGradedAttempts
      .map((a) => (a.score !== null ? Number(a.score) : null))
      .filter((s): s is number => s !== null)

    const passScore =
      schedule.passScore !== null && schedule.passScore !== undefined
        ? Number(schedule.passScore)
        : null

    const averageScore =
      validScores.length > 0
        ? Math.round(
            (validScores.reduce((sum, s) => sum + s, 0) / validScores.length) *
              100
          ) / 100
        : 0

    const passingCount =
      passScore !== null
        ? validScores.filter((s) => s >= passScore).length
        : 0

    const passingRate =
      validScores.length > 0
        ? Math.round((passingCount / validScores.length) * 10000) / 100
        : 0

    return {
      scheduleId: schedule.id,
      scheduleTitle: schedule.name,
      scheduleSlug: schedule.slug,
      packageTitle: schedule.packageName,
      totalAttempts,
      submittedAttempts,
      fullyGradedAttempts: fullyGradedAttempts.length,
      averageScore,
      passingRate,
    }
  })
}
