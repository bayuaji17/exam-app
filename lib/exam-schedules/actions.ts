"use server"

import { randomUUID } from "node:crypto"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"

import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"
import { db } from "@/lib/db"
import { examPackage, examSchedule } from "@/lib/db/schema"
import { z } from "zod"
import {
  examScheduleSchema,
  type ExamScheduleFormValues,
  validateIntroduction,
  validateScheduleWindow,
} from "./validation"

const SCHEDULES_PATH = "/dashboard/exam-schedules"

export interface ExamScheduleActionResult {
  ok: true
}

export interface ExamScheduleActionError {
  ok: false
  message: string
}

/**
 * A server action is an untrusted entry point: authenticate the caller and
 * authorize the route before touching the database.
 */
async function requireScheduleManager() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const [role] = getAppRoles(session.user.role)

  if (!role || !userHasPermission(role, SCHEDULES_PATH)) {
    redirect("/dashboard/forbidden")
  }
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

function parse(
  values: ExamScheduleFormValues
): { ok: true; data: z.output<typeof examScheduleSchema> } | { ok: false; message: string } {
  const parsed = examScheduleSchema.safeParse(values)

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Data tidak valid." }
  }

  const windowError = validateScheduleWindow(parsed.data.startsAt, parsed.data.endsAt)

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
  await requireScheduleManager()
  const result = parse(values)

  if (!result.ok) {
    return { ok: false, message: result.message }
  }

  const data = result.data
  const packageError = await assertPackageExists(data.packageId)

  if (packageError) {
    return { ok: false, message: packageError }
  }

  await db.insert(examSchedule).values({
    id: randomUUID(),
    name: data.name,
    packageId: data.packageId,
    startsAt: new Date(data.startsAt),
    endsAt: new Date(data.endsAt),
    durationMinutes: data.durationMinutes ?? null,
    attemptLimit: data.attemptLimit ?? null,
    introduction: data.introduction ?? null,
  })

  return { ok: true }
}

export async function updateExamScheduleAction(
  id: string,
  values: ExamScheduleFormValues
): Promise<ExamScheduleActionResult | ExamScheduleActionError> {
  await requireScheduleManager()
  const result = parse(values)

  if (!result.ok) {
    return { ok: false, message: result.message }
  }

  const data = result.data
  const packageError = await assertPackageExists(data.packageId)

  if (packageError) {
    return { ok: false, message: packageError }
  }

  const updated = await db
    .update(examSchedule)
    .set({
      name: data.name,
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

  return { ok: true }
}

export async function deleteExamScheduleAction(
  id: string
): Promise<ExamScheduleActionResult | ExamScheduleActionError> {  await requireScheduleManager()

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
      return { ok: false, message: "Jadwal sudah memiliki sesi dan tidak dapat dihapus." }
    }

    throw error
  }

  return { ok: true }
}

function isForeignKeyViolation(error: unknown): boolean {
  for (let current: unknown = error; current; ) {
    if (
      typeof current === "object" &&
      current !== null &&
      "code" in current &&
      (current as { code?: unknown }).code === "23503"
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

/**
 * Save only the introduction from the dedicated editor page. The document is
 * re-validated against the introduction policy before persisting.
 */
export async function updateExamScheduleIntroductionAction(
  id: string,
  introduction: unknown
): Promise<ExamScheduleActionResult | ExamScheduleActionError> {
  await requireScheduleManager()

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

  return { ok: true }
}
