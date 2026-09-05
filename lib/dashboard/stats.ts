import { asc, sql } from "drizzle-orm"
import { cacheLife, cacheTag } from "next/cache"

import { CACHE_TAGS } from "@/lib/cache-tags"
import { db } from "@/lib/db"
import {
  attempt,
  examPackage,
  examSchedule,
  question,
  questionBank,
  user,
} from "@/lib/db/schema"

export interface DashboardStats {
  banks: number
  questions: number
  packages: number
  schedules: number
  attempts: number
  users: number
}

/**
 * The admin overview counts, fetched as one batched query.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  "use cache"
  cacheTag(CACHE_TAGS.DASHBOARD_STATS)
  cacheLife("minutes")

  const [banks, questions, packages, schedules, attempts, users] =
    await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(questionBank),
      db.select({ count: sql<number>`count(*)::int` }).from(question),
      db.select({ count: sql<number>`count(*)::int` }).from(examPackage),
      db.select({ count: sql<number>`count(*)::int` }).from(examSchedule),
      db.select({ count: sql<number>`count(*)::int` }).from(attempt),
      db.select({ count: sql<number>`count(*)::int` }).from(user),
    ])

  return {
    banks: banks[0]?.count ?? 0,
    questions: questions[0]?.count ?? 0,
    packages: packages[0]?.count ?? 0,
    schedules: schedules[0]?.count ?? 0,
    attempts: attempts[0]?.count ?? 0,
    users: users[0]?.count ?? 0,
  }
}

export interface UpcomingSchedule {
  id: string
  name: string
  startsAt: Date
}

/**
 * The next schedules to start, for the overview list.
 */
export async function listUpcomingSchedules(
  limit = 5
): Promise<UpcomingSchedule[]> {
  return db
    .select({
      id: examSchedule.id,
      name: examSchedule.name,
      startsAt: examSchedule.startsAt,
    })
    .from(examSchedule)
    .where(sql`${examSchedule.startsAt} > now()`)
    .orderBy(asc(examSchedule.startsAt))
    .limit(limit)
}
