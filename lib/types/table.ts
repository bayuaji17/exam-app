/**
 * The parameter subset every data table shares. Domain modules extend it with
 * their own filter fields (e.g. users add `role` and `status`), and the
 * shared data-table components consume only this subset.
 */
export interface TableViewParams {
  q: string
  sort: string
  order: SortOrder
  page: number
  size: number
}

export type SortOrder = "asc" | "desc"

export const ALLOWED_PAGE_SIZES = [10, 25, 50] as const

/**
 * The order a sortable header click cycles to. A new column starts at
 * ascending; the active column flips.
 */
export function nextSortOrder(
  currentSort: string,
  currentOrder: SortOrder,
  clicked: string
): SortOrder {
  if (clicked !== currentSort) {
    return "asc"
  }

  return currentOrder === "asc" ? "desc" : "asc"
}
