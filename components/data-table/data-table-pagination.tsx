import Link from "next/link"

import { Button } from "@/components/ui/button"
import { buildTableUrl } from "@/lib/users/table-params"
import { ALLOWED_PAGE_SIZES, type TableViewParams } from "@/lib/types/table"

interface DataTablePaginationProps {
  basePath: string
  params: TableViewParams
  total: number
  page: number
  pageSize: number
  totalPages: number
}

function pageNumbers(
  page: number,
  totalPages: number
): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const pages: (number | "ellipsis")[] = [1]
  const start = Math.max(2, page - 1)
  const end = Math.min(totalPages - 1, page + 1)

  if (start > 2) {
    pages.push("ellipsis")
  }

  for (let value = start; value <= end; value += 1) {
    pages.push(value)
  }

  if (end < totalPages - 1) {
    pages.push("ellipsis")
  }

  pages.push(totalPages)
  return pages
}

export function DataTablePagination({
  basePath,
  params,
  total,
  page,
  pageSize,
  totalPages,
}: DataTablePaginationProps) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1
  const last = total === 0 ? 0 : Math.min(page * pageSize, total)
  const previousUrl = buildTableUrl(basePath, { ...params, page: page - 1 })
  const nextUrl = buildTableUrl(basePath, { ...params, page: page + 1 })

  return (
    <nav
      aria-label="Navigasi halaman"
      className="my-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between md:my-4"
    >
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <p>
          Menampilkan {first}–{last} dari {total}
        </p>
        <div className="flex flex-wrap items-center gap-1">
          <span>Per halaman:</span>
          {ALLOWED_PAGE_SIZES.map((size) => (
            <Button
              asChild
              key={size}
              size="icon-sm"
              variant={size === pageSize ? "default" : "outline"}
            >
              <Link
                aria-current={size === pageSize ? "true" : undefined}
                aria-label={`${size} per halaman`}
                href={buildTableUrl(basePath, {
                  ...params,
                  page: 1,
                  size,
                })}
              >
                {size}
              </Link>
            </Button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-1 sm:justify-end">
        {page === 1 ? (
          <Button disabled size="sm" variant="outline">
            Sebelumnya
          </Button>
        ) : (
          <Button asChild size="sm" variant="outline">
            <Link href={previousUrl}>Sebelumnya</Link>
          </Button>
        )}

        <div className="flex items-center gap-1">
          {pageNumbers(page, totalPages).map((value, index) =>
            value === "ellipsis" ? (
              <span
                className="px-1 text-sm text-muted-foreground"
                key={`ellipsis-${index}`}
              >
                …
              </span>
            ) : (
              <Button
                asChild
                key={value}
                size="icon-sm"
                variant={value === page ? "default" : "outline"}
              >
                <Link
                  aria-current={value === page ? "page" : undefined}
                  aria-label={`Halaman ${value}`}
                  href={buildTableUrl(basePath, { ...params, page: value })}
                >
                  {value}
                </Link>
              </Button>
            )
          )}
        </div>

        {page === totalPages ? (
          <Button disabled size="sm" variant="outline">
            Berikutnya
          </Button>
        ) : (
          <Button asChild size="sm" variant="outline">
            <Link href={nextUrl}>Berikutnya</Link>
          </Button>
        )}
      </div>
    </nav>
  )
}
