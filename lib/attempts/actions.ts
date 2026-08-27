"use server"

import { randomUUID } from "node:crypto"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { and, eq, sql } from "drizzle-orm"

import { auth } from "@/lib/auth"
import { generateNomorPeserta } from "@/lib/identifiers"
import { APP_ROLES, getAppRoles } from "@/lib/auth-roles"
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
import { isUserEligibleForSchedule } from "@/lib/eligibility/queries"
import {
  computeAutoScore,
  computePackageScore,
  type QuestionAnswer,
  type QuestionScoringInput,
} from "@/lib/scoring/scoring"
import type { QuestionType } from "@/lib/question-banks/question-validation"
import { buildQuestionOrder } from "./order"
import { canStartAttempt } from "./limits"
import {
  countParticipantAttempts,
  findOpenAttempt,
  listAttemptAnswers,
  listQuestionsWithOptions,
} from "./queries"
import { deadlineFor, isExpired } from "./timer"
import { parseAnswer, type AttemptAnswerPayload } from "./validation"

export interface AttemptActionResult {
  ok: true
  attemptId: string
}

export interface AttemptActionError {
  ok: false
  message: string
}

/**
 * A server action is an untrusted entry point: authenticate the caller and
 * authorize the route before touching the database.
 */
async function requireParticipant(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const [role] = getAppRoles(session.user.role)

  if (!role || role !== APP_ROLES.USER) {
    redirect("/dashboard")
  }

  return session.user.id
}

interface ScheduleConfig {
  packageId: string
  kodePaket: string
  durationMinutes: number | null
  shuffle: boolean
  attemptLimit: number | null
  wrongPenalty: number | null
}

async function loadScheduleConfig(
  scheduleId: string
): Promise<ScheduleConfig | null> {
  const [row] = await db
    .select({
      packageId: examSchedule.packageId,
      kodePaket: examPackage.kodePaket,
      durationMinutes: examSchedule.durationMinutes,
      attemptLimit: examSchedule.attemptLimit,
      shuffle: examPackage.shuffle,
      wrongPenalty: examPackage.wrongPenalty,
    })
    .from(examSchedule)
    .innerJoin(examPackage, eq(examSchedule.packageId, examPackage.id))
    .where(eq(examSchedule.id, scheduleId))
    .limit(1)

  if (!row) {
    return null
  }

  return {
    ...row,
    wrongPenalty: row.wrongPenalty !== null ? Number(row.wrongPenalty) : null,
  }
}

async function assertWindowOpen(scheduleId: string): Promise<string | null> {
  const [schedule] = await db
    .select({ startsAt: examSchedule.startsAt, endsAt: examSchedule.endsAt })
    .from(examSchedule)
    .where(eq(examSchedule.id, scheduleId))
    .limit(1)

  if (!schedule) {
    return "Jadwal ujian tidak ditemukan."
  }

  const now = new Date()

  if (now < schedule.startsAt) {
    return "Ujian belum dimulai."
  }

  if (now > schedule.endsAt) {
    return "Ujian sudah selesai."
  }

  return null
}

