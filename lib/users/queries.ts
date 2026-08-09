import { desc, eq } from "drizzle-orm"

import type { AppRole } from "@/lib/auth-roles"
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
