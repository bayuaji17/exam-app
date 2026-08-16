import { and, asc, desc, eq, inArray, isNotNull, or, sql } from "drizzle-orm"
import type { AnyColumn } from "drizzle-orm/column"

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
import { listAttemptQuestions } from "@/lib/attempts/queries"
import type { SortColumn, TableParams } from "./table-params"

/**
 * Manual-question counts per attempt, from the order snapshots: one query
 * over all involved questions' types, intersected with each attempt's order.
 */
async function manualQuestionCountsByAttempt(
  attempts: Array<{ id: string; questionOrder: string[] }>
): Promise<Map<string, number>> {
  const allQuestionIds = [...new Set(attempts.flatMap((entry) => entry.questionOrder))]

  if (allQuestionIds.length === 0) {
    return new Map()
  }

  const rows = await db
    .select({ id: question.id })
    .from(question)
    .where(and(inArray(question.id, allQuestionIds), eq(question.type, "manual")))

  const manualIds = new Set(rows.map((row) => row.id))
  const counts = new Map<string, number>()

  for (const entry of attempts) {
    counts.set(
      entry.id,
      entry.questionOrder.filter((questionId) => manualIds.has(questionId)).length
    )
  }

  return counts
}

/**
 * Graded-manual-answer counts per attempt (manualScore is not null).
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
        isNotNull(attemptAnswer.manualScore)
      )
    )
    .groupBy(attemptAnswer.attemptId)

  return new Map(rows.map((row) => [row.attemptId, row.count]))
}

/**
 * Whether an attempt is fully graded: every manual question has a grade.
 * Attempts without manual questions are trivially complete.
 */
function isFullyGraded(manualCount: number, gradedCount: number): boolean {
  return manualCount === 0 || gradedCount >= manualCount
}

export interface UngradedAttemptItem {
  attemptId: string
  scheduleId: string
  scheduleName: string
  participantId: string
  participantName: string
  participantEmail: string
  submittedAt: Date
  pendingCount: number
}

