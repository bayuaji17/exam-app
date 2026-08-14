import { and, asc, desc, eq, ilike, sql, type SQL } from "drizzle-orm"
import type { AnyColumn } from "drizzle-orm/column"

import { db } from "@/lib/db"
import { question, questionOption } from "@/lib/db/schema"
import type { QuestionType } from "./question-validation"
import type { SortColumn, TableParams } from "./question-table-params"

/**
 * A question as the bank detail list renders one. Narrow on purpose: the
 * list needs a snippet and its type/category state, not full content.
 */
export interface QuestionListItem {
  id: string
  type: QuestionType
  searchText: string
  categoryId: string | null
  archivedAt: Date | null
  createdAt: Date
}

export interface QuestionsPage {
  items: QuestionListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface QuestionWithOptions {
  id: string
  bankId: string
  type: QuestionType
  content: Record<string, unknown>
  categoryId: string | null
  archivedAt: Date | null
  options: Array<{
    id: string
    content: Record<string, unknown>
    isCorrect: boolean | null
    score: string | null
  }>
}

export interface QuestionBankStats {
  total: number
  active: number
  archived: number
  byType: Record<QuestionType, number>
}

const LIST_PROJECTION = {
  id: question.id,
  type: question.type,
  searchText: question.searchText,
  categoryId: question.categoryId,
  archivedAt: question.archivedAt,
  createdAt: question.createdAt,
}

const SORT_COLUMNS: Record<SortColumn, AnyColumn> = {
  createdAt: question.createdAt,
}

function buildFilters(bankId: string, params: TableParams): SQL[] {
  const filters: SQL[] = [eq(question.bankId, bankId)]

  if (params.q) {
    filters.push(ilike(question.searchText, `%${params.q}%`))
  }

  if (params.categoryId) {
    filters.push(eq(question.categoryId, params.categoryId))
  }

  if (params.type) {
    filters.push(eq(question.type, params.type))
  }

  if (params.status === "active") {
    filters.push(sql`${question.archivedAt} is null`)
  }

  if (params.status === "archived") {
    filters.push(sql`${question.archivedAt} is not null`)
  }

  return filters
}

export async function listQuestionsPage(
  bankId: string,
  params: TableParams
): Promise<QuestionsPage> {
  const filters = buildFilters(bankId, params)
  const where = filters.length > 0 ? and(...filters) : undefined

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(question)
    .where(where)

  const totalPages = Math.max(1, Math.ceil(count / params.size))
  const page = Math.min(params.page, totalPages)
  const column = SORT_COLUMNS[params.sort]
  const order = params.order === "asc" ? asc : desc

  const items = await db
    .select(LIST_PROJECTION)
    .from(question)
    .where(where)
    .orderBy(order(column), desc(question.id))
    .limit(params.size)
    .offset((page - 1) * params.size)

  return {
    items: items as QuestionListItem[],
    total: count,
    page,
    pageSize: params.size,
    totalPages,
  }
}

export async function getQuestionWithOptions(
  id: string
): Promise<QuestionWithOptions | null> {
  const [row] = await db
    .select({
      id: question.id,
      bankId: question.bankId,
      type: question.type,
      content: question.content,
      categoryId: question.categoryId,
      archivedAt: question.archivedAt,
    })
    .from(question)
    .where(eq(question.id, id))
    .limit(1)

  if (!row) {
    return null
  }

  const options = await db
    .select({
      id: questionOption.id,
      content: questionOption.content,
      isCorrect: questionOption.isCorrect,
      score: questionOption.score,
    })
    .from(questionOption)
    .where(eq(questionOption.questionId, id))
    .orderBy(questionOption.position)

  return {
    ...row,
    content: row.content as Record<string, unknown>,
    options: options as QuestionWithOptions["options"],
  }
}

export async function getQuestionBankStats(bankId: string): Promise<QuestionBankStats> {
  const rows = await db
    .select({
      type: question.type,
      archived: sql<boolean>`${question.archivedAt} is not null`,
      count: sql<number>`count(*)::int`,
    })
    .from(question)
    .where(eq(question.bankId, bankId))
    .groupBy(question.type, sql`${question.archivedAt} is not null`)

  const stats: QuestionBankStats = {
    total: 0,
    active: 0,
    archived: 0,
    byType: { single: 0, scored: 0, manual: 0 },
  }

  for (const row of rows) {
    stats.total += row.count
    stats.byType[row.type] = (stats.byType[row.type] ?? 0) + row.count

    if (row.archived) {
      stats.archived += row.count
    } else {
      stats.active += row.count
    }
  }

  return stats
}