export async function startAttemptAction(
  scheduleId: string
): Promise<AttemptActionResult | AttemptActionError> {
  const userId = await requireParticipant()

  const windowError = await assertWindowOpen(scheduleId)

  if (windowError) {
    return { ok: false, message: windowError }
  }

  if (!(await isUserEligibleForSchedule(userId, scheduleId))) {
    return { ok: false, message: "Anda tidak memiliki akses ke ujian ini." }
  }

  const config = await loadScheduleConfig(scheduleId)

  if (!config) {
    return { ok: false, message: "Jadwal ujian tidak ditemukan." }
  }

  // Resume: one open attempt per (schedule, participant).
  const open = await findOpenAttempt(scheduleId, userId)

  if (open) {
    return { ok: true, attemptId: open.id }
  }

  const count = await countParticipantAttempts(scheduleId, userId)

  if (!canStartAttempt(config.attemptLimit, count, null)) {
    return {
      ok: false,
      message: "Batas percobaan ujian ini sudah tercapai.",
    }
  }

  const packageQuestions = await db
    .select({ questionId: examQuestion.questionId })
    .from(examQuestion)
    .where(eq(examQuestion.examId, config.packageId))
    .orderBy(examQuestion.position)

  const questionIds = packageQuestions.map((row) => row.questionId)

  if (questionIds.length === 0) {
    return { ok: false, message: "Paket ujian ini belum memiliki soal." }
  }

  const attemptId = randomUUID()
  const startedAt = new Date()
  const deadline = deadlineFor(startedAt, config.durationMinutes)

  // The nomor peserta is `{kodePaket}-{random4-8}`; a collision with an
  // existing number on the same schedule retries with a fresh suffix.
  let nomorPeserta: string | null = null
  for (let retry = 0; retry < 3; retry += 1) {
    const candidate = generateNomorPeserta(config.kodePaket)

    const [existing] = await db
      .select({ id: attempt.id })
      .from(attempt)
      .where(
        and(
          eq(attempt.scheduleId, scheduleId),
          eq(attempt.nomorPeserta, candidate)
        )
      )
      .limit(1)

    if (!existing) {
      nomorPeserta = candidate
      break
    }
  }

  await db.insert(attempt).values({
    id: attemptId,
    scheduleId,
    participantId: userId,
    startedAt,
    deadlineAt: deadline,
    nomorPeserta,
    questionOrder: buildQuestionOrder(questionIds, config.shuffle, attemptId),
  })

  return { ok: true, attemptId }
}

interface OpenAttempt {
  id: string
  scheduleId: string
  deadlineAt: Date | null
  questionOrder: string[]
}

/**
 * The caller's open attempt, or null when missing, not theirs, or already
 * submitted. The question order comes along for answer validation.
 */
async function loadOpenAttempt(
  attemptId: string,
  userId: string
): Promise<OpenAttempt | null> {
  const [row] = await db
    .select({
      id: attempt.id,
      scheduleId: attempt.scheduleId,
      deadlineAt: attempt.deadlineAt,
      questionOrder: attempt.questionOrder,
    })
    .from(attempt)
    .where(
      and(
        eq(attempt.id, attemptId),
        eq(attempt.participantId, userId),
        sql`${attempt.submittedAt} is null`
      )
    )
    .limit(1)

  if (!row) {
    return null
  }

  return {
    ...row,
    questionOrder: row.questionOrder as unknown as string[],
  }
}

export async function saveAnswerAction(
  attemptId: string,
  questionId: string,
  answer: AttemptAnswerPayload
): Promise<AttemptActionResult | AttemptActionError> {
  const userId = await requireParticipant()
  const open = await loadOpenAttempt(attemptId, userId)

  if (!open) {
    return {
      ok: false,
      message: "Pengerjaan tidak ditemukan atau sudah dikumpulkan.",
    }
  }

  if (isExpired(open.deadlineAt)) {
    return { ok: false, message: "Waktu pengerjaan sudah habis." }
  }

  if (!open.questionOrder.includes(questionId)) {
    return { ok: false, message: "Soal tidak ditemukan." }
  }

  const [typeRow] = await db
    .select({ type: question.type })
    .from(question)
    .where(eq(question.id, questionId))
    .limit(1)

  if (!typeRow) {
    return { ok: false, message: "Soal tidak ditemukan." }
  }

  const parsed = parseAnswer(typeRow.type as QuestionType, answer)

  if (!parsed.ok) {
    return { ok: false, message: parsed.message }
  }

  // Option answers must reference an option of this question.
  if ("chosenOptionId" in parsed.data && parsed.data.chosenOptionId !== null) {
    const [option] = await db
      .select({ id: questionOption.id })
      .from(questionOption)
      .where(
        and(
          eq(questionOption.id, parsed.data.chosenOptionId),
          eq(questionOption.questionId, questionId)
        )
      )
      .limit(1)

    if (!option) {
      return { ok: false, message: "Opsi jawaban tidak valid." }
    }
  }

  await db
    .insert(attemptAnswer)
    .values({
      id: randomUUID(),
      attemptId,
      questionId,
      answer: parsed.data,
    })
    .onConflictDoUpdate({
      target: [attemptAnswer.attemptId, attemptAnswer.questionId],
      set: {
        answer: parsed.data,
        updatedAt: new Date(),
      },
    })

  return { ok: true, attemptId }
}

