import { and, desc, eq, ilike, or, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import {
  attempt,
  examPackage,
  examSchedule,
  participantGroup,
  participantGroupMember,
  user,
} from "@/lib/db/schema"
import { eligibleParticipantConditions } from "@/lib/eligibility/queries"
import { calculateAttemptDurationMinutes } from "@/lib/reports/individual-stats"
import { isPassing } from "@/lib/scoring/scoring"

import {
  calculateGroupBreakdowns,
  calculateSessionKPIs,
} from "./session-stats"
import type {
  SessionAttendanceRow,
  SessionReportDetail,
  SessionReportSummaryItem,
  SessionSubmissionType,
} from "./session-types"

/**
 * Lists all exam schedules with summary attendance metrics.
 */
export async function listSessionReportSummaries(
  search?: string
): Promise<SessionReportSummaryItem[]> {
  const whereClause = search
    ? or(
        ilike(examSchedule.name, `%${search}%`),
        ilike(examPackage.name, `%${search}%`)
      )
    : undefined

  const schedules = await db
    .select({
      scheduleId: examSchedule.id,
      name: examSchedule.name,
      slug: examSchedule.slug,
      packageName: examPackage.name,
      startsAt: examSchedule.startsAt,
      endsAt: examSchedule.endsAt,
      durationMinutes: examSchedule.durationMinutes,
    })
    .from(examSchedule)
    .innerJoin(examPackage, eq(examPackage.id, examSchedule.packageId))
    .where(whereClause)
    .orderBy(desc(examSchedule.startsAt))

  if (schedules.length === 0) {
    return []
  }

  // Aggregate stats per schedule
  const results: SessionReportSummaryItem[] = []

  for (const s of schedules) {
    // 1. Eligible count
    const [eligibleRow] = await db
      .select({ count: sql<number>`count(distinct ${user.id})::int` })
      .from(user)
      .where(and(...eligibleParticipantConditions(s.scheduleId)))

    const eligibleCount = eligibleRow?.count ?? 0

    // 2. Attempts counts (present and completed)
    const [attemptsRow] = await db
      .select({
        presentCount: sql<number>`count(${attempt.id})::int`,
        completedCount: sql<number>`count(case when ${attempt.submittedAt} is not null then 1 end)::int`,
      })
      .from(attempt)
      .where(eq(attempt.scheduleId, s.scheduleId))

    const presentCount = attemptsRow?.presentCount ?? 0
    const completedCount = attemptsRow?.completedCount ?? 0

    const attendanceRate =
      eligibleCount > 0
        ? Math.round((presentCount / eligibleCount) * 1000) / 10
        : 0

    results.push({
      scheduleId: s.scheduleId,
      name: s.name,
      slug: s.slug,
      packageName: s.packageName,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      durationMinutes: s.durationMinutes,
      eligibleCount,
      presentCount,
      completedCount,
      attendanceRate,
    })
  }

  return results
}

/**
 * Retrieves detailed session report including attendance roster and KPI breakdown.
 */
export async function getSessionReportDetail(
  slugOrId: string
): Promise<SessionReportDetail | null> {
  // 1. Resolve schedule
  const [scheduleRow] = await db
    .select({
      scheduleId: examSchedule.id,
      scheduleName: examSchedule.name,
      scheduleSlug: examSchedule.slug,
      packageName: examPackage.name,
      startsAt: examSchedule.startsAt,
      endsAt: examSchedule.endsAt,
      durationMinutes: examSchedule.durationMinutes,
      passScore: examPackage.passScore,
    })
    .from(examSchedule)
    .innerJoin(examPackage, eq(examPackage.id, examSchedule.packageId))
    .where(
      or(eq(examSchedule.slug, slugOrId), eq(examSchedule.id, slugOrId))
    )
    .limit(1)

  if (!scheduleRow) {
    return null
  }

  const numericPassScore =
    scheduleRow.passScore !== null ? Number(scheduleRow.passScore) : null

  // 2. Query eligible participants
  const eligibleUsers = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      nisn: user.nisn,
      nis: user.nis,
      nip: user.nip,
      groupName: participantGroup.name,
    })
    .from(user)
    .leftJoin(
      participantGroupMember,
      eq(participantGroupMember.userId, user.id)
    )
    .leftJoin(
      participantGroup,
      eq(participantGroup.id, participantGroupMember.groupId)
    )
    .where(and(...eligibleParticipantConditions(scheduleRow.scheduleId)))
    .orderBy(user.name)

  // Deduplicate users in case of multiple group memberships
  const uniqueUsers = new Map<
    string,
    {
      id: string
      name: string
      email: string
      nisn: number | null
      nis: string | null
      nip: string | null
      groupName: string | null
    }
  >()

  for (const u of eligibleUsers) {
    if (!uniqueUsers.has(u.id)) {
      uniqueUsers.set(u.id, u)
    }
  }

  // 3. Query all attempts for this schedule
  const attempts = await db
    .select({
      id: attempt.id,
      participantId: attempt.participantId,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      submissionType: attempt.submissionType,
      score: attempt.score,
    })
    .from(attempt)
    .where(eq(attempt.scheduleId, scheduleRow.scheduleId))

  const attemptsByParticipant = new Map<string, (typeof attempts)[number]>()
  for (const a of attempts) {
    attemptsByParticipant.set(a.participantId, a)
  }

  // 4. Construct attendance roster
  const roster: SessionAttendanceRow[] = []

  for (const u of uniqueUsers.values()) {
    const att = attemptsByParticipant.get(u.id)

    if (att && att.submittedAt) {
      const numericScore = att.score !== null ? Number(att.score) : null

      roster.push({
        userId: u.id,
        name: u.name,
        email: u.email,
        nisn: u.nisn !== null ? String(u.nisn) : null,
        nis: u.nis,
        nip: u.nip,
        groupName: u.groupName,
        status: "completed",
        startedAt: att.startedAt,
        submittedAt: att.submittedAt,
        durationMinutes: calculateAttemptDurationMinutes(
          att.startedAt,
          att.submittedAt
        ),
        submissionType:
          (att.submissionType as SessionSubmissionType) || "participant",
        score: numericScore,
        passing:
          numericScore !== null
            ? isPassing(numericScore, numericPassScore)
            : null,
      })
    } else if (att) {
      roster.push({
        userId: u.id,
        name: u.name,
        email: u.email,
        nisn: u.nisn !== null ? String(u.nisn) : null,
        nis: u.nis,
        nip: u.nip,
        groupName: u.groupName,
        status: "in_progress",
        startedAt: att.startedAt,
        submittedAt: null,
        durationMinutes: null,
        submissionType: null,
        score: null,
        passing: null,
      })
    } else {
      roster.push({
        userId: u.id,
        name: u.name,
        email: u.email,
        nisn: u.nisn !== null ? String(u.nisn) : null,
        nis: u.nis,
        nip: u.nip,
        groupName: u.groupName,
        status: "absent",
        startedAt: null,
        submittedAt: null,
        durationMinutes: null,
        submissionType: null,
        score: null,
        passing: null,
      })
    }
  }

  // 5. Calculate KPIs and Group breakdowns
  const kpi = calculateSessionKPIs(roster)
  const groups = calculateGroupBreakdowns(roster)

  return {
    scheduleId: scheduleRow.scheduleId,
    scheduleName: scheduleRow.scheduleName,
    scheduleSlug: scheduleRow.scheduleSlug,
    packageName: scheduleRow.packageName,
    startsAt: scheduleRow.startsAt,
    endsAt: scheduleRow.endsAt,
    durationMinutes: scheduleRow.durationMinutes,
    passScore: numericPassScore,
    kpi,
    groups,
    roster,
  }
}