export interface UngradedAttemptsPage {
  items: UngradedAttemptItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const SORT_COLUMNS: Record<SortColumn, AnyColumn> = {
  submittedAt: attempt.submittedAt,
  name: user.name,
  score: attempt.score,
}

function submittedFilters(params: TableParams): ReturnType<typeof or>[] {
  const filters = []

  if (params.q) {
    const pattern = `%${params.q}%`
    filters.push(
      or(
        sql`${user.name} ilike ${pattern}`,
        sql`${user.email} ilike ${pattern}`,
        sql`${examSchedule.name} ilike ${pattern}`
      )!
    )
  }

  return filters
}

/**
 * One page of submitted attempts that still have ungraded manual questions.
 */
export async function listUngradedAttemptsPage(
  params: TableParams
): Promise<UngradedAttemptsPage> {
  const filters = submittedFilters(params)
  const submitted = sql`${attempt.submittedAt} is not null`

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(attempt)
    .innerJoin(examSchedule, eq(attempt.scheduleId, examSchedule.id))
    .innerJoin(user, eq(attempt.participantId, user.id))
    .where(and(submitted, ...filters))

  const totalPages = Math.max(1, Math.ceil(count / params.size))
  const page = Math.min(params.page, totalPages)
  const column = SORT_COLUMNS[params.sort]
  const order = params.order === "asc" ? asc : desc

  const rows = await db
    .select({
      attemptId: attempt.id,
      scheduleId: attempt.scheduleId,
      scheduleName: examSchedule.name,
      participantId: attempt.participantId,
      participantName: user.name,
      participantEmail: user.email,
      submittedAt: attempt.submittedAt,
      questionOrder: attempt.questionOrder,
    })
    .from(attempt)
    .innerJoin(examSchedule, eq(attempt.scheduleId, examSchedule.id))
    .innerJoin(user, eq(attempt.participantId, user.id))
    .where(and(submitted, ...filters))
    .orderBy(order(column), desc(attempt.id))
    .limit(params.size)
    .offset((page - 1) * params.size)

  const orderRows = rows.map((row) => ({
    id: row.attemptId,
    questionOrder: row.questionOrder as string[],
  }))
  const manualCounts = await manualQuestionCountsByAttempt(orderRows)
  const gradedCounts = await gradedManualCountsByAttempt(rows.map((row) => row.attemptId))

  const items = rows
    .filter(
      (row) =>
        !isFullyGraded(
          manualCounts.get(row.attemptId) ?? 0,
          gradedCounts.get(row.attemptId) ?? 0
        )
    )
    .map((row) => ({
      attemptId: row.attemptId,
      scheduleId: row.scheduleId,
      scheduleName: row.scheduleName,
      participantId: row.participantId,
      participantName: row.participantName,
      participantEmail: row.participantEmail,
      submittedAt: row.submittedAt,
      pendingCount:
        (manualCounts.get(row.attemptId) ?? 0) - (gradedCounts.get(row.attemptId) ?? 0),
    }))

  return { items: items as UngradedAttemptItem[], total: count, page, pageSize: params.size, totalPages }
}

export interface ScheduleResultItem {
  attemptId: string
  participantId: string
  participantName: string
  participantEmail: string
  submittedAt: Date
  score: string | null
  fullyGraded: boolean
  passing: boolean | null
}

export interface ScheduleResultsPage {
  items: ScheduleResultItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * One page of a schedule's submitted attempts, with grading status and
 * pass/fail (null until fully graded or when no pass score is set).
 */
export async function listScheduleResultsPage(
  scheduleId: string,
  params: TableParams
): Promise<ScheduleResultsPage> {
  const [passScoreRow, countRow] = await Promise.all([
    db
      .select({ passScore: examPackage.passScore })
      .from(examSchedule)
      .innerJoin(examPackage, eq(examSchedule.packageId, examPackage.id))
      .where(eq(examSchedule.id, scheduleId))
      .limit(1),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(attempt)
      .where(
        and(eq(attempt.scheduleId, scheduleId), sql`${attempt.submittedAt} is not null`)
      ),
  ])

  const passScore =
    passScoreRow[0]?.passScore !== null && passScoreRow[0]?.passScore !== undefined
      ? Number(passScoreRow[0].passScore)
      : null
  const total = countRow[0]?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / params.size))
  const page = Math.min(params.page, totalPages)
  const column = SORT_COLUMNS[params.sort]
  const order = params.order === "asc" ? asc : desc

  const rows = await db
    .select({
      attemptId: attempt.id,
      participantId: attempt.participantId,
      participantName: user.name,
      participantEmail: user.email,
      submittedAt: attempt.submittedAt,
      score: attempt.score,
      questionOrder: attempt.questionOrder,
    })
    .from(attempt)
    .innerJoin(user, eq(attempt.participantId, user.id))
    .where(
      and(eq(attempt.scheduleId, scheduleId), sql`${attempt.submittedAt} is not null`)
    )
    .orderBy(order(column), desc(attempt.id))
    .limit(params.size)
    .offset((page - 1) * params.size)

  const orderRows = rows.map((row) => ({
    id: row.attemptId,
    questionOrder: row.questionOrder as string[],
  }))
  const manualCounts = await manualQuestionCountsByAttempt(orderRows)
  const gradedCounts = await gradedManualCountsByAttempt(rows.map((row) => row.attemptId))

  const items = rows.map((row) => {
    const fullyGraded = isFullyGraded(
      manualCounts.get(row.attemptId) ?? 0,
      gradedCounts.get(row.attemptId) ?? 0
    )
    const score = row.score !== null ? Number(row.score) : null

    return {
      attemptId: row.attemptId,
      participantId: row.participantId,
      participantName: row.participantName,
      participantEmail: row.participantEmail,
      submittedAt: row.submittedAt,
      score: row.score,
      fullyGraded,
      passing:
        fullyGraded && score !== null && passScore !== null ? score >= passScore : null,
    }
  })

