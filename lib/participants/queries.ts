import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  ne,
  notExists,
  or,
  sql,
  type SQL,
} from "drizzle-orm"
import type { AnyColumn } from "drizzle-orm/column"

import { APP_ROLES } from "@/lib/auth-roles"
import { db } from "@/lib/db"
import { participantGroup, participantGroupMember, user } from "@/lib/db/schema"
import type { SortColumn, TableParams } from "./table-params"

export interface ParticipantGroupListItem {
  id: string
  name: string
  slug: string
  description: string | null
  memberCount: number
  createdAt: Date
}

export interface ParticipantGroupDetail {
  id: string
  name: string
  slug: string
  description: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ParticipantGroupsPage {
  items: ParticipantGroupListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const GROUP_SORT_COLUMNS: Record<SortColumn, AnyColumn> = {
  name: participantGroup.name,
  createdAt: participantGroup.createdAt,
}

function buildGroupFilters(params: TableParams): SQL[] {
  const filters: SQL[] = []

  if (params.q) {
    filters.push(ilike(participantGroup.name, `%${params.q}%`))
  }

  return filters
}

/**
 * Member counts per group, for merging into list queries.
 *
 * Drizzle renders columns interpolated inside `sql` fragments bare in
 * SELECT position (`where "groupId" = "id"`), which resolves against the
 * subquery's own table and silently yields zero. Fetching the counts as a
 * separate query and merging in JS avoids the correlated subquery entirely.
 */
async function memberCountByGroup(
  groupIds: string[]
): Promise<Map<string, number>> {
  if (groupIds.length === 0) {
    return new Map()
  }

  const rows = await db
    .select({
      groupId: participantGroupMember.groupId,
      count: sql<number>`count(*)::int`,
    })
    .from(participantGroupMember)
    .where(inArray(participantGroupMember.groupId, groupIds))
    .groupBy(participantGroupMember.groupId)

  return new Map(rows.map((row) => [row.groupId, row.count]))
}

/**
 * One page of participant groups, each with its member count.
 */
export async function listParticipantGroupsPage(
  params: TableParams
): Promise<ParticipantGroupsPage> {
  const filters = buildGroupFilters(params)
  const where = filters.length > 0 ? and(...filters) : undefined

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(participantGroup)
    .where(where)

  const totalPages = Math.max(1, Math.ceil(count / params.size))
  const page = Math.min(params.page, totalPages)
  const column = GROUP_SORT_COLUMNS[params.sort]
  const order = params.order === "asc" ? asc : desc

  const rows = await db
    .select({
      id: participantGroup.id,
      name: participantGroup.name,
      slug: participantGroup.slug,
      description: participantGroup.description,
      createdAt: participantGroup.createdAt,
    })
    .from(participantGroup)
    .where(where)
    .orderBy(order(column), desc(participantGroup.id))
    .limit(params.size)
    .offset((page - 1) * params.size)

  const counts = await memberCountByGroup(rows.map((row) => row.id))

  return {
    items: rows.map((row) => ({
      ...row,
      memberCount: counts.get(row.id) ?? 0,
    })) as ParticipantGroupListItem[],
    total: count,
    page,
    pageSize: params.size,
    totalPages,
  }
}

export async function getParticipantGroupById(
  id: string
): Promise<ParticipantGroupDetail | null> {
  const [row] = await db
    .select({
      id: participantGroup.id,
      name: participantGroup.name,
      slug: participantGroup.slug,
      description: participantGroup.description,
      createdAt: participantGroup.createdAt,
      updatedAt: participantGroup.updatedAt,
    })
    .from(participantGroup)
    .where(eq(participantGroup.id, id))
    .limit(1)

  return row ?? null
}

/**
 * One group by its URL slug, same shape as `getParticipantGroupById`.
 */
export async function getParticipantGroupBySlug(
  slug: string
): Promise<ParticipantGroupDetail | null> {
  const [row] = await db
    .select({
      id: participantGroup.id,
      name: participantGroup.name,
      slug: participantGroup.slug,
      description: participantGroup.description,
      createdAt: participantGroup.createdAt,
      updatedAt: participantGroup.updatedAt,
    })
    .from(participantGroup)
    .where(eq(participantGroup.slug, slug))
    .limit(1)

  return row ?? null
}

/**
 * Whether a slug is already in use, optionally excluding one row (the one
 * being renamed) so re-applying the current name never dedups against itself.
 */
export async function participantGroupSlugTaken(
  slug: string,
  excludeId?: string
): Promise<boolean> {
  const [row] = await db
    .select({ id: participantGroup.id })
    .from(participantGroup)
    .where(
      and(
        eq(participantGroup.slug, slug),
        excludeId ? ne(participantGroup.id, excludeId) : undefined
      )
    )
    .limit(1)

  return Boolean(row)
}

/**
 * Case-insensitive name check for create/edit, excluding the row being
 * edited so a rename to the current name is not reported as taken.
 */
export async function groupNameTaken(
  name: string,
  excludeId?: string
): Promise<boolean> {
  const [row] = await db
    .select({ id: participantGroup.id })
    .from(participantGroup)
    .where(sql`lower(${participantGroup.name}) = lower(${name})`)
    .limit(1)

  return Boolean(row && row.id !== excludeId)
}

export interface GroupMemberListItem {
  id: string
  userId: string
  name: string
  email: string
  /** When the participant joined the group. */
  createdAt: Date
}

export interface GroupMembersPage {
  items: GroupMemberListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const MEMBER_SORT_COLUMNS: Record<SortColumn, AnyColumn> = {
  name: user.name,
  createdAt: participantGroupMember.createdAt,
}

function buildMemberFilters(groupId: string, params: TableParams): SQL[] {
  const filters: SQL[] = [eq(participantGroupMember.groupId, groupId)]

  if (params.q) {
    const pattern = `%${params.q}%`
    filters.push(or(ilike(user.name, pattern), ilike(user.email, pattern))!)
  }

  return filters
}

/**
 * One page of a group's members, searchable by name or email.
 */
export async function listGroupMembersPage(
  groupId: string,
  params: TableParams
): Promise<GroupMembersPage> {
  const filters = buildMemberFilters(groupId, params)
  const where = and(...filters)

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(participantGroupMember)
    .innerJoin(user, eq(participantGroupMember.userId, user.id))
    .where(where)

  const totalPages = Math.max(1, Math.ceil(count / params.size))
  const page = Math.min(params.page, totalPages)
  const column = MEMBER_SORT_COLUMNS[params.sort]
  const order = params.order === "asc" ? asc : desc

  const rows = await db
    .select({
      id: participantGroupMember.id,
      userId: participantGroupMember.userId,
      name: user.name,
      email: user.email,
      createdAt: participantGroupMember.createdAt,
    })
    .from(participantGroupMember)
    .innerJoin(user, eq(participantGroupMember.userId, user.id))
    .where(where)
    .orderBy(order(column), desc(participantGroupMember.id))
    .limit(params.size)
    .offset((page - 1) * params.size)

  return {
    items: rows as GroupMemberListItem[],
    total: count,
    page,
    pageSize: params.size,
    totalPages,
  }
}

export interface ParticipantCandidate {
  id: string
  name: string
  email: string
}

/**
 * Participants available to add to a group: role `user`, not banned, not
 * already a member. Newest first.
 */
export async function listGroupCandidates(
  groupId: string
): Promise<ParticipantCandidate[]> {
  return db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(
      and(
        eq(user.role, APP_ROLES.USER),
        eq(user.banned, false),
        notExists(
          db
            .select({ id: participantGroupMember.id })
            .from(participantGroupMember)
            .where(
              and(
                eq(participantGroupMember.groupId, groupId),
                eq(participantGroupMember.userId, user.id)
              )
            )
        )
      )
    )
    .orderBy(desc(user.createdAt), desc(user.id))
}
