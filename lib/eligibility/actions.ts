"use server"

import { randomUUID } from "node:crypto"
import { and, eq } from "drizzle-orm"

import { APP_ROLES } from "@/lib/auth-roles"
import { PERMISSIONS } from "@/lib/auth/permissions-catalog"
import { requirePermission } from "@/lib/auth/rbac-guards"
import { db } from "@/lib/db"
import {
  examSchedule,
  participantGroup,
  scheduleGroupEligibility,
  scheduleUserEligibility,
  user,
} from "@/lib/db/schema"

export interface EligibilityActionResult {
  ok: true
}

export interface EligibilityActionError {
  ok: false
  message: string
}

async function requireScheduleManager() {
  await requirePermission(PERMISSIONS.ELIGIBILITY_MANAGE)
}

function isPgCode(error: unknown, codes: string[]): boolean {
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

async function assertScheduleExists(
  scheduleId: string
): Promise<string | null> {
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
      return {
        ok: false,
        message: "Peserta sudah memiliki akses ke jadwal ini.",
      }
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
