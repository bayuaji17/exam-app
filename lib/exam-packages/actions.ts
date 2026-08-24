"use server"

import { randomUUID } from "node:crypto"
import { revalidateTag } from "next/cache"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { and, eq, sql } from "drizzle-orm"

import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"
import { CACHE_TAGS } from "@/lib/cache-tags"
import { db } from "@/lib/db"
import {
  examPackage,
  examQuestion,
  question,
  questionBank,
} from "@/lib/db/schema"
import { ensureUniqueSlug } from "@/lib/slugs"
import { identifierTaken } from "@/lib/users/identifiers"
import { examPackageSlugTaken } from "./queries"
import { swapPositions } from "./order"
import { examPackageSchema, type ExamPackageFormValues } from "./validation"

const EXAMS_PATH = "/dashboard/exams"

export interface ExamPackageActionResult {
  ok: true
}

export interface ExamPackageActionError {
  ok: false
  message: string
}

/**
 * A server action is an untrusted entry point: authenticate the caller and
 * authorize the route before touching the database.
 */
async function requirePackageManager() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const [role] = getAppRoles(session.user.role)

  if (!role || !userHasPermission(role, EXAMS_PATH)) {
    redirect("/dashboard/forbidden")
  }
}

export async function createExamPackageAction(
  values: ExamPackageFormValues
): Promise<ExamPackageActionResult | ExamPackageActionError> {
  await requirePackageManager()
  const parsed = examPackageSchema.safeParse(values)

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Data tidak valid." }
  }

  if (await identifierTaken("kodePaket", parsed.data.kodePaket)) {
    return { ok: false, message: "Kode paket ujian sudah digunakan." }
  }

  await db.insert(examPackage).values({
    id: randomUUID(),
    name: parsed.data.name,
    slug: await ensureUniqueSlug(parsed.data.name, examPackageSlugTaken),
    kodePaket: parsed.data.kodePaket,
    description: parsed.data.description ?? null,
    durationMinutes: parsed.data.durationMinutes ?? null,
    shuffle: parsed.data.shuffle,
    passScore: parsed.data.passScore != null ? String(parsed.data.passScore) : null,
    wrongPenalty: parsed.data.wrongPenalty != null ? String(parsed.data.wrongPenalty) : null,
  })

  revalidateTag(CACHE_TAGS.EXAM_PACKAGES, "default")

  return { ok: true }
}

export async function updateExamPackageAction(
  id: string,
  values: ExamPackageFormValues
): Promise<ExamPackageActionResult | ExamPackageActionError> {
  await requirePackageManager()
  const parsed = examPackageSchema.safeParse(values)

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Data tidak valid." }
  }

  if (await identifierTaken("kodePaket", parsed.data.kodePaket, id)) {
    return { ok: false, message: "Kode paket ujian sudah digunakan." }
  }

  const result = await db
    .update(examPackage)
    .set({
      name: parsed.data.name,
      slug: await ensureUniqueSlug(parsed.data.name, (slug) =>
        examPackageSlugTaken(slug, id)
      ),
      kodePaket: parsed.data.kodePaket,
      description: parsed.data.description ?? null,
      durationMinutes: parsed.data.durationMinutes ?? null,
      shuffle: parsed.data.shuffle,
      passScore: parsed.data.passScore != null ? String(parsed.data.passScore) : null,
      wrongPenalty: parsed.data.wrongPenalty != null ? String(parsed.data.wrongPenalty) : null,
      updatedAt: new Date(),
    })
    .where(eq(examPackage.id, id))
    .returning({ id: examPackage.id })

  if (result.length === 0) {
    return { ok: false, message: "Paket ujian tidak ditemukan." }
  }

  revalidateTag(CACHE_TAGS.EXAM_PACKAGES, "default")

  return { ok: true }
}

export async function deleteExamPackageAction(
  id: string
): Promise<ExamPackageActionResult | ExamPackageActionError> {
  await requirePackageManager()

  const result = await db
    .delete(examPackage)
    .where(eq(examPackage.id, id))
    .returning({ id: examPackage.id })

  if (result.length === 0) {
    return { ok: false, message: "Paket ujian tidak ditemukan." }
  }

  revalidateTag(CACHE_TAGS.EXAM_PACKAGES, "default")

  return { ok: true }
}

/**
 * The eligibility invariant, re-checked server-side at add time (never trust
 * the client's selection list): the question and its bank must both be
 * non-archived.
 */
async function isEligibleQuestion(questionId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: question.id })
    .from(question)
    .innerJoin(questionBank, eq(question.bankId, questionBank.id))
    .where(
      and(
        eq(question.id, questionId),
        sql`${question.archivedAt} is null`,
        sql`${questionBank.archivedAt} is null`
      )
    )
    .limit(1)

  return Boolean(row)
}

