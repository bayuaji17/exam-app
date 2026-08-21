import { and, asc, desc, eq, ilike, inArray, ne, sql, type SQL } from "drizzle-orm"
import type { AnyColumn } from "drizzle-orm/column"

import { db } from "@/lib/db"
import { examPackage, examQuestion, question, questionBank } from "@/lib/db/schema"
import type { SortColumn, TableParams } from "./table-params"

/**
 * A package as the management list renders one.
 */
export interface ExamPackageListItem {
  id: string
  name: string
  slug: string
  description: string | null
  durationMinutes: number | null
  shuffle: boolean
  passScore: string | null
  wrongPenalty: string | null
  createdAt: Date
  questionCount: number
}

export interface ExamPackageDetail extends Omit<ExamPackageListItem, "questionCount"> {
  updatedAt: Date
  wrongPenalty: string | null
}

export interface ExamPackagesPage {
  items: ExamPackageListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const LIST_PROJECTION = {
  id: examPackage.id,
  name: examPackage.name,
  slug: examPackage.slug,
  description: examPackage.description,
  durationMinutes: examPackage.durationMinutes,
  shuffle: examPackage.shuffle,
  passScore: examPackage.passScore,
  wrongPenalty: examPackage.wrongPenalty,
  createdAt: examPackage.createdAt,
}

const SORT_COLUMNS: Record<SortColumn, AnyColumn> = {
  name: examPackage.name,
  createdAt: examPackage.createdAt,
}

function buildFilters(params: TableParams): SQL[] {
  const filters: SQL[] = []

  if (params.q) {
    filters.push(ilike(examPackage.name, `%${params.q}%`))
  }

  return filters
}

export async function listExamPackagesPage(
  params: TableParams
): Promise<ExamPackagesPage> {
  const filters = buildFilters(params)
  const where = filters.length > 0 ? and(...filters) : undefined

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(examPackage)
    .where(where)

  const totalPages = Math.max(1, Math.ceil(count / params.size))
  const page = Math.min(params.page, totalPages)
  const column = SORT_COLUMNS[params.sort]
  const order = params.order === "asc" ? asc : desc

  const rows = await db
    .select({ ...LIST_PROJECTION })
    .from(examPackage)
    .where(where)
    .orderBy(order(column), desc(examPackage.id))
    .limit(params.size)
    .offset((page - 1) * params.size)

  const counts = await questionCountsFor(rows.map((row) => row.id))

  return {
    items: rows.map((row) => ({
      ...row,
      questionCount: counts.get(row.id) ?? 0,
    })) as ExamPackageListItem[],
    total: count,
    page,
    pageSize: params.size,
    totalPages,
  }
}

/**
 * Question counts per package, for merging into list queries.
 *
 * Drizzle renders columns interpolated inside `sql` fragments bare in
 * SELECT position (`where "examId" = "id"`), which resolves against the
 * subquery's own table and silently yields zero. Fetching the counts as a
 * separate query and merging in JS avoids the correlated subquery entirely.
 */
async function questionCountsFor(packageIds: string[]): Promise<Map<string, number>> {
  if (packageIds.length === 0) {
    return new Map()
  }

  const rows = await db
    .select({
      examId: examQuestion.examId,
      count: sql<number>`count(*)::int`,
    })
    .from(examQuestion)
    .where(inArray(examQuestion.examId, packageIds))
    .groupBy(examQuestion.examId)

  return new Map(rows.map((row) => [row.examId, row.count]))
}

export async function getExamPackageById(
  id: string
): Promise<ExamPackageDetail | null> {
  const [row] = await db
    .select({ ...LIST_PROJECTION, updatedAt: examPackage.updatedAt })
    .from(examPackage)
    .where(eq(examPackage.id, id))
    .limit(1)

  return row ? ({ ...row, questionCount: 0 } as ExamPackageDetail) : null
}

/**
 * One package by its URL slug, same shape as `getExamPackageById`.
 */
export async function getExamPackageBySlug(
  slug: string
): Promise<ExamPackageDetail | null> {
  const [row] = await db
    .select({ ...LIST_PROJECTION, updatedAt: examPackage.updatedAt })
    .from(examPackage)
    .where(eq(examPackage.slug, slug))
    .limit(1)

  return row ? ({ ...row, questionCount: 0 } as ExamPackageDetail) : null
}

/**
 * Whether a slug is already in use, optionally excluding one row (the one
 * being renamed) so re-applying the current name never dedups against itself.
 */
export async function examPackageSlugTaken(
  slug: string,
  excludeId?: string
): Promise<boolean> {
  const [row] = await db
    .select({ id: examPackage.id })
    .from(examPackage)
    .where(
      and(
        eq(examPackage.slug, slug),
        excludeId ? ne(examPackage.id, excludeId) : undefined
      )
    )
    .limit(1)

  return Boolean(row)
}

export interface PackageQuestion {
  id: string
  questionId: string
  position: number
  type: string
  searchText: string
  categoryId: string | null
  archivedAt: Date | null
  score: string | null
}

/**
 * The ordered composition of a package.
 */
export async function listPackageQuestions(examId: string): Promise<PackageQuestion[]> {
  const rows = await db
    .select({
      id: examQuestion.id,
      questionId: examQuestion.questionId,
      position: examQuestion.position,
      type: question.type,
      searchText: question.searchText,
      categoryId: question.categoryId,
      archivedAt: question.archivedAt,
      score: examQuestion.score,
    })
    .from(examQuestion)
    .innerJoin(question, eq(examQuestion.questionId, question.id))
    .where(eq(examQuestion.examId, examId))
    .orderBy(asc(examQuestion.position), asc(examQuestion.id))

  return rows as PackageQuestion[]
}

export async function countPackageQuestions(examId: string): Promise<number> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(examQuestion)
    .where(eq(examQuestion.examId, examId))

  return count
}

export interface ActiveBank {
  id: string
  name: string
}

/**
 * The banks the selector offers — active ones only; the eligibility
 * invariant already excludes archived banks' questions at the query level.
 */
export async function listActiveBanks(): Promise<ActiveBank[]> {
  const rows = await db
    .select({ id: questionBank.id, name: questionBank.name })
    .from(questionBank)
    .where(sql`${questionBank.archivedAt} is null`)
    .orderBy(sql`lower(${questionBank.name}) asc`)

  return rows as ActiveBank[]
}
