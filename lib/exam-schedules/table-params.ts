import {
  ALLOWED_PAGE_SIZES,
  nextSortOrder,
  type SortOrder,
  type TableViewParams,
} from "@/lib/types/table"

/**
 * The schedule table's sortable columns. Kept as a narrow union so a
 * tampered URL can never reach the query layer with an unexpected column.
 */
export type SortColumn = "name" | "startsAt" | "createdAt"

export type StatusFilter = "upcoming" | "ongoing" | "ended"

export interface TableParams extends TableViewParams {
  sort: SortColumn
  status: StatusFilter | undefined
}

export { ALLOWED_PAGE_SIZES, nextSortOrder, type SortOrder }

const DEFAULTS: TableParams = {
  q: "",
  sort: "startsAt",
  order: "asc",
  page: 1,
  size: 10,
  status: undefined,
}

const SORTABLE_COLUMNS: readonly SortColumn[] = [
  "name",
  "startsAt",
  "createdAt",
]
const STATUS_VALUES: readonly StatusFilter[] = ["upcoming", "ongoing", "ended"]

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

  const statusValue = get("status")
  const status = STATUS_VALUES.includes(statusValue as StatusFilter)
    ? (statusValue as StatusFilter)
    : undefined

  const sortValue = get("sort")
  const sort = SORTABLE_COLUMNS.includes(sortValue as SortColumn)
    ? (sortValue as SortColumn)
    : DEFAULTS.sort

  const orderValue = get("order")
  const order: SortOrder =
    orderValue === "asc" || orderValue === "desc" ? orderValue : DEFAULTS.order

  const pageValue = parseIntOrUndefined(get("page"))
  const page =
    pageValue !== undefined && pageValue >= 1 ? pageValue : DEFAULTS.page

  const sizeValue = parseIntOrUndefined(get("size"))
  const size =
    sizeValue !== undefined &&
    (ALLOWED_PAGE_SIZES as readonly number[]).includes(sizeValue)
      ? sizeValue
      : DEFAULTS.size

  return { q, sort, order, page, size, status }
}

/**
 * Serialize a parameter set into a URL. Defaults and empties are omitted.
 */
export function buildTableUrl(base: string, params: TableParams): string {
  const search = new URLSearchParams()

  if (params.q) {
    search.set("q", params.q)
  }

  if (params.status) {
    search.set("status", params.status)
  }

  if (params.sort !== DEFAULTS.sort || params.order !== DEFAULTS.order) {
    search.set("sort", params.sort)
    search.set("order", params.order)
  }

  if (params.page !== DEFAULTS.page) {
    search.set("page", String(params.page))
  }

  if (params.size !== DEFAULTS.size) {
    search.set("size", String(params.size))
  }

  const query = search.toString()

  return query ? `${base}?${query}` : base
}
