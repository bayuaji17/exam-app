export type SessionAttendanceStatus = "completed" | "in_progress" | "absent"

export type SessionSubmissionType = "participant" | "system" | null

export interface SessionAttendanceRow {
  userId: string
  name: string
  email: string
  nisn: string | null
  nis: string | null
  nip: string | null
  groupName: string | null
  status: SessionAttendanceStatus
  startedAt: Date | null
  submittedAt: Date | null
  durationMinutes: number | null
  submissionType: SessionSubmissionType
  score: number | null
  passing: boolean | null
}

export interface SessionKPIStats {
  eligibleCount: number
  presentCount: number
  completedCount: number
  inProgressCount: number
  absentCount: number
  attendanceRate: number
  completionRate: number
  manualSubmitCount: number
  autoSubmitCount: number
}

export interface SessionGroupBreakdown {
  groupName: string
  eligibleCount: number
  presentCount: number
  completedCount: number
  attendanceRate: number
  averageScore: number | null
  passRate: number | null
}

export interface SessionReportDetail {
  scheduleId: string
  scheduleName: string
  scheduleSlug: string
  packageName: string
  startsAt: Date
  endsAt: Date
  durationMinutes: number | null
  passScore: number | null
  kpi: SessionKPIStats
  groups: SessionGroupBreakdown[]
  roster: SessionAttendanceRow[]
}

export interface SessionReportSummaryItem {
  scheduleId: string
  name: string
  slug: string
  packageName: string
  startsAt: Date
  endsAt: Date
  durationMinutes: number | null
  eligibleCount: number
  presentCount: number
  completedCount: number
  attendanceRate: number
}
