import { and, asc, desc, eq, inArray, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import {
  attempt,
  attemptAnswer,
  examPackage,
  examQuestion,
  examSchedule,
  question,
  questionOption,
} from "@/lib/db/schema"
import { eligibleScheduleConditionsForUser } from "@/lib/eligibility/queries"
import { scheduleStatus, type ScheduleStatus } from "@/lib/exam-schedules/queries"
import type { QuestionType } from "@/lib/question-banks/question-validation"

export interface AttemptableSchedule {
  scheduleId: string
  scheduleName: string
  packageId: string
  packageName: string
  startsAt: Date
  endsAt: Date
  /** The effective duration: schedule overrides package. Null = no deadline. */
  durationMinutes: number | null
  questionCount: number
  passScore: string | null
  attemptLimit: number | null
  introduction: Record<string, unknown> | null
  status: ScheduleStatus
  openAttemptId: string | null
  openDeadlineAt: Date | null
  submittedCount: number
  lastScore: string | null
}

/**
 * The schedules a participant may take: eligible (v0.7 gate), with the
 * window state and the participant's attempt state merged in.
 */
export async function listAttemptableSchedulesForUser(
  userId: string
): Promise<AttemptableSchedule[]> {
  const rows = await db
    .select({
      scheduleId: examSchedule.id,
      scheduleName: examSchedule.name,
      packageId: examSchedule.packageId,
      packageName: examPackage.name,
      startsAt: examSchedule.startsAt,
      endsAt: examSchedule.endsAt,
      scheduleDuration: examSchedule.durationMinutes,
      packageDuration: examPackage.durationMinutes,
      passScore: examPackage.passScore,
      attemptLimit: examSchedule.attemptLimit,
      introduction: examSchedule.introduction,
    })
    .from(examSchedule)
    .innerJoin(examPackage, eq(examSchedule.packageId, examPackage.id))
    .where(and(...eligibleScheduleConditionsForUser(userId)))
    .orderBy(asc(examSchedule.startsAt), asc(examSchedule.id))

  const [state, questionCounts] = await Promise.all([
    attemptStateBySchedule(userId, rows.map((row) => row.scheduleId)),
    questionCountsFor(rows.map((row) => row.packageId)),
  ])

  const now = new Date()

  return rows.map((row) => {
    const perSchedule = state.get(row.scheduleId)

    return {
      scheduleId: row.scheduleId,
      scheduleName: row.scheduleName,
      packageId: row.packageId,
      packageName: row.packageName,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      durationMinutes: row.scheduleDuration ?? row.packageDuration,
      questionCount: questionCounts.get(row.packageId) ?? 0,
      passScore: row.passScore,
      attemptLimit: row.attemptLimit,
      introduction: row.introduction,
      status: scheduleStatus(row.startsAt, row.endsAt, now),
      openAttemptId: perSchedule?.openAttemptId ?? null,
      openDeadlineAt: perSchedule?.openDeadlineAt ?? null,
      submittedCount: perSchedule?.submittedCount ?? 0,
      lastScore: perSchedule?.lastScore ?? null,
    }
  }) as AttemptableSchedule[]
}

/**
 * Question counts per package, merged into the exam list (correlated
 * subqueries inside `sql` fragments render columns bare in SELECT position
 * and silently count zero).
 */
async function questionCountsFor(packageIds: string[]): Promise<Map<string, number>> {
  if (packageIds.length === 0) {
    return new Map()
  }

  const rows = await db
    .select({
      packageId: examQuestion.examId,
      count: sql<number>`count(*)::int`,
    })
    .from(examQuestion)
    .where(inArray(examQuestion.examId, packageIds))
    .groupBy(examQuestion.examId)

  return new Map(rows.map((row) => [row.packageId, row.count]))
}

interface AttemptState {
  openAttemptId: string | null
  openDeadlineAt: Date | null
  submittedCount: number
  lastScore: string | null
}

/**
 * Per-schedule attempt state for a participant, merged into the exam list.
 * The open attempt is the newest unsubmitted one; the counts are the rows
 * the limit is enforced against (attempts are never deleted).
 */
async function attemptStateBySchedule(
  userId: string,
  scheduleIds: string[]
): Promise<Map<string, AttemptState>> {
  if (scheduleIds.length === 0) {
    return new Map()
  }

  const rows = await db
    .select({
      scheduleId: attempt.scheduleId,
      attemptId: attempt.id,
      deadlineAt: attempt.deadlineAt,
      submittedAt: attempt.submittedAt,
      score: attempt.score,
    })
    .from(attempt)
    .where(
      and(
        eq(attempt.participantId, userId),
        inArray(attempt.scheduleId, scheduleIds)
      )
    )
    .orderBy(asc(attempt.startedAt), asc(attempt.id))

  const state = new Map<string, AttemptState>()

  for (const row of rows) {
    const current = state.get(row.scheduleId) ?? {
      openAttemptId: null,
      openDeadlineAt: null,
      submittedCount: 0,
      lastScore: null,
    }

    if (row.submittedAt === null && current.openAttemptId === null) {
      current.openAttemptId = row.attemptId
      current.openDeadlineAt = row.deadlineAt
    }

    if (row.submittedAt !== null) {
      current.submittedCount += 1
      current.lastScore = row.score ?? current.lastScore
    }

    state.set(row.scheduleId, current)
  }

  return state
}

export interface AttemptDetail {
  id: string
  scheduleId: string
  scheduleName: string
  packageName: string
  startsAt: Date
  endsAt: Date
  startedAt: Date
  deadlineAt: Date | null
  submittedAt: Date | null
  questionOrder: string[]
  score: string | null
  passScore: string | null
}

/**
 * One attempt as its owner sees it: schedule and package context plus the
 * attempt row. Null when the attempt does not belong to the participant.
 */
export async function getAttemptForParticipant(
  attemptId: string,
  userId: string
): Promise<AttemptDetail | null> {
  const [row] = await db
    .select({
      id: attempt.id,
      scheduleId: attempt.scheduleId,
      scheduleName: examSchedule.name,
      packageName: examPackage.name,
      startsAt: examSchedule.startsAt,
      endsAt: examSchedule.endsAt,
      startedAt: attempt.startedAt,
      deadlineAt: attempt.deadlineAt,
      submittedAt: attempt.submittedAt,
      questionOrder: attempt.questionOrder,
      score: attempt.score,
      passScore: examPackage.passScore,
    })
    .from(attempt)
    .innerJoin(examSchedule, eq(attempt.scheduleId, examSchedule.id))
    .innerJoin(examPackage, eq(examSchedule.packageId, examPackage.id))
    .where(and(eq(attempt.id, attemptId), eq(attempt.participantId, userId)))
    .limit(1)

  if (!row) {
    return null
  }

  return {
    ...row,
    questionOrder: row.questionOrder as unknown as string[],
  }
}

export interface AttemptQuestionOption {
  id: string
  content: Record<string, unknown>
  isCorrect: boolean | null
  score: string | null
}

export interface AttemptQuestion {
  questionId: string
  type: QuestionType
  content: Record<string, unknown>
  options: AttemptQuestionOption[]
}

/**
 * The questions of an attempt in the order the participant actually saw
 * them (the snapshot), with their options.
 */
export async function listAttemptQuestions(
  questionOrder: string[]
): Promise<AttemptQuestion[]> {
  if (questionOrder.length === 0) {
    return []
  }

  const questionRows = await db
    .select({
      questionId: question.id,
      type: question.type,
      content: question.content,
    })
    .from(question)
    .where(inArray(question.id, questionOrder))

  const optionRows = await db
    .select({
      id: questionOption.id,
      questionId: questionOption.questionId,
      content: questionOption.content,
      isCorrect: questionOption.isCorrect,
      score: questionOption.score,
    })
    .from(questionOption)
    .where(inArray(questionOption.questionId, questionOrder))
    .orderBy(asc(questionOption.position))

  const optionsByQuestion = new Map<string, AttemptQuestionOption[]>()

  for (const option of optionRows) {
    const list = optionsByQuestion.get(option.questionId) ?? []
    list.push({
      id: option.id,
      content: option.content as Record<string, unknown>,
      isCorrect: option.isCorrect,
      score: option.score,
    })
    optionsByQuestion.set(option.questionId, list)
  }

  const byId = new Map(questionRows.map((row) => [row.questionId, row]))

  return questionOrder.flatMap((questionId) => {
    const row = byId.get(questionId)

    if (!row) {
      return []
    }

    return [
      {
        questionId: row.questionId,
        type: row.type as QuestionType,
        content: row.content as Record<string, unknown>,
        options: optionsByQuestion.get(questionId) ?? [],
      },
    ]
  })
}

export interface SavedAnswer {
  questionId: string
  answer: Record<string, unknown>
  autoScore: string | null
  manualScore: string | null
  gradedBy: string | null
  gradedAt: Date | null
  updatedAt: Date
}

/**
 * The saved answers of an attempt, keyed by question.
 */
export async function listAttemptAnswers(attemptId: string): Promise<SavedAnswer[]> {
  const rows = await db
    .select({
      questionId: attemptAnswer.questionId,
      answer: attemptAnswer.answer,
      autoScore: attemptAnswer.autoScore,
      manualScore: attemptAnswer.manualScore,
      gradedBy: attemptAnswer.gradedBy,
      gradedAt: attemptAnswer.gradedAt,
      updatedAt: attemptAnswer.updatedAt,
    })
    .from(attemptAnswer)
    .where(eq(attemptAnswer.attemptId, attemptId))

  return rows as SavedAnswer[]
}

/**
 * How many attempts a participant has on a schedule — the count the limit
 * is enforced against.
 */
export async function countParticipantAttempts(
  scheduleId: string,
  userId: string
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(attempt)
    .where(
      and(
        eq(attempt.scheduleId, scheduleId),
        eq(attempt.participantId, userId)
      )
    )

  return row?.count ?? 0
}

/**
 * The participant's open (unsubmitted) attempt on a schedule, if any.
 */
export async function findOpenAttempt(
  scheduleId: string,
  userId: string
): Promise<{ id: string; deadlineAt: Date | null } | null> {
  const [row] = await db
    .select({ id: attempt.id, deadlineAt: attempt.deadlineAt })
    .from(attempt)
    .where(
      and(
        eq(attempt.scheduleId, scheduleId),
        eq(attempt.participantId, userId),
        sql`${attempt.submittedAt} is null`
      )
    )
    .orderBy(desc(attempt.startedAt))
    .limit(1)

  return row ?? null
}

/**
 * The questions and their options of a set of ids, for scoring at submit
 * time. Batched to avoid N+1.
 */
export async function listQuestionsWithOptions(
  questionIds: string[]
): Promise<AttemptQuestion[]> {
  if (questionIds.length === 0) {
    return []
  }

  const questionRows = await db
    .select({
      questionId: question.id,
      type: question.type,
      content: question.content,
    })
    .from(question)
    .where(inArray(question.id, questionIds))

  const optionRows = await db
    .select({
      id: questionOption.id,
      questionId: questionOption.questionId,
      content: questionOption.content,
      isCorrect: questionOption.isCorrect,
      score: questionOption.score,
    })
    .from(questionOption)
    .where(inArray(questionOption.questionId, questionIds))
    .orderBy(asc(questionOption.position))

  const optionsByQuestion = new Map<string, AttemptQuestionOption[]>()

  for (const option of optionRows) {
    const list = optionsByQuestion.get(option.questionId) ?? []
    list.push({
      id: option.id,
      content: option.content as Record<string, unknown>,
      isCorrect: option.isCorrect,
      score: option.score,
    })
    optionsByQuestion.set(option.questionId, list)
  }

  return questionRows.map((row) => ({
    questionId: row.questionId,
    type: row.type as QuestionType,
    content: row.content as Record<string, unknown>,
    options: optionsByQuestion.get(row.questionId) ?? [],
  }))
}
