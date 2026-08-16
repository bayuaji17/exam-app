"use server"

import { randomUUID } from "node:crypto"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { and, eq } from "drizzle-orm"

import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"
import { db } from "@/lib/db"
import {
  attempt,
  attemptAnswer,
  examQuestion,
  examSchedule,
  question,
} from "@/lib/db/schema"
import { sumAttemptScores } from "./math"
import { manualGradeWeight, parseManualGrade } from "./validation"

const GRADING_PATH = "/dashboard/manual-grading"

export interface GradingActionResult {
  ok: true
}

export interface GradingActionError {
  ok: false
  message: string
}

/**
 * A server action is an untrusted entry point: authenticate the caller and
 * authorize the route before touching the database.
 */
async function requireGradingManager(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const [role] = getAppRoles(session.user.role)

  if (!role || !userHasPermission(role, GRADING_PATH)) {
    redirect("/dashboard/forbidden")
  }

  return session.user.id
}

/**
 * The weight of a manual question: the per-question points override
 * (`exam_question.score`) for the schedule's package, default 1.
 */
async function weightForManualQuestion(
  scheduleId: string,
  questionId: string
): Promise<number | null> {
  const [row] = await db
    .select({ score: examQuestion.score })
    .from(examQuestion)
    .innerJoin(examSchedule, eq(examSchedule.packageId, examQuestion.examId))
    .where(
      and(
        eq(examSchedule.id, scheduleId),
        eq(examQuestion.questionId, questionId)
      )
    )
    .limit(1)

  if (!row) {
    return null
  }

  return manualGradeWeight(row.score !== null ? Number(row.score) : null)
}

async function recomputeAttemptScore(attemptId: string): Promise<void> {
  const rows = await db
    .select({
      autoScore: attemptAnswer.autoScore,
      manualScore: attemptAnswer.manualScore,
    })
    .from(attemptAnswer)
    .where(eq(attemptAnswer.attemptId, attemptId))

  await db
    .update(attempt)
    .set({
      score: String(sumAttemptScores(rows)),
      updatedAt: new Date(),
    })
    .where(eq(attempt.id, attemptId))
}

/**
 * Grade (or clear) one manual answer. The grade is bounded by the question's
 * weight; the attempt total is recomputed transactionally.
 */
export async function saveManualScoreAction(
  attemptId: string,
  questionId: string,
  score: number | null
): Promise<GradingActionResult | GradingActionError> {
  const adminId = await requireGradingManager()

  const [attemptRow] = await db
    .select({
      id: attempt.id,
      scheduleId: attempt.scheduleId,
      questionOrder: attempt.questionOrder,
      submittedAt: attempt.submittedAt,
    })
    .from(attempt)
    .where(eq(attempt.id, attemptId))
    .limit(1)

  if (!attemptRow) {
    return { ok: false, message: "Pengerjaan tidak ditemukan." }
  }

  if (attemptRow.submittedAt === null) {
    return { ok: false, message: "Pengerjaan belum dikumpulkan." }
  }

  const questionOrder = attemptRow.questionOrder as unknown as string[]

  if (!questionOrder.includes(questionId)) {
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

  if (typeRow.type !== "manual") {
    return { ok: false, message: "Hanya soal manual yang dinilai." }
  }

  const weight = await weightForManualQuestion(attemptRow.scheduleId, questionId)

  if (weight === null) {
    return { ok: false, message: "Bobot soal tidak ditemukan." }
  }

  const parsed = parseManualGrade(score, weight)

  if (!parsed.ok) {
    return { ok: false, message: parsed.message }
  }

  // The answer row may not exist yet when the question was left unanswered.
  await db
    .insert(attemptAnswer)
    .values({
      id: randomUUID(),
      attemptId,
      questionId,
      answer: { text: "" },
      manualScore: parsed.score !== null ? String(parsed.score) : null,
      gradedBy: parsed.score !== null ? adminId : null,
      gradedAt: parsed.score !== null ? new Date() : null,
    })
    .onConflictDoUpdate({
      target: [attemptAnswer.attemptId, attemptAnswer.questionId],
      set: {
        manualScore: parsed.score !== null ? String(parsed.score) : null,
        gradedBy: parsed.score !== null ? adminId : null,
        gradedAt: parsed.score !== null ? new Date() : null,
        updatedAt: new Date(),
      },
    })

  await recomputeAttemptScore(attemptId)

  return { ok: true }
}