  return { items: items as ScheduleResultItem[], total, page, pageSize: params.size, totalPages }
}

export interface ResultsHubItem {
  scheduleId: string
  scheduleName: string
  submittedCount: number
  pendingCount: number
  averageScore: number | null
  passRate: number | null
}

/**
 * The results hub: every schedule with submitted attempts, with averages and
 * pass rates computed over fully-graded attempts only.
 */
export async function listResultsHubs(): Promise<ResultsHubItem[]> {
  const schedules = await db
    .select({
      scheduleId: examSchedule.id,
      scheduleName: examSchedule.name,
      packageId: examSchedule.packageId,
    })
    .from(examSchedule)
    .innerJoin(
      attempt,
      and(eq(attempt.scheduleId, examSchedule.id), sql`${attempt.submittedAt} is not null`)
    )
    .groupBy(examSchedule.id, examSchedule.name, examSchedule.packageId)
    .orderBy(desc(examSchedule.startsAt))

  if (schedules.length === 0) {
    return []
  }

  const scheduleIds = schedules.map((schedule) => schedule.scheduleId)

  const [attemptRows, packageRows] = await Promise.all([
    db
      .select({
        scheduleId: attempt.scheduleId,
        attemptId: attempt.id,
        score: attempt.score,
        questionOrder: attempt.questionOrder,
      })
      .from(attempt)
      .where(
        and(inArray(attempt.scheduleId, scheduleIds), sql`${attempt.submittedAt} is not null`)
      ),
    db
      .select({
        packageId: examPackage.id,
        passScore: examPackage.passScore,
      })
      .from(examPackage)
      .where(
        inArray(
          examPackage.id,
          schedules.map((schedule) => schedule.packageId)
        )
      ),
  ])

  const passScoreByPackage = new Map<string, number | null>(
    packageRows.map((row) => [
      row.packageId,
      row.passScore !== null ? Number(row.passScore) : null,
    ])
  )

  const orderRows = attemptRows.map((row) => ({
    id: row.attemptId,
    questionOrder: row.questionOrder as string[],
  }))
  const manualCounts = await manualQuestionCountsByAttempt(orderRows)
  const gradedCounts = await gradedManualCountsByAttempt(
    attemptRows.map((row) => row.attemptId)
  )

  const bySchedule = new Map<
    string,
    { submitted: number; pending: number; scores: number[]; passing: number }
  >()

  for (const row of attemptRows) {
    const entry = bySchedule.get(row.scheduleId) ?? {
      submitted: 0,
      pending: 0,
      scores: [],
      passing: 0,
    }

    entry.submitted += 1

    if (
      !isFullyGraded(
        manualCounts.get(row.attemptId) ?? 0,
        gradedCounts.get(row.attemptId) ?? 0
      )
    ) {
      entry.pending += 1
      bySchedule.set(row.scheduleId, entry)
      continue
    }

    if (row.score === null) {
      bySchedule.set(row.scheduleId, entry)
      continue
    }

    const score = Number(row.score)
    entry.scores.push(score)

    const schedule = schedules.find((candidate) => candidate.scheduleId === row.scheduleId)
    const passScore = schedule ? passScoreByPackage.get(schedule.packageId) ?? null : null

    if (passScore !== null && score >= passScore) {
      entry.passing += 1
    }

    bySchedule.set(row.scheduleId, entry)
  }

  return schedules.map((schedule) => {
    const entry = bySchedule.get(schedule.scheduleId) ?? {
      submitted: 0,
      pending: 0,
      scores: [],
      passing: 0,
    }
    const average =
      entry.scores.length > 0
        ? entry.scores.reduce((sum, value) => sum + value, 0) / entry.scores.length
        : null
    const passScore = passScoreByPackage.get(schedule.packageId) ?? null
    const passRate =
      passScore !== null && entry.scores.length > 0
        ? Math.round((entry.passing / entry.scores.length) * 1000) / 10
        : null

    return {
      scheduleId: schedule.scheduleId,
      scheduleName: schedule.scheduleName,
      submittedCount: entry.submitted,
      pendingCount: entry.pending,
      averageScore: average !== null ? Math.round(average * 100) / 100 : null,
      passRate,
    }
  })
}

