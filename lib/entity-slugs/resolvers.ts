import { slugify } from "@/lib/slugs"
import { getExamPackageById, listExamPackagesPage } from "@/lib/exam-packages/queries"
import { getExamScheduleById, listExamSchedulesPage } from "@/lib/exam-schedules/queries"
import {
  getParticipantGroupById,
  listParticipantGroupsPage,
} from "@/lib/participants/queries"
import {
  getQuestionBankById,
  listQuestionBanksPage,
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

  // 1. Try resolving directly by ID if it exists
  const byId = await getQuestionBankById(slugOrId)
  if (byId) {
    const slug = (byId as unknown as { slug?: string }).slug || slugify(byId.name)
    return { ...byId, slug }
  }

  // 2. Resolve by matching slug in the database
  const page = await listQuestionBanksPage({
    page: 1,
    size: 100,
    sort: "createdAt",
    order: "desc",
    q: "",
    status: undefined,
  })

  const matched = page.items.find(
    (item) =>
      ((item as unknown as { slug?: string }).slug &&
        (item as unknown as { slug?: string }).slug === slugOrId) ||
      slugify(item.name) === slugOrId ||
      item.id === slugOrId
  )

  if (!matched) {
    return null
  }

  const detail = await getQuestionBankById(matched.id)
  if (!detail) return null

  const slug = (detail as unknown as { slug?: string }).slug || slugify(detail.name)
  return { ...detail, slug }
}

export async function getParticipantGroupBySlug(
  slugOrId: string
): Promise<ParticipantGroupSlugDetail | null> {
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
    return createMockParticipantGroup(slugOrId)
  }

  const byId = await getParticipantGroupById(slugOrId)
  if (byId) {
    const slug = (byId as unknown as { slug?: string }).slug || slugify(byId.name)
    return { ...byId, slug }
  }

  const page = await listParticipantGroupsPage({
    page: 1,
    size: 100,
    sort: "createdAt",
    order: "desc",
    q: "",
  })

  const matched = page.items.find(
    (item) =>
      ((item as unknown as { slug?: string }).slug &&
        (item as unknown as { slug?: string }).slug === slugOrId) ||
      slugify(item.name) === slugOrId ||
      item.id === slugOrId
  )

  if (!matched) {
    return null
  }

  const detail = await getParticipantGroupById(matched.id)
  if (!detail) return null

  const slug = (detail as unknown as { slug?: string }).slug || slugify(detail.name)
  return { ...detail, slug }
}

export async function getExamPackageBySlug(
  slugOrId: string
): Promise<ExamPackageSlugDetail | null> {
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
    return createMockExamPackage(slugOrId)
  }

  const byId = await getExamPackageById(slugOrId)
  if (byId) {
    const slug = (byId as unknown as { slug?: string }).slug || slugify(byId.name)
    return { ...byId, slug, questionCount: 0 }
  }

  const page = await listExamPackagesPage({
    page: 1,
    size: 100,
    sort: "createdAt",
    order: "desc",
    q: "",
  })

  const matched = page.items.find(
    (item) =>
      ((item as unknown as { slug?: string }).slug &&
        (item as unknown as { slug?: string }).slug === slugOrId) ||
      slugify(item.name) === slugOrId ||
      item.id === slugOrId
  )

  if (!matched) {
    return null
  }

  const detail = await getExamPackageById(matched.id)
  if (!detail) return null

  const slug = (detail as unknown as { slug?: string }).slug || slugify(detail.name)
  return { ...detail, slug, questionCount: 0 }
}

export async function getExamScheduleBySlug(
  slugOrId: string
): Promise<ExamScheduleSlugDetail | null> {
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
    return createMockExamSchedule(slugOrId)
  }

  const byId = await getExamScheduleById(slugOrId)
  if (byId) {
    const slug = (byId as unknown as { slug?: string }).slug || slugify(byId.name)
    return { ...byId, slug }
  }

  const page = await listExamSchedulesPage({
    page: 1,
    size: 100,
    sort: "createdAt",
    order: "desc",
    q: "",
    status: undefined,
  })

  const matched = page.items.find(
    (item) =>
      ((item as unknown as { slug?: string }).slug &&
        (item as unknown as { slug?: string }).slug === slugOrId) ||
      slugify(item.name) === slugOrId ||
      item.id === slugOrId
  )

  if (!matched) {
    return null
  }

  const detail = await getExamScheduleById(matched.id)
  if (!detail) return null

  const slug = (detail as unknown as { slug?: string }).slug || slugify(detail.name)
  return { ...detail, slug }
}
