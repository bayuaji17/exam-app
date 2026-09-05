"use server"

import { randomUUID } from "node:crypto"
import { and, eq } from "drizzle-orm"

import { APP_ROLES } from "@/lib/auth-roles"
import { PERMISSIONS } from "@/lib/auth/permissions-catalog"
import { requirePermission } from "@/lib/auth/rbac-guards"
import { db } from "@/lib/db"
import { participantGroup, participantGroupMember, user } from "@/lib/db/schema"
import { ensureUniqueSlug } from "@/lib/slugs"
import { groupNameTaken, participantGroupSlugTaken } from "./queries"
import {
  participantGroupSchema,
  type ParticipantGroupFormValues,
} from "./validation"

export interface ParticipantGroupActionResult {
  ok: true
  id: string
}

export interface ParticipantGroupActionError {
  ok: false
  message: string
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

export async function createParticipantGroupAction(
  values: ParticipantGroupFormValues
): Promise<ParticipantGroupActionResult | ParticipantGroupActionError> {
  await requirePermission(PERMISSIONS.USER_GROUPS_CREATE)
  const parsed = participantGroupSchema.safeParse(values)

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Data tidak valid.",
    }
  }

  if (await groupNameTaken(parsed.data.name)) {
    return { ok: false, message: "Grup dengan nama tersebut sudah ada." }
  }

  const [row] = await db
    .insert(participantGroup)
    .values({
      id: randomUUID(),
      name: parsed.data.name,
      slug: await ensureUniqueSlug(parsed.data.name, participantGroupSlugTaken),
      description: parsed.data.description ?? null,
    })
    .returning({ id: participantGroup.id })

  return { ok: true, id: row?.id ?? "" }
}

export async function updateParticipantGroupAction(
  id: string,
  values: ParticipantGroupFormValues
): Promise<ParticipantGroupActionResult | ParticipantGroupActionError> {
  await requirePermission(PERMISSIONS.USER_GROUPS_UPDATE)
  const parsed = participantGroupSchema.safeParse(values)

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Data tidak valid.",
    }
  }

  if (await groupNameTaken(parsed.data.name, id)) {
    return { ok: false, message: "Grup dengan nama tersebut sudah ada." }
  }

  const result = await db
    .update(participantGroup)
    .set({
      name: parsed.data.name,
      slug: await ensureUniqueSlug(parsed.data.name, (slug) =>
        participantGroupSlugTaken(slug, id)
      ),
      description: parsed.data.description ?? null,
      updatedAt: new Date(),
    })
    .where(eq(participantGroup.id, id))
    .returning({ id: participantGroup.id })

  if (result.length === 0) {
    return { ok: false, message: "Grup tidak ditemukan." }
  }

  return { ok: true, id: result[0]?.id ?? id }
}

export async function deleteParticipantGroupAction(
  id: string
): Promise<ParticipantGroupActionResult | ParticipantGroupActionError> {
  await requirePermission(PERMISSIONS.USER_GROUPS_DELETE)

  try {
    const result = await db
      .delete(participantGroup)
      .where(eq(participantGroup.id, id))
      .returning({ id: participantGroup.id })

    if (result.length === 0) {
      return { ok: false, message: "Grup tidak ditemukan." }
    }

    return { ok: true, id: result[0]?.id ?? id }
  } catch (error) {
    // FK RESTRICT from schedule_group_eligibility: granted groups cannot be
    // deleted while a schedule's access rules reference them.
    if (isPgCode(error, ["23503", "23001"])) {
      return {
        ok: false,
        message:
          "Grup sedang digunakan oleh aturan akses dan tidak dapat dihapus.",
      }
    }

    throw error
  }
}

/**
 * The target of a membership or grant action: exists, role `user`, and not
 * banned. Banned accounts and admins are never participants.
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
    return "Peserta dibanned dan tidak dapat ditambahkan."
  }

  return null
}

export async function addGroupMemberAction(
  groupId: string,
  userId: string
): Promise<ParticipantGroupActionResult | ParticipantGroupActionError> {
  await requirePermission(PERMISSIONS.USER_GROUPS_UPDATE)

  const [group] = await db
    .select({ id: participantGroup.id })
    .from(participantGroup)
    .where(eq(participantGroup.id, groupId))
    .limit(1)

  if (!group) {
    return { ok: false, message: "Grup tidak ditemukan." }
  }

  const userError = await assertParticipantUser(userId)

  if (userError) {
    return { ok: false, message: userError }
  }

  try {
    const [row] = await db
      .insert(participantGroupMember)
      .values({
        id: randomUUID(),
        groupId,
        userId,
      })
      .returning({ id: participantGroupMember.id })

    return { ok: true, id: row?.id ?? "" }
  } catch (error) {
    if (isPgCode(error, ["23505"])) {
      return { ok: false, message: "Peserta sudah menjadi anggota grup ini." }
    }

    throw error
  }
}

export async function removeGroupMemberAction(
  groupId: string,
  userId: string
): Promise<ParticipantGroupActionResult | ParticipantGroupActionError> {
  await requirePermission(PERMISSIONS.USER_GROUPS_UPDATE)

  const result = await db
    .delete(participantGroupMember)
    .where(
      and(
        eq(participantGroupMember.groupId, groupId),
        eq(participantGroupMember.userId, userId)
      )
    )
    .returning({ id: participantGroupMember.id })

  if (result.length === 0) {
    return { ok: false, message: "Peserta bukan anggota grup ini." }
  }

  return { ok: true, id: result[0]?.id ?? groupId }
}
