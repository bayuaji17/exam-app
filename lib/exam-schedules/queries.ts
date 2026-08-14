import { and, asc, desc, eq, ilike, sql, type SQL } from "drizzle-orm"
import type { AnyColumn } from "drizzle-orm/column"

import { db } from "@/lib/db"
import { examPackage, examSchedule } from "@/lib/db/schema"
import type { SortColumn, TableParams } from "./table-params"

export type ScheduleStatus = "upcoming" | "ongoing" | "ended"

/**
 * Derive the status from the window (no status column — timestamps are the
 * single source of truth).
 */
export function scheduleStatus(startsAt: Date, endsAt: Date, now: Date = new Date()): ScheduleStatus {
  if (now < startsAt) {
    return "upcoming"
  }

  if (now > endsAt) {
    return "ended"
  }

  return "ongoing"
}

export interface ExamScheduleListItem {
  id: string
  name: string
  packageId: string
  packageName: string
  startsAt: Date
  endsAt: Date
  durationMinutes: number | null
  status: ScheduleStatus
  createdAt: Date
}

export interface ExamScheduleDetail extends Omit<ExamScheduleListItem, "status"> {
  packageName: string
}

export interface ExamSchedulesPage {
  items: ExamScheduleListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const SORT_COLUMNS: Record<SortColumn, AnyColumn> = {
  name: examSchedule.name,
  startsAt: examSchedule.startsAt,
  createdAt: examSchedule.createdAt,
}

function buildFilters(params: TableParams, now: Date): SQL[] {
  const filters: SQL[] = []

  if (params.q) {
    filters.push(ilike(examSchedule.name, `%${params.q}%`))
  }

  if (params.status === "upcoming") {
    filters.push(sql`${examSchedule.startsAt} > ${now}`)
  }

  if (params.status === "ongoing") {
    filters.push(
      sql`${examSchedule.startsAt} <= ${now} and ${examSchedule.endsAt} >= ${now}`
    )
  }

  if (params.status === "ended") {
    filters.push(sql`${examSchedule.endsAt} < ${now}`)
  }

  return filters
}

export async function listExamSchedulesPage(
  params: TableParams
): Promise<ExamSchedulesPage> {
  const now = new Date()
  const filters = buildFilters(params, now)
  const where = filters.length > 0 ? and(...filters) : undefined

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(examSchedule)
    .where(where)

  const totalPages = Math.max(1, Math.ceil(count / params.size))
  const page = Math.min(params.page, totalPages)
  const column = SORT_COLUMNS[params.sort]
  const order = params.order === "asc" ? asc : desc

  const rows = await db
    .select({
      id: examSchedule.id,
      name: examSchedule.name,
      packageId: examSchedule.packageId,
      packageName: examPackage.name,
      startsAt: examSchedule.startsAt,
      endsAt: examSchedule.endsAt,
      durationMinutes: examSchedule.durationMinutes,
      createdAt: examSchedule.createdAt,
    })
    .from(examSchedule)
    .innerJoin(examPackage, eq(examSchedule.packageId, examPackage.id))
    .where(where)
    .orderBy(order(column), desc(examSchedule.id))
    .limit(params.size)
    .offset((page - 1) * params.size)

  return {
    items: rows.map((row) => ({
      ...row,
      status: scheduleStatus(row.startsAt, row.endsAt, now),
    })) as ExamScheduleListItem[],
    total: count,
    page,
    pageSize: params.size,
    totalPages,
  }
}

export async function getExamScheduleById(
  id: string
): Promise<ExamScheduleDetail | null> {
  const [row] = await db
    .select({
      id: examSchedule.id,
      name: examSchedule.name,
      packageId: examSchedule.packageId,
      packageName: examPackage.name,
      startsAt: examSchedule.startsAt,
      endsAt: examSchedule.endsAt,
      durationMinutes: examSchedule.durationMinutes,
      createdAt: examSchedule.createdAt,
    })
    .from(examSchedule)
    .innerJoin(examPackage, eq(examSchedule.packageId, examPackage.id))
    .where(eq(examSchedule.id, id))
    .limit(1)

  return (row as ExamScheduleDetail | undefined) ?? null
}
