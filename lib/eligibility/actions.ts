"use server"

import { randomUUID } from "node:crypto"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { and, eq } from "drizzle-orm"

import { auth } from "@/lib/auth"
import { APP_ROLES, getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"
import { db } from "@/lib/db"
import {
  examSchedule,
  participantGroup,
  scheduleGroupEligibility,
  scheduleUserEligibility,
  user,
} from "@/lib/db/schema"

const SCHEDULES_PATH = "/dashboard/exam-schedules"

export interface EligibilityActionResult {
  ok: true
}

export interface EligibilityActionError {
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

function isPgCode(error: unknown, codes: string[]): boolean {
  // drizzle wraps the underlying pg error in DrizzleQueryError, so the code
  // may sit on the cause chain rather than on the thrown object itself.
  for (let current: unknown = error; current; ) {
    if (
      typeof current === "object" &&
      current !== null &&
      "code" in current &&
      codes.includes((current as { code?: unknown }).code as string)
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

async function assertScheduleExists(scheduleId: string): Promise<string | null> {
  const [schedule] = await db
    .select({ id: examSchedule.id })
    .from(examSchedule)
    .where(eq(examSchedule.id, scheduleId))
    .limit(1)

  return schedule ? null : "Jadwal ujian tidak ditemukan."
}

/**
 * The target of a grant: exists, role `user`, and not banned. Banned
 * accounts and admins are never participants.
 */
async function assertParticipantUser(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ id: user.id, role: user.role, banned: user.banned })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)

  if (!row) {
    return "Peserta tidak ditemukan."
  }

  if (row.role !== APP_ROLES.USER) {
    return "Hanya akun dengan role user yang dapat menjadi peserta."
  }

  if (row.banned) {
    return "Peserta dibanned dan tidak dapat diberi akses."
  }

  return null
}

export async function grantUserEligibilityAction(
  scheduleId: string,
  userId: string
): Promise<EligibilityActionResult | EligibilityActionError> {
  await requireScheduleManager()
  const scheduleError = await assertScheduleExists(scheduleId)

  if (scheduleError) {
    return { ok: false, message: scheduleError }
  }

  const userError = await assertParticipantUser(userId)

  if (userError) {
    return { ok: false, message: userError }
  }

  try {
    await db.insert(scheduleUserEligibility).values({
      id: randomUUID(),
      scheduleId,
      userId,
    })

    return { ok: true }
  } catch (error) {
    if (isPgCode(error, ["23505"])) {
      return { ok: false, message: "Peserta sudah memiliki akses ke jadwal ini." }
    }

    throw error
  }
}

export async function revokeUserEligibilityAction(
  scheduleId: string,
  userId: string
): Promise<EligibilityActionResult | EligibilityActionError> {
  await requireScheduleManager()

  const result = await db
    .delete(scheduleUserEligibility)
    .where(
      and(
        eq(scheduleUserEligibility.scheduleId, scheduleId),
        eq(scheduleUserEligibility.userId, userId)
      )
    )
    .returning({ id: scheduleUserEligibility.id })

  if (result.length === 0) {
    return { ok: false, message: "Peserta tidak memiliki akses ke jadwal ini." }
  }

  return { ok: true }
}

export async function grantGroupEligibilityAction(
  scheduleId: string,
  groupId: string
): Promise<EligibilityActionResult | EligibilityActionError> {
  await requireScheduleManager()
  const scheduleError = await assertScheduleExists(scheduleId)

  if (scheduleError) {
    return { ok: false, message: scheduleError }
  }

  const [group] = await db
    .select({ id: participantGroup.id })
    .from(participantGroup)
    .where(eq(participantGroup.id, groupId))
    .limit(1)

  if (!group) {
    return { ok: false, message: "Grup tidak ditemukan." }
  }

  try {
    await db.insert(scheduleGroupEligibility).values({
      id: randomUUID(),
      scheduleId,
      groupId,
    })

    return { ok: true }
  } catch (error) {
    if (isPgCode(error, ["23505"])) {
      return { ok: false, message: "Grup sudah memiliki akses ke jadwal ini." }
    }

    throw error
  }
}

export async function revokeGroupEligibilityAction(
  scheduleId: string,
  groupId: string
): Promise<EligibilityActionResult | EligibilityActionError> {
  await requireScheduleManager()

  const result = await db
    .delete(scheduleGroupEligibility)
    .where(
      and(
        eq(scheduleGroupEligibility.scheduleId, scheduleId),
        eq(scheduleGroupEligibility.groupId, groupId)
      )
    )
    .returning({ id: scheduleGroupEligibility.id })

  if (result.length === 0) {
    return { ok: false, message: "Grup tidak memiliki akses ke jadwal ini." }
  }

  return { ok: true }
}
