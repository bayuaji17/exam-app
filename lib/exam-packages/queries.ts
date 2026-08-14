import { and, asc, desc, eq, ilike, sql, type SQL } from "drizzle-orm"
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
  description: string | null
  durationMinutes: number | null
  shuffle: boolean
  passScore: string | null
  createdAt: Date
  questionCount: number
}

export interface ExamPackageDetail extends Omit<ExamPackageListItem, "questionCount"> {
  updatedAt: Date
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
  description: examPackage.description,
  durationMinutes: examPackage.durationMinutes,
  shuffle: examPackage.shuffle,
  passScore: examPackage.passScore,
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
    .select({
      ...LIST_PROJECTION,
      questionCount: sql<number>`(
        select count(*)::int from ${examQuestion} where ${examQuestion.examId} = ${examPackage.id}
      )`,
    })
    .from(examPackage)
    .where(where)
    .orderBy(order(column), desc(examPackage.id))
    .limit(params.size)
    .offset((page - 1) * params.size)

  return {
    items: rows as ExamPackageListItem[],
    total: count,
    page,
    pageSize: params.size,
    totalPages,
  }
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

export interface PackageQuestion {
  id: string
  questionId: string
  position: number
  type: string
  searchText: string
  categoryId: string | null
  archivedAt: Date | null
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
