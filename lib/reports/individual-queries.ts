import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm"

import { extractPlainText, type TipTapDoc } from "@/lib/content-policy"
import { db } from "@/lib/db"
import {
  attempt,
  attemptAnswer,
  examPackage,
  examQuestion,
  examSchedule,
  question,
  questionCategory,
  questionOption,
  user,
} from "@/lib/db/schema"
import { isPassing } from "@/lib/scoring/scoring"

import {
  calculateAttemptDurationMinutes,
  calculateCompetencyBreakdown,
} from "./individual-stats"
import type {
  IndividualReportParticipantRow,
  ItemizedQuestionResult,
  StudentTranscriptReport,
} from "./individual-types"

export interface ListIndividualReportParams {
  scheduleId?: string
  search?: string
  limit?: number
  offset?: number
}

/**
 * Returns options for schedule filter dropdown in the report hub.
 */
export async function listReportSchedulesFilter(): Promise<
  Array<{ id: string; name: string; slug: string }>
> {
  const rows = await db
    .select({
      id: examSchedule.id,
      name: examSchedule.name,
      slug: examSchedule.slug,
    })
    .from(examSchedule)
    .orderBy(desc(examSchedule.createdAt))

  return rows
}

/**
 * Lists participants with submitted attempts for individual report selection.
 */
export async function listIndividualReportParticipants(
  params: ListIndividualReportParams = {}
): Promise<{ items: IndividualReportParticipantRow[]; total: number }> {
  const limit = params.limit ?? 25
  const offset = params.offset ?? 0

  const conditions = [sql`${attempt.submittedAt} IS NOT NULL`]

  if (params.scheduleId && params.scheduleId.trim().length > 0) {
    conditions.push(eq(attempt.scheduleId, params.scheduleId))
  }

  if (params.search && params.search.trim().length > 0) {
    const q = `%${params.search.trim()}%`
    conditions.push(
      or(
        ilike(user.name, q),
        ilike(user.email, q),
        sql`CAST(${user.nisn} AS TEXT) ILIKE ${q}`,
        ilike(user.nis, q),
        ilike(user.nip, q),
        ilike(attempt.nomorPeserta, q)
      )!
    )
  }

  const whereClause = and(...conditions)

  const [countRes] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(attempt)
    .innerJoin(user, eq(attempt.participantId, user.id))
    .innerJoin(examSchedule, eq(attempt.scheduleId, examSchedule.id))
    .where(whereClause)

  const total = countRes?.count ?? 0

  if (total === 0) {
    return { items: [], total: 0 }
  }

  const rows = await db
    .select({
      attemptId: attempt.id,
      participantId: attempt.participantId,
      participantName: user.name,
      participantEmail: user.email,
      identifierNisn: user.nisn,
      identifierNis: user.nis,
      identifierNip: user.nip,
      scheduleId: attempt.scheduleId,
      scheduleTitle: examSchedule.name,
      scheduleSlug: examSchedule.slug,
      nomorPeserta: attempt.nomorPeserta,
      questionOrder: attempt.questionOrder,
      score: attempt.score,
      passScore: examPackage.passScore,
      submittedAt: attempt.submittedAt,
    })
    .from(attempt)
    .innerJoin(user, eq(attempt.participantId, user.id))
    .innerJoin(examSchedule, eq(attempt.scheduleId, examSchedule.id))
    .innerJoin(examPackage, eq(examSchedule.packageId, examPackage.id))
    .where(whereClause)
    .orderBy(desc(attempt.submittedAt))
    .limit(limit)
    .offset(offset)

  // Identify manual questions and graded answers to determine fullyGraded accurately
  const attemptIds = rows.map((r) => r.attemptId)
  const allQuestionIds = [
    ...new Set(
      rows.flatMap((r) => (r.questionOrder as unknown as string[]) || [])
    ),
  ]

  let manualQuestionIds = new Set<string>()
  if (allQuestionIds.length > 0) {
    const manualRows = await db
      .select({ id: question.id })
      .from(question)
      .where(
        and(inArray(question.id, allQuestionIds), eq(question.type, "manual"))
      )
    manualQuestionIds = new Set(manualRows.map((m) => m.id))
  }

  let gradedCounts = new Map<string, number>()
  if (attemptIds.length > 0) {
    const gradedRows = await db
      .select({
        attemptId: attemptAnswer.attemptId,
        count: sql<number>`count(*)::int`,
      })
      .from(attemptAnswer)
      .where(
        and(
          inArray(attemptAnswer.attemptId, attemptIds),
          sql`${attemptAnswer.manualScore} IS NOT NULL`
        )
      )
      .groupBy(attemptAnswer.attemptId)

    gradedCounts = new Map(gradedRows.map((g) => [g.attemptId, g.count]))
  }

  const items: IndividualReportParticipantRow[] = rows.map((row) => {
    const order = (row.questionOrder as unknown as string[]) || []
    const manualCount = order.filter((qId) =>
      manualQuestionIds.has(qId)
    ).length
    const gradedCount = gradedCounts.get(row.attemptId) ?? 0
    const fullyGraded = manualCount === 0 || gradedCount >= manualCount

    const rawScore = row.score !== null ? Number(row.score) : null
    const rawPassScore = row.passScore !== null ? Number(row.passScore) : null
    const passing =
      fullyGraded && rawScore !== null
        ? isPassing(rawScore, rawPassScore)
        : null

    return {
      attemptId: row.attemptId,
      participantId: row.participantId,
      participantName: row.participantName,
      participantEmail: row.participantEmail,
      identifierNisn:
        row.identifierNisn !== null ? String(row.identifierNisn) : null,
      identifierNis: row.identifierNis,
      identifierNip: row.identifierNip,
      scheduleId: row.scheduleId,
      scheduleTitle: row.scheduleTitle,
      scheduleSlug: row.scheduleSlug,
      nomorPeserta: row.nomorPeserta,
      score: rawScore,
      fullyGraded,
      passing,
      submittedAt: row.submittedAt,
    }
  })

  return { items, total }
}

