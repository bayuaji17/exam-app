import {
  getExamPackageById,
  getExamPackageBySlug as resolveExamPackageSlug,
} from "@/lib/exam-packages/queries"
import {
  getExamScheduleById,
  getExamScheduleBySlug as resolveExamScheduleSlug,
} from "@/lib/exam-schedules/queries"
import {
  getParticipantGroupById,
  getParticipantGroupBySlug as resolveParticipantGroupSlug,
} from "@/lib/participants/queries"
import {
  getQuestionBankById,
  getQuestionBankBySlug as resolveQuestionBankSlug,
} from "@/lib/question-banks/queries"

export interface QuestionBankSlugDetail {
  id: string
  name: string
  slug: string
  description: string | null
  createdAt: Date
  archivedAt: Date | null
  updatedAt: Date
}

export interface ParticipantGroupSlugDetail {
  id: string
  name: string
  slug: string
  description: string | null
  createdAt: Date
  updatedAt: Date
  memberCount?: number
}

export interface ExamPackageSlugDetail {
  id: string
  name: string
  kodePaket: string
  slug: string
  description: string | null
  durationMinutes: number | null
  shuffle: boolean
  passScore: string | null
  wrongPenalty: string | null
  createdAt: Date
  updatedAt: Date
  questionCount: number
}

export interface ExamScheduleSlugDetail {
  id: string
  name: string
  slug: string
  packageId: string
  packageName: string
  startsAt: Date
  endsAt: Date
  durationMinutes: number | null
  attemptLimit: number | null
  introduction: Record<string, unknown> | null
  createdAt: Date
}

// ---------------------------------------------------------------------------
// Mock Data Generators for NEXT_PUBLIC_USE_MOCK
// ---------------------------------------------------------------------------

function createMockQuestionBank(slug: string): QuestionBankSlugDetail {
  return {
    id: `mock-bank-${slug}`,
    name: slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
    slug,
    description: `Mock description for ${slug}`,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    archivedAt: null,
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  }
}

function createMockParticipantGroup(slug: string): ParticipantGroupSlugDetail {
  return {
    id: `mock-group-${slug}`,
    name: slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
    slug,
    description: `Mock group description for ${slug}`,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    memberCount: 5,
  }
}

function createMockExamPackage(slug: string): ExamPackageSlugDetail {
  return {
    id: `mock-package-${slug}`,
    name: slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
    kodePaket: `PKG-${slug.slice(0, 5).toUpperCase()}`,
    slug,
    description: `Mock package description for ${slug}`,
    durationMinutes: 90,
    shuffle: true,
    passScore: "70.00",
    wrongPenalty: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    questionCount: 20,
  }
}

function createMockExamSchedule(slug: string): ExamScheduleSlugDetail {
  return {
    id: `mock-schedule-${slug}`,
    name: slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
    slug,
    packageId: "mock-package-id",
    packageName: "Mock Package",
    startsAt: new Date(Date.now() - 3600 * 1000),
    endsAt: new Date(Date.now() + 3600 * 1000 * 24),
    durationMinutes: 90,
    attemptLimit: 1,
    introduction: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
  }
}

// ---------------------------------------------------------------------------
// Resolution Functions
// ---------------------------------------------------------------------------

export async function getQuestionBankBySlug(
  slugOrId: string
): Promise<QuestionBankSlugDetail | null> {
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
    return createMockQuestionBank(slugOrId)
  }

  // Legacy id URLs resolve directly; otherwise the param is a real slug.
  const byId = await getQuestionBankById(slugOrId)
  if (byId) {
    return byId as QuestionBankSlugDetail
  }

  return resolveQuestionBankSlug(slugOrId)
}

export async function getParticipantGroupBySlug(
  slugOrId: string
): Promise<ParticipantGroupSlugDetail | null> {
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
    return createMockParticipantGroup(slugOrId)
  }

  // Legacy id URLs resolve directly; otherwise the param is a real slug.
  const byId = await getParticipantGroupById(slugOrId)
  if (byId) {
    return byId as ParticipantGroupSlugDetail
  }

  return resolveParticipantGroupSlug(slugOrId)
}

export async function getExamPackageBySlug(
  slugOrId: string
): Promise<ExamPackageSlugDetail | null> {
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
    return createMockExamPackage(slugOrId)
  }

  // Legacy id URLs resolve directly; otherwise the param is a real slug.
  const byId = await getExamPackageById(slugOrId)
  if (byId) {
    return { ...byId, questionCount: 0 }
  }

  const bySlug = await resolveExamPackageSlug(slugOrId)
  return bySlug ? { ...bySlug, questionCount: 0 } : null
}

export async function getExamScheduleBySlug(
  slugOrId: string
): Promise<ExamScheduleSlugDetail | null> {
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
    return createMockExamSchedule(slugOrId)
  }

  // Legacy id URLs resolve directly; otherwise the param is a real slug.
  const byId = await getExamScheduleById(slugOrId)
  if (byId) {
    return byId as ExamScheduleSlugDetail
  }

  return resolveExamScheduleSlug(slugOrId)
}