export interface GradingQuestion {
  questionId: string
  type: string
  content: Record<string, unknown>
  options: Array<{
    id: string
    content: Record<string, unknown>
    isCorrect: boolean | null
    score: string | null
  }>
  weight: number
}

export interface AttemptForGrading {
  attemptId: string
  scheduleId: string
  scheduleName: string
  participantName: string
  participantEmail: string
  submittedAt: Date
  score: string | null
  questions: GradingQuestion[]
  answers: Array<{
    questionId: string
    autoScore: string | null
    manualScore: string | null
    text: string
  }>
}

/**
 * Manual-question weights for a schedule's package: questionId -> points
 * (`exam_question.score` ?? 1).
 */
export async function manualGradeWeights(
  scheduleId: string
): Promise<Map<string, number>> {
  const [scheduleRow] = await db
    .select({ packageId: examSchedule.packageId })
    .from(examSchedule)
    .where(eq(examSchedule.id, scheduleId))
    .limit(1)

  if (!scheduleRow) {
    return new Map()
  }

  const weightRows = await db
    .select({ questionId: examQuestion.questionId, score: examQuestion.score })
    .from(examQuestion)
    .where(eq(examQuestion.examId, scheduleRow.packageId))

  return new Map(
    weightRows.map((row) => [
      row.questionId,
      row.score !== null ? Number(row.score) : 1,
    ])
  )
}

/**
 * Everything the grading workbench needs: the attempt, its questions with
 * weights, and the saved answers with current grades.
 */
export async function getAttemptForGrading(
  attemptId: string
): Promise<AttemptForGrading | null> {
  const [attemptRow] = await db
    .select({
      id: attempt.id,
      scheduleId: attempt.scheduleId,
      scheduleName: examSchedule.name,
      participantName: user.name,
      participantEmail: user.email,
      submittedAt: attempt.submittedAt,
      score: attempt.score,
      questionOrder: attempt.questionOrder,
    })
    .from(attempt)
    .innerJoin(examSchedule, eq(attempt.scheduleId, examSchedule.id))
    .innerJoin(user, eq(attempt.participantId, user.id))
    .where(eq(attempt.id, attemptId))
    .limit(1)

  if (!attemptRow || attemptRow.submittedAt === null) {
    return null
  }

  const questionOrder = attemptRow.questionOrder as unknown as string[]

  const [questions, answers, weights] = await Promise.all([
    listAttemptQuestions(questionOrder),
    db
      .select({
        questionId: attemptAnswer.questionId,
        autoScore: attemptAnswer.autoScore,
        manualScore: attemptAnswer.manualScore,
        answer: attemptAnswer.answer,
      })
      .from(attemptAnswer)
      .where(eq(attemptAnswer.attemptId, attemptId)),
    manualGradeWeights(attemptRow.scheduleId),
  ])

  const answersByQuestion = new Map(answers.map((answer) => [answer.questionId, answer]))

  return {
    attemptId: attemptRow.id,
    scheduleId: attemptRow.scheduleId,
    scheduleName: attemptRow.scheduleName,
    participantName: attemptRow.participantName,
    participantEmail: attemptRow.participantEmail,
    submittedAt: attemptRow.submittedAt,
    score: attemptRow.score,
    questions: questions.map((entry) => ({
      questionId: entry.questionId,
      type: entry.type,
      content: entry.content,
      options: entry.options,
      weight: weights.get(entry.questionId) ?? 1,
    })),
    answers: questions.map((entry) => {
      const saved = answersByQuestion.get(entry.questionId)
      const payload = saved?.answer as { text?: string } | undefined

      return {
        questionId: entry.questionId,
        autoScore: saved?.autoScore ?? null,
        manualScore: saved?.manualScore ?? null,
        text: payload?.text ?? "",
      }
    }),
  }
}
