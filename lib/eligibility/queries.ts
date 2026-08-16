import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm"
import type { AnyColumn } from "drizzle-orm/column"

import { APP_ROLES } from "@/lib/auth-roles"
import { db } from "@/lib/db"
import {
  examSchedule,
  participantGroup,
  participantGroupMember,
  scheduleGroupEligibility,
  scheduleUserEligibility,
  user,
} from "@/lib/db/schema"
import type { SortColumn, TableParams } from "./table-params"

/**
 * The eligibility invariant, as SQL conditions against the user table:
 * the account is a non-banned `user`-role participant, and it is either
 * granted directly or a member of a granted group.
 *
 * Single source for both the attempt gate (`isUserEligibleForSchedule`)
 * and the admin preview list, so the two cannot drift.
 */
export function eligibleParticipantConditions(scheduleId: string): SQL[] {
  const directlyGranted = sql`exists (select 1 from ${scheduleUserEligibility} where ${scheduleUserEligibility.scheduleId} = ${scheduleId} and ${scheduleUserEligibility.userId} = ${user.id})`
  const grantedViaGroup = sql`exists (select 1 from ${scheduleGroupEligibility} inner join ${participantGroupMember} on ${participantGroupMember.groupId} = ${scheduleGroupEligibility.groupId} where ${scheduleGroupEligibility.scheduleId} = ${scheduleId} and ${participantGroupMember.userId} = ${user.id})`

  return [
    eq(user.role, APP_ROLES.USER),
    eq(user.banned, false),
    or(directlyGranted, grantedViaGroup)!,
  ]
}

/**
 * The single eligibility check the attempt slice (v0.8) will use as its
 * gate. Default deny: no grants means false for everyone.
 */
export async function isUserEligibleForSchedule(
  userId: string,
  scheduleId: string
): Promise<boolean> {
  const [row] = await db
    .select({ id: user.id })
    .from(user)
    .where(and(eq(user.id, userId), ...eligibleParticipantConditions(scheduleId)))
    .limit(1)

  return Boolean(row)
}

export interface EligibleParticipantListItem {
  id: string
  name: string
  email: string
  createdAt: Date
}

