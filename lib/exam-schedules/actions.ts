"use server"

import { randomUUID } from "node:crypto"
import { revalidateTag } from "next/cache"
import { headers } from "next/headers"
import { eq } from "drizzle-orm"
import { z } from "zod"

import { auth } from "@/lib/auth"
import { PERMISSIONS } from "@/lib/auth/permissions-catalog"
import { requirePermission } from "@/lib/auth/rbac-guards"
import { CACHE_TAGS } from "@/lib/cache-tags"
import { db } from "@/lib/db"
import { examPackage, examSchedule } from "@/lib/db/schema"
import { isUserEligibleForSchedule } from "@/lib/eligibility/queries"
import { ensureUniqueSlug } from "@/lib/slugs"
import { examScheduleSlugTaken, findOverlappingSchedule } from "./queries"
import {
  generateExamToken,
  normalizeExamToken,
} from "./token"
import {
  checkTokenRateLimit,
  recordFailedTokenAttempt,
  resetTokenRateLimit,
} from "./token-rate-limiter"
import {
  examScheduleSchema,
  type ExamScheduleFormValues,
  validateIntroduction,
  validateScheduleWindow,
} from "./validation"

export interface ExamScheduleActionResult {
  ok: true
}

export interface ExamScheduleActionError {
  ok: false
  message: string
}

export interface VerifyTokenResult {
  ok: true
  scheduleId: string
}

export interface VerifyTokenError {
  ok: false
  message: string
  retryAfterSeconds?: number
}

async function assertPackageExists(packageId: string): Promise<string | null> {
  const [pkg] = await db
    .select({ id: examPackage.id })
    .from(examPackage)
    .where(eq(examPackage.id, packageId))
    .limit(1)

  if (!pkg) {
    return "Paket ujian tidak ditemukan."
  }

  return null
}

async function assertNoOverlap(
  packageId: string,
  startsAt: Date,
  endsAt: Date,
  excludeId?: string
): Promise<string | null> {
  const conflict = await findOverlappingSchedule(
    packageId,
    startsAt,
    endsAt,
    excludeId
  )

  if (conflict) {
    return `Jadwal bertabrakan dengan jadwal lain untuk paket yang sama: ${conflict.name}.`
  }

  return null
}

function parse(
  values: ExamScheduleFormValues
):
  | { ok: true; data: z.infer<typeof examScheduleSchema> }
  | { ok: false; message: string } {
  const parsed = examScheduleSchema.safeParse(values)

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Data tidak valid.",
    }
  }

  const windowError = validateScheduleWindow(
    parsed.data.startsAt,
    parsed.data.endsAt
  )

  if (windowError) {
    return { ok: false, message: windowError }
  }

  const introductionError = validateIntroduction(parsed.data.introduction)

  if (introductionError) {
    return { ok: false, message: introductionError }
  }

  return { ok: true, data: parsed.data }
}

export async function createExamScheduleAction(
  values: ExamScheduleFormValues
): Promise<ExamScheduleActionResult | ExamScheduleActionError> {
  await requirePermission(PERMISSIONS.EXAM_SCHEDULES_CREATE)
  const result = parse(values)

  if (!result.ok) {
    return { ok: false, message: result.message }
  }

  const data = result.data
  const packageError = await assertPackageExists(data.packageId)

  if (packageError) {
    return { ok: false, message: packageError }
  }

  const overlapError = await assertNoOverlap(
    data.packageId,
    new Date(data.startsAt),
    new Date(data.endsAt)
  )

  if (overlapError) {
    return { ok: false, message: overlapError }
  }

  await db.insert(examSchedule).values({
    id: randomUUID(),
    name: data.name,
    slug: await ensureUniqueSlug(data.name, examScheduleSlugTaken),
    packageId: data.packageId,
    startsAt: new Date(data.startsAt),
    endsAt: new Date(data.endsAt),
    durationMinutes: data.durationMinutes ?? null,
    attemptLimit: data.attemptLimit ?? null,
    token:
      data.token && data.token.trim().length > 0
        ? normalizeExamToken(data.token)
        : generateExamToken(),
    introduction: data.introduction ?? null,
  })

  revalidateTag(CACHE_TAGS.EXAM_SCHEDULES, "default")

  return { ok: true }
}

export async function updateExamScheduleAction(
  id: string,
  values: ExamScheduleFormValues
): Promise<ExamScheduleActionResult | ExamScheduleActionError> {
  await requirePermission(PERMISSIONS.EXAM_SCHEDULES_UPDATE)
  const result = parse(values)

  if (!result.ok) {
    return { ok: false, message: result.message }
  }

  const data = result.data
  const packageError = await assertPackageExists(data.packageId)

  if (packageError) {
    return { ok: false, message: packageError }
  }

  const overlapError = await assertNoOverlap(
    data.packageId,
    new Date(data.startsAt),
    new Date(data.endsAt),
    id
  )

  if (overlapError) {
    return { ok: false, message: overlapError }
  }

  const updatePayload: Record<string, unknown> = {
    name: data.name,
    slug: await ensureUniqueSlug(data.name, (slug) =>
      examScheduleSlugTaken(slug, id)
    ),
    packageId: data.packageId,
    startsAt: new Date(data.startsAt),
    endsAt: new Date(data.endsAt),
    durationMinutes: data.durationMinutes ?? null,
    attemptLimit: data.attemptLimit ?? null,
    introduction: data.introduction ?? null,
    updatedAt: new Date(),
  }

  if (data.token && data.token.trim().length > 0) {
    updatePayload.token = normalizeExamToken(data.token)
  }

  const updated = await db
    .update(examSchedule)
    .set(updatePayload)
    .where(eq(examSchedule.id, id))
    .returning({ id: examSchedule.id })

  if (updated.length === 0) {
    return { ok: false, message: "Jadwal ujian tidak ditemukan." }
  }

  revalidateTag(CACHE_TAGS.EXAM_SCHEDULES, "default")

  return { ok: true }
}

