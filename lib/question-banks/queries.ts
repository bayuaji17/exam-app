import { and, asc, desc, eq, ilike, sql, type SQL } from "drizzle-orm"
import type { AnyColumn } from "drizzle-orm/column"

import { db } from "@/lib/db"
import { questionBank } from "@/lib/db/schema"
import type { SortColumn, TableParams } from "./table-params"

/**
 * A bank as the management list renders one.
 *
 * Narrower than the full row on purpose: the list needs no creator id and no
 * timestamps beyond creation, so they are not fetched. Widen this when a
 * screen actually needs more.
 */
export interface QuestionBankListItem {
  id: string
  name: string
  description: string | null
  createdAt: Date
  archivedAt: Date | null
}

/**
 * One bank as the edit screen pre-fills from. Wider than the list item only
 * where the edit form needs it.
 */
export interface QuestionBankDetail extends QuestionBankListItem {
  updatedAt: Date
}

const LIST_PROJECTION = {
  id: questionBank.id,
  name: questionBank.name,
  description: questionBank.description,
  createdAt: questionBank.createdAt,
  archivedAt: questionBank.archivedAt,
}

const SORT_COLUMNS: Record<SortColumn, AnyColumn> = {
  name: questionBank.name,
  createdAt: questionBank.createdAt,
}

function buildFilters(params: TableParams): SQL[] {
  const filters: SQL[] = []

  if (params.q) {
    filters.push(ilike(questionBank.name, `%${params.q}%`))
  }

  return filters
}

export interface QuestionBanksPage {
  items: QuestionBankListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * One page of banks matching the table's parameters.
 *
 * The sort whitelist means a tampered URL can never order by a column the UI
 * does not offer. The secondary id sort keeps ties stable between reloads.
 */
export async function listQuestionBanksPage(
  params: TableParams
): Promise<QuestionBanksPage> {
  const filters = buildFilters(params)
  const where = filters.length > 0 ? and(...filters) : undefined

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(questionBank)
    .where(where)

  const totalPages = Math.max(1, Math.ceil(count / params.size))
  const page = Math.min(params.page, totalPages)
  const column = SORT_COLUMNS[params.sort]
  const order = params.order === "asc" ? asc : desc

  const items = await db
    .select(LIST_PROJECTION)
    .from(questionBank)
    .where(where)
    .orderBy(order(column), desc(questionBank.id))
    .limit(params.size)
    .offset((page - 1) * params.size)

  return {
    items: items as QuestionBankListItem[],
    total: count,
    page,
    pageSize: params.size,
    totalPages,
  }
}

/**
 * One bank for the edit screen. Null when no such bank exists, so callers can
 * decide between a redirect and a 404 rather than being handed an empty row.
 */
export async function getQuestionBankById(
  id: string
): Promise<QuestionBankDetail | null> {
  const [row] = await db
    .select({ ...LIST_PROJECTION, updatedAt: questionBank.updatedAt })
    .from(questionBank)
    .where(eq(questionBank.id, id))
    .limit(1)

  return row ?? null
}
