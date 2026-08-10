import Link from "next/link"

import { Button } from "@/components/ui/button"
import { buildTableUrl, type TableParams } from "@/lib/users/table-params"

interface DataTablePaginationProps {
  basePath: string
  params: TableParams
  total: number
  page: number
  pageSize: number
  totalPages: number
}

function pageNumbers(page: number, totalPages: number): (number | "ellipsis")[] {
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
  if (totalPages <= 1) {
    return null
  }

  const first = (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)
  const previousUrl = buildTableUrl(basePath, { ...params, page: page - 1 })
  const nextUrl = buildTableUrl(basePath, { ...params, page: page + 1 })

  return (
    <nav aria-label="Navigasi halaman" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Menampilkan {first}–{last} dari {total}
      </p>

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
              <span className="px-1 text-sm text-muted-foreground" key={`ellipsis-${index}`}>
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
