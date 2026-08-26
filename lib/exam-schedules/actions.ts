"use server"

import { randomUUID } from "node:crypto"
import { revalidateTag } from "next/cache"
import { eq } from "drizzle-orm"
import { z } from "zod"

import { PERMISSIONS } from "@/lib/auth/permissions-catalog"
import { requirePermission } from "@/lib/auth/rbac-guards"
import { CACHE_TAGS } from "@/lib/cache-tags"
import { db } from "@/lib/db"
import { examPackage, examSchedule } from "@/lib/db/schema"
import { ensureUniqueSlug } from "@/lib/slugs"
import { examScheduleSlugTaken, findOverlappingSchedule } from "./queries"
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

function parse(values: ExamScheduleFormValues):
  | { ok: true; data: z.infer<typeof examScheduleSchema> }
  | { ok: false; message: string } {
  const parsed = examScheduleSchema.safeParse(values)

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Data tidak valid." }
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

  const updated = await db
    .update(examSchedule)
    .set({
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
    })
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
    // FK RESTRICT: sessions reference the schedule (future slices).
    if (isForeignKeyViolation(error)) {
      return {
        ok: false,
        message: "Jadwal tidak dapat dihapus karena sudah memiliki sesi ujian.",
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