export async function addQuestionToPackageAction(
  examId: string,
  questionId: string
): Promise<ExamPackageActionResult | ExamPackageActionError> {
  await requirePackageManager()

  const [pkg] = await db
    .select({ id: examPackage.id })
    .from(examPackage)
    .where(eq(examPackage.id, examId))
    .limit(1)

  if (!pkg) {
    return { ok: false, message: "Paket ujian tidak ditemukan." }
  }

  if (!(await isEligibleQuestion(questionId))) {
    return { ok: false, message: "Soal tidak tersedia untuk paket ujian." }
  }

  try {
    const [last] = await db
      .select({ position: examQuestion.position })
      .from(examQuestion)
      .where(eq(examQuestion.examId, examId))
      .orderBy(sql`${examQuestion.position} desc`)
      .limit(1)

    await db.insert(examQuestion).values({
      id: randomUUID(),
      examId,
      questionId,
      position: (last?.position ?? -1) + 1,
    })
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, message: "Soal sudah ada di dalam paket ini." }
    }

    throw error
  }

  revalidateTag(CACHE_TAGS.EXAM_PACKAGES, "default")

  return { ok: true }
}

export async function removeQuestionFromPackageAction(
  examId: string,
  questionId: string
): Promise<ExamPackageActionResult | ExamPackageActionError> {
  await requirePackageManager()

  const result = await db
    .delete(examQuestion)
    .where(
      and(
        eq(examQuestion.examId, examId),
        eq(examQuestion.questionId, questionId)
      )
    )
    .returning({ id: examQuestion.id })

  if (result.length === 0) {
    return { ok: false, message: "Soal tidak ditemukan di dalam paket." }
  }

  revalidateTag(CACHE_TAGS.EXAM_PACKAGES, "default")

  return { ok: true }
}

export async function movePackageQuestionAction(
  examId: string,
  questionId: string,
  direction: "up" | "down"
): Promise<ExamPackageActionResult | ExamPackageActionError> {
  await requirePackageManager()

  try {
    await db.transaction(async (tx) => {
      const [current] = await tx
        .select({ id: examQuestion.id, position: examQuestion.position })
        .from(examQuestion)
        .where(
          and(
            eq(examQuestion.examId, examId),
            eq(examQuestion.questionId, questionId)
          )
        )
        .limit(1)

      if (!current) {
        throw new PackageMoveError("Soal tidak ditemukan di dalam paket.")
      }

      const targetPosition =
        direction === "up" ? current.position - 1 : current.position + 1

      const [neighbor] = await tx
        .select({ id: examQuestion.id, position: examQuestion.position })
        .from(examQuestion)
        .where(
          and(
            eq(examQuestion.examId, examId),
            eq(examQuestion.position, targetPosition)
          )
        )
        .limit(1)

      if (!neighbor) {
        return
      }

      const swap = swapPositions(current, neighbor)

      await tx
        .update(examQuestion)
        .set({ position: swap.first.position })
        .where(eq(examQuestion.id, swap.first.id))

      await tx
        .update(examQuestion)
        .set({ position: swap.second.position })
        .where(eq(examQuestion.id, swap.second.id))
    })
  } catch (error) {
    if (error instanceof PackageMoveError) {
      return { ok: false, message: error.message }
    }

    throw error
  }

  revalidateTag(CACHE_TAGS.EXAM_PACKAGES, "default")

  return { ok: true }
}

class PackageMoveError extends Error {}

/**
 * The eligible questions of a bank, for the selection browser. Returns
 * plain rows (the action doubles as the data API for the client selector);
 * eligibility is enforced at the query level.
 */
export async function listEligibleForBankAction(
  bankId: string
): Promise<
  | { ok: true; items: Array<{ id: string; type: string; searchText: string; categoryId: string | null }> }
  | { ok: false; message: string }
> {
  await requirePackageManager()

  const rows = await db
    .select({
      id: question.id,
      type: question.type,
      searchText: question.searchText,
      categoryId: question.categoryId,
    })
    .from(question)
    .innerJoin(questionBank, eq(question.bankId, questionBank.id))
    .where(
      and(
        eq(question.bankId, bankId),
        sql`${question.archivedAt} is null`,
        sql`${questionBank.archivedAt} is null`
      )
    )
    .orderBy(sql`${question.createdAt} asc`)

  return {
    ok: true,
    items: rows.map((row) => ({
      id: row.id,
      type: row.type,
      searchText: row.searchText,
      categoryId: row.categoryId,
    })),
  }
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

export async function updatePackageQuestionScoreAction(
  examId: string,
  questionId: string,
  score: number | null
): Promise<ExamPackageActionResult | ExamPackageActionError> {
  await requirePackageManager()

  if (score !== null && (!Number.isFinite(score) || score < 0 || score > 1000)) {
    return { ok: false, message: "Poin harus berupa angka 0–1000." }
  }

  const result = await db
    .update(examQuestion)
    .set({ score: score != null ? String(score) : null })
    .where(
      and(
        eq(examQuestion.examId, examId),
        eq(examQuestion.questionId, questionId)
      )
    )
    .returning({ id: examQuestion.id })

  if (result.length === 0) {
    return { ok: false, message: "Soal tidak ditemukan di dalam paket." }
  }

  revalidateTag(CACHE_TAGS.EXAM_PACKAGES, "default")

  return { ok: true }
}
