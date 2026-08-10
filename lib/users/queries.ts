import {
  and,
  asc,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm"
import type { AnyColumn } from "drizzle-orm/column"

import { APP_ROLES, type SystemRole } from "@/lib/auth-roles"
import { db } from "@/lib/db"
import { session, user } from "@/lib/db/schema"
import type { SortColumn, TableParams } from "./table-params"

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
  role: SystemRole
  createdAt: Date
  banned: boolean
  banReason: string | null
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
    .select({ ...LIST_PROJECTION, banExpires: user.banExpires })
    .from(user)
    .where(eq(user.id, id))
    .limit(1)

  return row ?? null
}

/**
 * Regular users who could be promoted, newest first.
 *
 * Banned accounts are included: ban status and role are orthogonal, and a
 * demotion/promotion does not touch the ban.
 */
export async function listPromotableUsers(): Promise<UserListItem[]> {
  return db
    .select(LIST_PROJECTION)
    .from(user)
    .where(eq(user.role, APP_ROLES.USER))
    .orderBy(desc(user.createdAt), desc(user.id))
}

/**
 * One active session as the sessions page renders it.
 */
export interface ActiveSession {
  id: string
  token: string
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
  expiresAt: Date
  impersonatedBy: string | null
}

/**
 * A user's sessions that have not expired, newest first.
 *
 * `token` is included because revoking a specific session needs it; the
 * client's `revoke-session` call re-checks ownership before deleting.
 */
export async function listActiveSessionsForUser(
  userId: string
): Promise<ActiveSession[]> {
  return db
    .select({
      id: session.id,
      token: session.token,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      impersonatedBy: session.impersonatedBy,
    })
    .from(session)
    .where(
      and(eq(session.userId, userId), gt(session.expiresAt, new Date()))
    )
    .orderBy(desc(session.createdAt), desc(session.id))
}

/**
 * Email addresses for a set of user ids, for resolving `impersonatedBy`.
 */
export async function getEmailsByIds(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) {
    return new Map()
  }

  const rows = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(inArray(user.id, ids))

  return new Map(rows.map((row) => [row.id, row.email]))
}

/**
 * One page of a management table: the rows plus everything pagination needs.
 */
export interface UsersPage {
  items: UserListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * The projection every management table reads. Shared so a new table cannot
 * forget a column and drift from the others.
 */
const LIST_PROJECTION = {
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
  banned: user.banned,
  banReason: user.banReason,
}

const SORT_COLUMNS: Record<SortColumn, AnyColumn> = {
  name: user.name,
  email: user.email,
  createdAt: user.createdAt,
}

function buildFilters(params: TableParams, roles?: SystemRole[]): SQL[] {
  const filters: SQL[] = []

  if (params.q) {
    const pattern = `%${params.q}%`
    filters.push(or(ilike(user.name, pattern), ilike(user.email, pattern))!)
  }

  if (params.role) {
    filters.push(eq(user.role, params.role))
  }

  if (roles) {
    filters.push(inArray(user.role, roles))
  }

  if (params.status === "banned") {
    filters.push(eq(user.banned, true))
  }

  if (params.status === "active") {
    filters.push(eq(user.banned, false))
  }

  return filters
}

/**
 * One page of accounts matching the table's parameters.
 *
 * The sort whitelist means a tampered URL can never order by a column the UI
 * does not offer. The secondary id sort keeps ties stable between reloads.
 */
async function paginatedUsers(
  params: TableParams,
  roles?: SystemRole[]
): Promise<UsersPage> {
  const filters = buildFilters(params, roles)
  const where = filters.length > 0 ? and(...filters) : undefined

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(user)
    .where(where)

  const totalPages = Math.max(1, Math.ceil(count / params.size))
  const page = Math.min(params.page, totalPages)
  const column = SORT_COLUMNS[params.sort]
  const order = params.order === "asc" ? asc : desc

  const items = await db
    .select(LIST_PROJECTION)
    .from(user)
    .where(where)
    .orderBy(order(column), desc(user.id))
    .limit(params.size)
    .offset((page - 1) * params.size)

  return {
    items: items as UserListItem[],
    total: count,
    page,
    pageSize: params.size,
    totalPages,
  }
}

export async function listUsersPage(params: TableParams): Promise<UsersPage> {
  return paginatedUsers(params)
}

export async function listAdminRosterPage(
  params: TableParams
): Promise<UsersPage> {
  return paginatedUsers(params, [APP_ROLES.ADMIN, APP_ROLES.SUPER_ADMIN])
}
