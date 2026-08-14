import { ALLOWED_PAGE_SIZES, type SortOrder, type TableViewParams } from "@/lib/types/table"
import { QUESTION_TYPES, type QuestionType } from "./question-validation"

/**
 * The question table's sortable columns. Only creation time is offered: a
 * question has no natural name, and content sorting is meaningless.
 */
export type SortColumn = "createdAt"

export type StatusFilter = "active" | "archived"

export interface TableParams extends TableViewParams {
  sort: SortColumn
  categoryId: string | undefined
  type: QuestionType | undefined
  status: StatusFilter | undefined
}

const STATUS_VALUES: readonly StatusFilter[] = ["active", "archived"]

function parseIntOrUndefined(value: string | null): number | undefined {
  if (value === null) {
    return undefined
  }

  const parsed = Number.parseInt(value, 10)

  return Number.isFinite(parsed) ? parsed : undefined
}

/**
 * Parse the URL's search params into a validated parameter set. Anything
 * unrecognised falls back to a default rather than reaching the query layer.
 */
export function parseTableParams(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>
): TableParams {
  const get = (key: string): string | null => {
    if (searchParams instanceof URLSearchParams) {
      return searchParams.get(key)
    }

    const value = searchParams[key]

    if (Array.isArray(value)) {
      return value[0] ?? null
    }

    return value ?? null
  }

  const q = (get("q") ?? "").trim()

  const categoryId = get("category") ?? undefined

  const typeValue = get("type")
  const type = QUESTION_TYPES.includes(typeValue as QuestionType)
    ? (typeValue as QuestionType)
    : undefined

  const statusValue = get("status")
  const status = STATUS_VALUES.includes(statusValue as StatusFilter)
    ? (statusValue as StatusFilter)
    : undefined

  const orderValue = get("order")
  const order: SortOrder = orderValue === "asc" || orderValue === "desc" ? orderValue : "desc"

  const pageValue = parseIntOrUndefined(get("page"))
  const page = pageValue !== undefined && pageValue >= 1 ? pageValue : 1

  const sizeValue = parseIntOrUndefined(get("size"))
  const size =
    sizeValue !== undefined &&
    (ALLOWED_PAGE_SIZES as readonly number[]).includes(sizeValue)
      ? sizeValue
      : 10

  return { q, sort: "createdAt", order, page, size, categoryId, type, status }
}

/**
 * Serialize a parameter set into a URL. Defaults and empties are omitted.
 */
export function buildTableUrl(base: string, params: TableParams): string {
  const search = new URLSearchParams()

  if (params.q) {
    search.set("q", params.q)
  }

  if (params.categoryId) {
    search.set("category", params.categoryId)
  }

  if (params.type) {
    search.set("type", params.type)
  }

  if (params.status) {
    search.set("status", params.status)
  }

  if (params.order !== "desc") {
    search.set("order", params.order)
  }

  if (params.page !== 1) {
    search.set("page", String(params.page))
  }

  if (params.size !== 10) {
    search.set("size", String(params.size))
  }

  const query = search.toString()

  return query ? `${base}?${query}` : base
}