/**
 * Fetches comprehensive individual transcript report for a specific attempt.
 */
export async function getStudentIndividualReport(
  attemptId: string
): Promise<StudentTranscriptReport | null> {
  const [attemptRow] = await db
    .select({
      attemptId: attempt.id,
      scheduleId: attempt.scheduleId,
      scheduleTitle: examSchedule.name,
      scheduleSlug: examSchedule.slug,
      packageId: examSchedule.packageId,
      packageTitle: examPackage.name,
      kodePaket: examPackage.kodePaket,
      passScore: examPackage.passScore,
      participantId: attempt.participantId,
      participantName: user.name,
      participantEmail: user.email,
      identifierNisn: user.nisn,
      identifierNis: user.nis,
      identifierNip: user.nip,
      nomorPeserta: attempt.nomorPeserta,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      score: attempt.score,
      questionOrder: attempt.questionOrder,
    })
    .from(attempt)
    .innerJoin(user, eq(attempt.participantId, user.id))
    .innerJoin(examSchedule, eq(attempt.scheduleId, examSchedule.id))
    .innerJoin(examPackage, eq(examSchedule.packageId, examPackage.id))
    .where(eq(attempt.id, attemptId))
    .limit(1)

  if (!attemptRow) {
    return null
  }

  const order = (attemptRow.questionOrder as unknown as string[]) || []

  if (order.length === 0) {
    return null
  }

  // 1. Fetch questions and categories
  const questionRows = await db
    .select({
      id: question.id,
      type: question.type,
      content: question.content,
      categoryId: question.categoryId,
      categoryName: questionCategory.name,
    })
    .from(question)
    .leftJoin(questionCategory, eq(question.categoryId, questionCategory.id))
    .where(inArray(question.id, order))

  // 2. Fetch options
  const optionRows = await db
    .select({
      id: questionOption.id,
      questionId: questionOption.questionId,
      content: questionOption.content,
      isCorrect: questionOption.isCorrect,
      score: questionOption.score,
    })
    .from(questionOption)
    .where(inArray(questionOption.questionId, order))
    .orderBy(asc(questionOption.position))

  // 3. Fetch weights in package
  const weightRows = await db
    .select({
      questionId: examQuestion.questionId,
      score: examQuestion.score,
    })
    .from(examQuestion)
    .where(
      and(
        eq(examQuestion.examId, attemptRow.packageId),
        inArray(examQuestion.questionId, order)
      )
    )

  // 4. Fetch attempt answers
  const answerRows = await db
    .select({
      questionId: attemptAnswer.questionId,
      answer: attemptAnswer.answer,
      autoScore: attemptAnswer.autoScore,
      manualScore: attemptAnswer.manualScore,
    })
    .from(attemptAnswer)
    .where(eq(attemptAnswer.attemptId, attemptId))

  const questionsById = new Map(questionRows.map((q) => [q.id, q]))
  const optionsByQuestion = new Map<string, typeof optionRows>()
  for (const opt of optionRows) {
    const list = optionsByQuestion.get(opt.questionId) ?? []
    list.push(opt)
    optionsByQuestion.set(opt.questionId, list)
  }
  const weightsByQuestion = new Map(
    weightRows.map((w) => [
      w.questionId,
      w.score !== null ? Number(w.score) : 1,
    ])
  )
  const answersByQuestion = new Map(
    answerRows.map((a) => [a.questionId, a])
  )

  let maxTotalPoints = 0
  let manualQuestionsCount = 0
  let manualGradedCount = 0

  const itemizedQuestions: ItemizedQuestionResult[] = []

  order.forEach((qId, index) => {
    const qData = questionsById.get(qId)
    if (!qData) return

    const maxPoints = weightsByQuestion.get(qId) ?? 1
    maxTotalPoints += maxPoints

    const ansData = answersByQuestion.get(qId)
    const options = optionsByQuestion.get(qId) ?? []

    let promptText = ""
    try {
      promptText = extractPlainText(qData.content as TipTapDoc)
    } catch {
      promptText = "(Pertanyaan)"
    }

    let studentAnswerText = "—"
    let isCorrect: boolean | null = null
    let pointsAwarded: number | null = null

    if (qData.type === "manual") {
      manualQuestionsCount += 1
      const rawAns = ansData?.answer as { text?: string } | undefined
      studentAnswerText =
        rawAns?.text && rawAns.text.trim().length > 0
          ? rawAns.text
          : "(Tidak ada respon tertulis)"

      if (ansData?.manualScore !== null && ansData?.manualScore !== undefined) {
        manualGradedCount += 1
        pointsAwarded = Number(ansData.manualScore)
        isCorrect = pointsAwarded >= maxPoints
      } else {
        pointsAwarded = null
        isCorrect = null
      }
    } else {
      // single / scored
      const rawAns = ansData?.answer as
        | { chosenOptionId?: string | null }
        | undefined
      const chosenId = rawAns?.chosenOptionId ?? null

      if (chosenId) {
        const matchedOption = options.find((o) => o.id === chosenId)
        if (matchedOption) {
          try {
            studentAnswerText = extractPlainText(
              matchedOption.content as TipTapDoc
            )
          } catch {
            studentAnswerText = `Pilihan [${chosenId.slice(-4)}]`
          }
          if (qData.type === "single") {
            isCorrect = matchedOption.isCorrect === true
          }
        } else {
          studentAnswerText = "(Pilihan tidak ditemukan)"
        }
      } else {
        studentAnswerText = "(Tidak dijawab)"
        isCorrect = false
      }

      if (ansData?.autoScore !== null && ansData?.autoScore !== undefined) {
        pointsAwarded = Number(ansData.autoScore)
      } else {
        pointsAwarded = isCorrect ? maxPoints : 0
      }
    }

    itemizedQuestions.push({
      position: index + 1,
      questionId: qId,
      categoryId: qData.categoryId,
      categoryName: qData.categoryName || "Umum / Tanpa Kategori",
      type: qData.type,
      promptText,
      studentAnswerText,
      isCorrect,
      pointsAwarded,
      maxPoints,
    })
  })

  const fullyGraded =
    manualQuestionsCount === 0 || manualGradedCount >= manualQuestionsCount
  const competencies = calculateCompetencyBreakdown(itemizedQuestions)
  const durationMinutes = calculateAttemptDurationMinutes(
    attemptRow.startedAt,
    attemptRow.submittedAt
  )

  const finalScore =
    attemptRow.score !== null ? Number(attemptRow.score) : null
  const passScore =
    attemptRow.passScore !== null ? Number(attemptRow.passScore) : null
  const passing =
    fullyGraded && finalScore !== null
      ? isPassing(finalScore, passScore)
      : null

  return {
    attemptId: attemptRow.attemptId,
    scheduleId: attemptRow.scheduleId,
    scheduleTitle: attemptRow.scheduleTitle,
    scheduleSlug: attemptRow.scheduleSlug,
    packageTitle: attemptRow.packageTitle,
    kodePaket: attemptRow.kodePaket,
    nomorPeserta: attemptRow.nomorPeserta,
    student: {
      id: attemptRow.participantId,
      name: attemptRow.participantName,
      email: attemptRow.participantEmail,
      nisn:
        attemptRow.identifierNisn !== null
          ? String(attemptRow.identifierNisn)
          : null,
      nis: attemptRow.identifierNis,
      nip: attemptRow.identifierNip,
    },
    startedAt: attemptRow.startedAt,
    submittedAt: attemptRow.submittedAt,
    durationMinutes,
    finalScore,
    maxTotalPoints: Math.round(maxTotalPoints * 100) / 100,
    passScore,
    passing,
    fullyGraded,
    competencies,
    questions: itemizedQuestions,
  }
}
