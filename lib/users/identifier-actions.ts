"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"

import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"
import { db } from "@/lib/db"
import { user } from "@/lib/db/schema"
import {
  nisnSchema,
  nipSchema,
  type IdentifierField,
} from "@/lib/identifiers"
import { APP_ROLES } from "@/lib/auth-roles"
import { identifierTaken } from "./identifiers"

const USERS_PATH = "/dashboard/users"

export interface IdentifierActionResult {
  ok: true
}

export interface IdentifierActionError {
  ok: false
  message: string
}

async function requireUserManager(): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const [role] = getAppRoles(session.user.role)

  if (!role || !userHasPermission(role, USERS_PATH)) {
    redirect("/dashboard/forbidden")
  }
}

/**
 * Debounced client-side uniqueness check for the create/edit forms.
 */
export async function checkUserIdentifierAction(
  field: IdentifierField,
  value: string | number,
  excludeUserId?: string
): Promise<{ ok: true; taken: boolean } | IdentifierActionError> {
  await requireUserManager()

  if (typeof value === "string" && !value.trim()) {
    return { ok: true, taken: false }
  }

  if (field === "nisn" && typeof value !== "number") {
    return { ok: true, taken: false }
  }

  return { ok: true, taken: await identifierTaken(field, value, excludeUserId) }
}

export interface UpdateUserIdentifiersValues {
  nisn?: number | null
  nis?: string | null
  nip?: string | null
}

/**
 * Edit a user's identifiers. Role-conditional: participants require NISN,
 * admins require NIP. All provided values are validated and checked for
 * uniqueness, excluding the edited user.
 */
export async function updateUserIdentifiersAction(
  userId: string,
  values: UpdateUserIdentifiersValues
): Promise<IdentifierActionResult | IdentifierActionError> {
  await requireUserManager()

  const [target] = await db
    .select({ id: user.id, role: user.role })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)

  if (!target) {
    return { ok: false, message: "Pengguna tidak ditemukan." }
  }

  const isParticipant = target.role === APP_ROLES.USER

  if (isParticipant) {
    const parsedNisn = nisnSchema.safeParse(values.nisn)
    if (!parsedNisn.success) {
      return { ok: false, message: parsedNisn.error.issues[0]?.message ?? "NISN tidak valid." }
    }

    if (await identifierTaken("nisn", parsedNisn.data, userId)) {
      return { ok: false, message: "NISN sudah digunakan." }
    }
  }

  const isAdmin = target.role === APP_ROLES.ADMIN || target.role === APP_ROLES.SUPER_ADMIN

  if (isAdmin) {
    const parsedNip = nipSchema.safeParse(values.nip)
    if (!parsedNip.success) {
      return { ok: false, message: parsedNip.error.issues[0]?.message ?? "NIP tidak valid." }
    }

    if (await identifierTaken("nip", parsedNip.data, userId)) {
      return { ok: false, message: "NIP sudah digunakan." }
    }
  }

  const updates: {
    nisn?: number | null
    nis?: string | null
    nip?: string | null
  } = {}

  if (isParticipant) {
    updates.nisn = values.nisn ?? null
    updates.nis = values.nis?.trim() || null

    if (updates.nis && (await identifierTaken("nis", updates.nis, userId))) {
      return { ok: false, message: "NIS sudah digunakan." }
    }
  }

  if (isAdmin) {
    updates.nip = values.nip?.trim() || null
  }

  await db.update(user).set({ ...updates, updatedAt: new Date() }).where(eq(user.id, userId))

  return { ok: true }
}
