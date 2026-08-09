import { desc, eq, inArray } from "drizzle-orm"

import { APP_ROLES, type AppRole } from "@/lib/auth-roles"
import { db } from "@/lib/db"
import { user } from "@/lib/db/schema"

/**
 * A user as the management list renders one.
 *
 * Narrower than the full row on purpose: the list needs no avatar, no
 * verification flag, and no ban expiry, so they are not fetched. Widen this
 * when a screen actually needs more.
 */
export interface UserListItem {
  id: string
  name: string
  email: string
  role: AppRole
  createdAt: Date
  banned: boolean
  banReason: string | null
}

/**
 * Every account, newest first.
 *
 * `id` is a secondary sort key rather than decoration: users created in the
 * same transaction can share a `createdAt` to the millisecond, and Postgres is
 * free to return ties in any order. Without it the list would reshuffle
 * between reloads.
 */
export async function listUsers(): Promise<UserListItem[]> {
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      banned: user.banned,
      banReason: user.banReason,
    })
    .from(user)
    .orderBy(desc(user.createdAt), desc(user.id))
}

/**
 * One account, with the ban fields the edit screen pre-fills from.
 *
 * Wider than `UserListItem` because the edit form needs `banExpires` to show
 * when a current ban lifts. Null when no such account exists, so callers can
 * decide between a redirect and a 404 rather than being handed an empty row.
 */
export interface UserDetail extends UserListItem {
  banExpires: Date | null
}

export async function getUserById(id: string): Promise<UserDetail | null> {
  const [row] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      banned: user.banned,
      banReason: user.banReason,
      banExpires: user.banExpires,
    })
    .from(user)
    .where(eq(user.id, id))
    .limit(1)

  return row ?? null
}

/**
 * Everyone who holds an administrative role, newest first.
 *
 * Powers the super-admin roster page. The secondary sort key keeps tied
 * timestamps from reshuffling the list between reloads, as in `listUsers`.
 */
export async function listAdminRoster(): Promise<UserListItem[]> {
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      banned: user.banned,
      banReason: user.banReason,
    })
    .from(user)
    .where(
      inArray(user.role, [APP_ROLES.ADMIN, APP_ROLES.SUPER_ADMIN])
    )
    .orderBy(desc(user.createdAt), desc(user.id))
}

/**
 * Regular users who could be promoted, newest first.
 *
 * Banned accounts are included: ban status and role are orthogonal, and a
 * demotion/promotion does not touch the ban.
 */
export async function listPromotableUsers(): Promise<UserListItem[]> {
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      banned: user.banned,
      banReason: user.banReason,
    })
    .from(user)
    .where(eq(user.role, APP_ROLES.USER))
    .orderBy(desc(user.createdAt), desc(user.id))
}