export async function deleteExamScheduleAction(
  id: string
): Promise<ExamScheduleActionResult | ExamScheduleActionError> {
  await requirePermission(PERMISSIONS.EXAM_SCHEDULES_DELETE)

  try {
    const deleted = await db
      .delete(examSchedule)
      .where(eq(examSchedule.id, id))
      .returning({ id: examSchedule.id })

    if (deleted.length === 0) {
      return { ok: false, message: "Jadwal ujian tidak ditemukan." }
    }
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return {
        ok: false,
        message:
          "Jadwal ujian tidak dapat dihapus karena sudah memiliki data riwayat pengerjaan atau data terkait.",
      }
    }
    throw error
  }

  revalidateTag(CACHE_TAGS.EXAM_SCHEDULES, "default")

  return { ok: true }
}

/**
 * Save only the introduction from the dedicated editor page. The document is
 * re-validated against the introduction policy before persisting.
 */
export async function updateExamScheduleIntroductionAction(
  id: string,
  introduction: unknown
): Promise<ExamScheduleActionResult | ExamScheduleActionError> {
  await requirePermission(PERMISSIONS.EXAM_SCHEDULES_UPDATE)

  const introductionError = validateIntroduction(introduction as never)

  if (introductionError) {
    return { ok: false, message: introductionError }
  }

  const updated = await db
    .update(examSchedule)
    .set({
      introduction: introduction ?? null,
      updatedAt: new Date(),
    })
    .where(eq(examSchedule.id, id))
    .returning({ id: examSchedule.id })

  if (updated.length === 0) {
    return { ok: false, message: "Jadwal ujian tidak ditemukan." }
  }

  revalidateTag(CACHE_TAGS.INTRODUCTIONS, "default")
  revalidateTag(CACHE_TAGS.EXAM_SCHEDULES, "default")

  return { ok: true }
}

/**
 * Validates a participant's entered exam session token.
 */
export async function verifyExamScheduleTokenAction(input: {
  scheduleId: string
  token: string
}): Promise<VerifyTokenResult | VerifyTokenError> {
  const requestHeaders = await headers()
  const session = await auth.api.getSession({ headers: requestHeaders })
  if (!session) {
    return { ok: false, message: "Anda harus login terlebih dahulu." }
  }

  const userId = session.user.id
  const eligible = await isUserEligibleForSchedule(userId, input.scheduleId)
  if (!eligible) {
    return {
      ok: false,
      message: "Anda tidak berhak mengikuti jadwal ujian ini.",
    }
  }

  const rateStatus = checkTokenRateLimit(userId, input.scheduleId)
  if (!rateStatus.allowed) {
    return {
      ok: false,
      message: `Terlalu banyak percobaan gagal. Silakan coba lagi dalam ${rateStatus.retryAfterSeconds} detik.`,
      retryAfterSeconds: rateStatus.retryAfterSeconds,
    }
  }

  const [schedule] = await db
    .select({
      id: examSchedule.id,
      token: examSchedule.token,
      startsAt: examSchedule.startsAt,
      endsAt: examSchedule.endsAt,
    })
    .from(examSchedule)
    .where(eq(examSchedule.id, input.scheduleId))
    .limit(1)

  if (!schedule) {
    return { ok: false, message: "Jadwal ujian tidak ditemukan." }
  }

  const now = new Date()
  if (now >= schedule.endsAt) {
    return { ok: false, message: "Sesi ujian telah berakhir." }
  }

  // If schedule has a token set, verify matching
  if (schedule.token && schedule.token.trim().length > 0) {
    const inputNorm = normalizeExamToken(input.token || "")
    const expectedNorm = normalizeExamToken(schedule.token)

    if (inputNorm !== expectedNorm) {
      const failedRate = recordFailedTokenAttempt(userId, input.scheduleId)
      if (!failedRate.allowed) {
        return {
          ok: false,
          message: `Token ujian salah. Terlalu banyak percobaan gagal. Silakan coba lagi dalam ${failedRate.retryAfterSeconds} detik.`,
          retryAfterSeconds: failedRate.retryAfterSeconds,
        }
      }
      return {
        ok: false,
        message: `Token ujian tidak valid. Sisa percobaan: ${failedRate.remainingAttempts}.`,
      }
    }
  }

  // Success: reset rate limiter
  resetTokenRateLimit(userId, input.scheduleId)
  return { ok: true, scheduleId: input.scheduleId }
}

/**
 * Regenerates the 6-character access token for an exam schedule.
 */
export async function regenerateScheduleTokenAction(input: {
  scheduleId: string
}): Promise<{ ok: true; token: string } | { ok: false; message: string }> {
  await requirePermission(PERMISSIONS.EXAM_SCHEDULES_UPDATE)

  const newToken = generateExamToken()
  const updated = await db
    .update(examSchedule)
    .set({
      token: newToken,
      updatedAt: new Date(),
    })
    .where(eq(examSchedule.id, input.scheduleId))
    .returning({ id: examSchedule.id })

  if (updated.length === 0) {
    return { ok: false, message: "Jadwal ujian tidak ditemukan." }
  }

  revalidateTag(CACHE_TAGS.EXAM_SCHEDULES, "default")
  return { ok: true, token: newToken }
}

function isForeignKeyViolation(error: unknown): boolean {
  for (let current: unknown = error; current; ) {
    if (
      typeof current === "object" &&
      current !== null &&
      "code" in current &&
      ((current as { code?: unknown }).code === "23503" ||
        (current as { code?: unknown }).code === "23001")
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
