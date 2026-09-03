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
  attemptSessionTransfer,
  examPackage,
  examQuestion,
  examSchedule,
  question,
  questionOption,
  session,
} from "@/lib/db/schema"
import { isUserEligibleForSchedule } from "@/lib/eligibility/queries"
import {
  checkTokenRateLimit,
  recordFailedTokenAttempt,
  resetTokenRateLimit,
} from "@/lib/exam-schedules/token-rate-limiter"
import { normalizeExamToken } from "@/lib/exam-schedules/token"
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
  findActiveAttemptForUser,
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
async function requireParticipantSession(): Promise<{
  userId: string
  sessionId: string
  ipAddress?: string
  userAgent?: string
}> {
  const requestHeaders = await headers()
  const sessionData = await auth.api.getSession({ headers: requestHeaders })

  if (!sessionData) {
    redirect("/login")
  }

  const [role] = getAppRoles(sessionData.user.role)

  if (!role || role !== APP_ROLES.USER) {
    redirect("/dashboard")
  }

  return {
    userId: sessionData.user.id,
    sessionId: sessionData.session.id,
    ipAddress: requestHeaders.get("x-forwarded-for") ?? undefined,
    userAgent: requestHeaders.get("user-agent") ?? undefined,
  }
}

interface ScheduleConfig {
  packageId: string
  kodePaket: string
  durationMinutes: number | null
  shuffle: boolean
  attemptLimit: number | null
  wrongPenalty: number | null
  endsAt: Date
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
      endsAt: examSchedule.endsAt,
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
): Promise<
  | AttemptActionResult
  | (AttemptActionError & { locked?: boolean; canRecover?: boolean })
