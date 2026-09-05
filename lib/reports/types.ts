export interface ScoreDistributionBucket {
  range: string
  min: number
  max: number
  count: number
  percentage: number
}

export interface ScheduleStatistics {
  totalParticipantsEligible: number
  totalAttemptsStarted: number
  totalAttemptsSubmitted: number
  totalFullyGraded: number
  passingCount: number
  failingCount: number
  passingRate: number
  averageScore: number
  medianScore: number
  highestScore: number
  lowestScore: number
  standardDeviation: number
  distribution: ScoreDistributionBucket[]
}

export interface RawAttemptScoreInput {
  attemptId: string
  score: number | string | null
  submittedAt: Date | null
  fullyGraded: boolean
}

export interface RawStatsInput {
  totalEligible: number
  attempts: RawAttemptScoreInput[]
  passScore: number | null
}

export interface ScheduleReportParticipantItem {
  attemptId: string
  participantId: string
  participantName: string
  participantEmail: string
  identifierNisn: string | null
  identifierNis: string | null
  identifierNip: string | null
  submittedAt: Date | null
  score: number | null
  fullyGraded: boolean
  passing: boolean | null
}

export interface ScheduleReportSummary {
  scheduleId: string
  scheduleTitle: string
  scheduleSlug: string
  packageTitle: string
  passScore: number | null
  totalPoints: number
  stats: ScheduleStatistics
  participants: ScheduleReportParticipantItem[]
}

export interface ReportScheduleHubItem {
  scheduleId: string
  scheduleTitle: string
  scheduleSlug: string
  packageTitle: string
  totalAttempts: number
  submittedAttempts: number
  fullyGradedAttempts: number
  averageScore: number
  passingRate: number
}