/**
 * Finalize an attempt: compute per-question auto scores (single/scored) and
 * the package total. Manual questions are excluded from the total — grading
 * is a later slice — and keep `autoScore` null.
 */
async function finalizeAttempt(attemptId: string): Promise<void> {
  const [attemptRow] = await db
    .select({
      scheduleId: attempt.scheduleId,
      questionOrder: attempt.questionOrder,
    })
    .from(attempt)
    .where(eq(attempt.id, attemptId))
    .limit(1)

  if (!attemptRow) {
    return
  }

  const questionIds = attemptRow.questionOrder as unknown as string[]

  // Mark submitted first: even a package with no questions finalizes (score
  // 0), otherwise the result page would loop back to the attempt.
  await db
    .update(attempt)
    .set({
      submittedAt: new Date(),
      score: "0",
      updatedAt: new Date(),
    })
    .where(eq(attempt.id, attemptId))

  if (questionIds.length === 0) {
    return
  }

  const [questions, answers, config, pointsByQuestion] = await Promise.all([
    listQuestionsWithOptions(questionIds),
    listAttemptAnswers(attemptId),
    loadScheduleConfig(attemptRow.scheduleId),
    loadPointsByQuestion(attemptRow.scheduleId),
  ])

  if (!config) {
    return
  }

  const answersByQuestion = new Map(
    answers.map((answer) => [answer.questionId, answer])
  )
  const wrongPenalty = config.wrongPenalty
  const results = []

  for (const entry of questions) {
    const saved = answersByQuestion.get(entry.questionId)
    const payload = saved?.answer as
      | { chosenOptionId: string | null }
      | undefined
    const answer: QuestionAnswer | null =
      entry.type === "manual"
        ? null
        : { chosenOptionId: payload?.chosenOptionId ?? null }

    const scoringInput: QuestionScoringInput = {
      type: entry.type,
      points: pointsByQuestion.get(entry.questionId) ?? null,
      correctOptionId:
        entry.options.find((option) => option.isCorrect === true)?.id ?? null,
      options: entry.options.map((option) => ({
        id: option.id,
        score: option.score !== null ? Number(option.score) : null,
      })),
    }

    const auto = computeAutoScore(entry.type, answer, scoringInput, {
      wrongPenalty,
    })

    results.push({
      questionId: entry.questionId,
      type: entry.type,
      answer,
      question: scoringInput,
    })

    if (auto !== null) {
      await db
        .update(attemptAnswer)
        .set({ autoScore: String(auto) })
        .where(
          and(
            eq(attemptAnswer.attemptId, attemptId),
            eq(attemptAnswer.questionId, entry.questionId)
          )
        )
    }
  }

  const total = computePackageScore(results, { wrongPenalty })

  await db
    .update(attempt)
    .set({
      score: String(total),
      updatedAt: new Date(),
    })
    .where(eq(attempt.id, attemptId))
}

/**
 * Per-question points overrides (exam_question.score) for a schedule's
 * package, as a questionId -> number map.
 */
async function loadPointsByQuestion(
  scheduleId: string
): Promise<Map<string, number>> {
  const rows = await db
    .select({
      questionId: examQuestion.questionId,
      score: examQuestion.score,
    })
    .from(examQuestion)
    .innerJoin(examSchedule, eq(examSchedule.packageId, examQuestion.examId))
    .where(eq(examSchedule.id, scheduleId))

  const map = new Map<string, number>()

  for (const row of rows) {
    if (row.score !== null) {
      map.set(row.questionId, Number(row.score))
    }
  }

  return map
}

export async function submitAttemptAction(
  attemptId: string
): Promise<AttemptActionResult | AttemptActionError> {
  const userId = await requireParticipant()
  const open = await loadOpenAttempt(attemptId, userId)

  if (!open) {
    return {
      ok: false,
      message: "Pengerjaan tidak ditemukan atau sudah dikumpulkan.",
    }
  }

  // A deadline that passed while the participant was away finalizes lazily —
  // the submit goes through with whatever answers exist.
  await finalizeAttempt(attemptId)

  return { ok: true, attemptId }
}