> {
  const { userId, sessionId } = await requireParticipantSession()

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

  // Single-active attempt invariant: check active open attempts globally for this user
  const activeAttempt = await findActiveAttemptForUser(userId)

  if (activeAttempt) {
    // If active attempt is on THIS schedule:
    if (activeAttempt.scheduleId === scheduleId) {
      // Check session ownership (Session Pinning)
      if (
        activeAttempt.startedSessionId &&
        activeAttempt.startedSessionId !== sessionId
      ) {
        return {
          ok: false,
          message:
            "Sesi ujian ini sedang aktif di perangkat lain. Gunakan perangkat awal atau lakukan pemulihan sesi.",
          locked: true,
          canRecover: true,
        }
      }
      return { ok: true, attemptId: activeAttempt.id }
    }

    // If active attempt is on ANOTHER schedule:
    return {
      ok: false,
      message:
        "Anda memiliki sesi ujian aktif yang belum selesai di jadwal lain. Selesaikan ujian tersebut terlebih dahulu.",
    }
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
  const deadline = deadlineFor(startedAt, config.durationMinutes, config.endsAt)

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

  try {
    await db.insert(attempt).values({
      id: attemptId,
      scheduleId,
      participantId: userId,
      startedSessionId: sessionId,
      startedAt,
      deadlineAt: deadline,
      nomorPeserta,
      questionOrder: buildQuestionOrder(questionIds, config.shuffle, attemptId),
    })
  } catch (error: unknown) {
    if (isUniqueViolation(error)) {
      return {
        ok: false,
        message: "Anda memiliki sesi ujian aktif yang belum selesai.",
      }
    }
    throw error
  }

  return { ok: true, attemptId }
}

interface OpenAttempt {
  id: string
  scheduleId: string
  deadlineAt: Date | null
  endsAt: Date
  questionOrder: string[]
  startedSessionId: string | null
}

/**
 * The caller's open attempt, or null when missing, not theirs, or already
 * submitted. The question order comes along for answer validation.
 */
async function loadOpenAttempt(
  attemptId: string,
  userId: string,
  sessionId?: string
): Promise<
  | { ok: true; attempt: OpenAttempt }
  | { ok: false; message: string; locked?: boolean }
> {
  const [row] = await db
    .select({
      id: attempt.id,
      scheduleId: attempt.scheduleId,
      deadlineAt: attempt.deadlineAt,
      endsAt: examSchedule.endsAt,
      questionOrder: attempt.questionOrder,
      startedSessionId: attempt.startedSessionId,
    })
    .from(attempt)
    .innerJoin(examSchedule, eq(attempt.scheduleId, examSchedule.id))
    .where(
      and(
        eq(attempt.id, attemptId),
        eq(attempt.participantId, userId),
        sql`${attempt.submittedAt} is null`
      )
    )
    .limit(1)

  if (!row) {
    return {
      ok: false,
      message: "Pengerjaan tidak ditemukan atau sudah dikumpulkan.",
    }
  }

  if (
    sessionId &&
    row.startedSessionId &&
    row.startedSessionId !== sessionId
  ) {
    return {
      ok: false,
      message:
        "Akses sesi tidak valid. Ujian sedang dikerjakan di perangkat lain.",
      locked: true,
    }
  }

  return {
    ok: true,
    attempt: {
      ...row,
      questionOrder: row.questionOrder as unknown as string[],
    },
  }
}

export async function saveAnswerAction(
  attemptId: string,
  questionId: string,
  answer: AttemptAnswerPayload
): Promise<AttemptActionResult | AttemptActionError> {
  const { userId, sessionId } = await requireParticipantSession()
  const openResult = await loadOpenAttempt(attemptId, userId, sessionId)

  if (!openResult.ok) {
    return {
      ok: false,
      message: openResult.message,
    }
  }

  const open = openResult.attempt

  if (isExpired(open.deadlineAt, open.endsAt, new Date())) {
    await finalizeAttempt(attemptId, "system")
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
export async function finalizeAttempt(
  attemptId: string,
  submissionType: "participant" | "system" = "participant"
): Promise<void> {
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
      submissionType,
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
  const { userId, sessionId } = await requireParticipantSession()
  const openResult = await loadOpenAttempt(attemptId, userId, sessionId)

  if (!openResult.ok) {
    return {
      ok: false,
      message: openResult.message,
    }
  }

  // A deadline that passed while the participant was away finalizes lazily —
  // the submit goes through with whatever answers exist.
  await finalizeAttempt(attemptId, "participant")

  return { ok: true, attemptId }
}

/**
 * Recovers an ongoing attempt to a new device session by verifying the schedule token,
 * force-revoking the old session, and logging the transfer audit record.
 */
export async function recoverAttemptSessionAction(input: {
  attemptId: string
  scheduleId: string
  token: string
}): Promise<AttemptActionResult | AttemptActionError> {
  const { userId, sessionId, ipAddress, userAgent } =
    await requireParticipantSession()

  if (!(await isUserEligibleForSchedule(userId, input.scheduleId))) {
    return {
      ok: false,
      message: "Anda tidak memiliki akses ke jadwal ujian ini.",
    }
  }

  const rateStatus = checkTokenRateLimit(userId, input.scheduleId)
  if (!rateStatus.allowed) {
    return {
      ok: false,
      message: `Terlalu banyak percobaan token gagal. Silakan coba lagi dalam ${rateStatus.retryAfterSeconds} detik.`,
    }
  }

  const [schedule] = await db
    .select({
      id: examSchedule.id,
      token: examSchedule.token,
      endsAt: examSchedule.endsAt,
    })
    .from(examSchedule)
    .where(eq(examSchedule.id, input.scheduleId))
    .limit(1)

  if (!schedule) {
    return { ok: false, message: "Jadwal ujian tidak ditemukan." }
  }

  if (new Date() >= schedule.endsAt) {
    return { ok: false, message: "Sesi ujian telah berakhir." }
  }

  if (schedule.token && schedule.token.trim().length > 0) {
    const inputNorm = normalizeExamToken(input.token || "")
    const expectedNorm = normalizeExamToken(schedule.token)

    if (inputNorm !== expectedNorm) {
      const failed = recordFailedTokenAttempt(userId, input.scheduleId)
      return {
        ok: false,
        message: `Token ujian tidak valid. Sisa percobaan: ${failed.remainingAttempts}.`,
      }
    }
  }

  // Execute atomic takeover within transaction
  return await db.transaction(async (tx) => {
    const [open] = await tx
      .select({
        id: attempt.id,
        participantId: attempt.participantId,
        startedSessionId: attempt.startedSessionId,
        submittedAt: attempt.submittedAt,
      })
      .from(attempt)
      .where(
        and(
          eq(attempt.id, input.attemptId),
          eq(attempt.scheduleId, input.scheduleId),
          eq(attempt.participantId, userId),
          sql`${attempt.submittedAt} is null`
        )
      )
      .limit(1)

    if (!open) {
      return {
        ok: false,
        message: "Pengerjaan tidak ditemukan atau sudah selesai.",
      }
    }

    const previousSessionId = open.startedSessionId

    // Force-revoke previous session if it exists and differs
    if (previousSessionId && previousSessionId !== sessionId) {
      await tx.delete(session).where(eq(session.id, previousSessionId))
    }

    // Update startedSessionId atomically
    await tx
      .update(attempt)
      .set({
        startedSessionId: sessionId,
        updatedAt: new Date(),
      })
      .where(eq(attempt.id, input.attemptId))

    // Log audit transfer
    await tx.insert(attemptSessionTransfer).values({
      id: randomUUID(),
      attemptId: input.attemptId,
      participantId: userId,
      previousSessionId,
      newSessionId: sessionId,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      reason: "crash_recovery_token_reverified",
      transferredAt: new Date(),
    })

    resetTokenRateLimit(userId, input.scheduleId)

    return { ok: true, attemptId: input.attemptId }
  })
}

function isUniqueViolation(error: unknown): boolean {
  for (let current: unknown = error; current; ) {
    if (
      typeof current === "object" &&
      current !== null &&
      "code" in current &&
      (current as { code?: unknown }).code === "23505"
    ) {
      return true
    }
    const cause = (current as { cause?: unknown })?.cause
    if (cause === current || cause === undefined) {
      return false
    }
    current = cause
  }
  return false
}
