export interface StudentProfile {
  id: string
  name: string
  email: string
  nisn: string | null
  nis: string | null
  nip: string | null
}

export interface CategoryCompetency {
  categoryId: string
  categoryName: string
  earnedPoints: number
  maxPoints: number
  percentage: number
  totalQuestions: number
  correctQuestions: number
}

export interface ItemizedQuestionResult {
  position: number
  questionId: string
  categoryId: string | null
  categoryName: string
  type: string
  promptText: string
  studentAnswerText: string
  isCorrect: boolean | null
  pointsAwarded: number | null
  maxPoints: number
}

export interface StudentTranscriptReport {
  attemptId: string
  scheduleId: string
  scheduleTitle: string
  scheduleSlug: string
  packageTitle: string
  kodePaket: string
  nomorPeserta: string | null
  student: StudentProfile
  startedAt: Date
  submittedAt: Date | null
  durationMinutes: number | null
  finalScore: number | null
  maxTotalPoints: number
  passScore: number | null
  passing: boolean | null
  fullyGraded: boolean
  competencies: CategoryCompetency[]
  questions: ItemizedQuestionResult[]
}

export interface IndividualReportParticipantRow {
  attemptId: string
  participantId: string
  participantName: string
  participantEmail: string
  identifierNisn: string | null
  identifierNis: string | null
  identifierNip: string | null
  scheduleId: string
  scheduleTitle: string
  scheduleSlug: string
  nomorPeserta: string | null
  score: number | null
  fullyGraded: boolean
  passing: boolean | null
  submittedAt: Date | null
}