export interface EligibleParticipantsPage {
  items: EligibleParticipantListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const SORT_COLUMNS: Record<SortColumn, AnyColumn> = {
  name: user.name,
  createdAt: user.createdAt,
}

/**
 * One page of the computed eligible list for a schedule — the union of
 * direct grants and granted-group memberships, excluding banned accounts.
 */
export async function listEligibleParticipantsPage(
  scheduleId: string,
  params: TableParams
): Promise<EligibleParticipantsPage> {
  const filters: SQL[] = [...eligibleParticipantConditions(scheduleId)]

  if (params.q) {
    const pattern = `%${params.q}%`
    filters.push(or(ilike(user.name, pattern), ilike(user.email, pattern))!)
  }

  const where = and(...filters)

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(user)
    .where(where)

  const totalPages = Math.max(1, Math.ceil(count / params.size))
  const page = Math.min(params.page, totalPages)
  const column = SORT_COLUMNS[params.sort]
  const order = params.order === "asc" ? asc : desc

  const rows = await db
    .select({ id: user.id, name: user.name, email: user.email, createdAt: user.createdAt })
    .from(user)
    .where(where)
    .orderBy(order(column), desc(user.id))
    .limit(params.size)
    .offset((page - 1) * params.size)

  return {
    items: rows as EligibleParticipantListItem[],
    total: count,
    page,
    pageSize: params.size,
    totalPages,
  }
}

export interface GrantedUser {
  id: string
  name: string
  email: string
}

/**
 * The users directly granted access to a schedule.
 */
export async function listGrantedUsers(scheduleId: string): Promise<GrantedUser[]> {
  return db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(scheduleUserEligibility)
    .innerJoin(user, eq(scheduleUserEligibility.userId, user.id))
    .where(eq(scheduleUserEligibility.scheduleId, scheduleId))
    .orderBy(asc(user.name), asc(user.id))
}

export interface GrantedGroup {
  id: string
  name: string
  memberCount: number
}

/**
 * Member counts for a set of group ids.
 *
 * Drizzle renders columns interpolated inside `sql` fragments bare in
 * SELECT position (`where "groupId" = "id"`), which resolves against the
 * subquery's own table and silently yields zero. Fetching the counts as a
 * separate query and merging in JS avoids the correlated subquery entirely.
 */
async function memberCountsFor(
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
 * The groups granted access to a schedule, with their member counts.
 */
export async function listGrantedGroups(scheduleId: string): Promise<GrantedGroup[]> {
  const rows = await db
    .select({
      id: participantGroup.id,
      name: participantGroup.name,
    })
    .from(scheduleGroupEligibility)
    .innerJoin(
      participantGroup,
      eq(scheduleGroupEligibility.groupId, participantGroup.id)
    )
    .where(eq(scheduleGroupEligibility.scheduleId, scheduleId))
    .orderBy(asc(participantGroup.name), asc(participantGroup.id))

  const counts = await memberCountsFor(rows.map((row) => row.id))

  return rows.map((row) => ({
    ...row,
    memberCount: counts.get(row.id) ?? 0,
  }))
}

export type EligibleCandidate = GrantedUser

/**
 * Participants available to grant directly: role `user`, not banned, not
 * already granted. Newest first.
 */
export async function listGrantableUsers(
  scheduleId: string
): Promise<EligibleCandidate[]> {
  return db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(
      and(
        eq(user.role, APP_ROLES.USER),
        eq(user.banned, false),
        sql`not exists (select 1 from ${scheduleUserEligibility} where ${scheduleUserEligibility.scheduleId} = ${scheduleId} and ${scheduleUserEligibility.userId} = ${user.id})`
      )
    )
    .orderBy(desc(user.createdAt), desc(user.id))
}

/**
 * Groups available to grant: every group not already granted to the
 * schedule. Name-sorted for stable pickers.
 */
export async function listGrantableGroups(
  scheduleId: string
): Promise<GrantedGroup[]> {
  const rows = await db
    .select({
      id: participantGroup.id,
      name: participantGroup.name,
    })
    .from(participantGroup)
    .where(
      sql`not exists (select 1 from ${scheduleGroupEligibility} where ${scheduleGroupEligibility.scheduleId} = ${scheduleId} and ${scheduleGroupEligibility.groupId} = ${participantGroup.id})`
    )
    .orderBy(asc(participantGroup.name), asc(participantGroup.id))

  const counts = await memberCountsFor(rows.map((row) => row.id))

  return rows.map((row) => ({
    ...row,
    memberCount: counts.get(row.id) ?? 0,
  }))
}

export interface ScheduleEligibilitySummaryItem {
  scheduleId: string
  scheduleName: string
  startsAt: Date
  endsAt: Date
  userGrants: number
  groupGrants: number
}

/**
 * Every schedule with its grant counts, for the access-rules hub.
 *
 * Counts come from per-schedule GROUP BY queries merged in JS: correlated
 * subqueries inside `sql` fragments render columns bare in SELECT position
 * and silently count zero.
 */
export async function listSchedulesWithEligibilitySummary(): Promise<
  ScheduleEligibilitySummaryItem[]
> {
  const [schedules, userCounts, groupCounts] = await Promise.all([
    db
      .select({
        scheduleId: examSchedule.id,
        scheduleName: examSchedule.name,
        startsAt: examSchedule.startsAt,
        endsAt: examSchedule.endsAt,
      })
      .from(examSchedule)
      .orderBy(desc(examSchedule.startsAt), desc(examSchedule.id)),
    db
      .select({
        scheduleId: scheduleUserEligibility.scheduleId,
        count: sql<number>`count(*)::int`,
      })
      .from(scheduleUserEligibility)
      .groupBy(scheduleUserEligibility.scheduleId),
    db
      .select({
        scheduleId: scheduleGroupEligibility.scheduleId,
        count: sql<number>`count(*)::int`,
      })
      .from(scheduleGroupEligibility)
      .groupBy(scheduleGroupEligibility.scheduleId),
  ])

  const userMap = new Map(userCounts.map((row) => [row.scheduleId, row.count]))
  const groupMap = new Map(groupCounts.map((row) => [row.scheduleId, row.count]))

  return schedules.map((schedule) => ({
    ...schedule,
    userGrants: userMap.get(schedule.scheduleId) ?? 0,
    groupGrants: groupMap.get(schedule.scheduleId) ?? 0,
  }))
}
