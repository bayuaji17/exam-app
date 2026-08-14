import Link from "next/link"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"

import { TableHead } from "@/components/ui/table"
import { buildTableUrl } from "@/lib/users/table-params"
import { nextSortOrder, type TableViewParams } from "@/lib/types/table"

interface DataTableSortHeaderProps {
  basePath: string
  params: TableViewParams
  column: string
  children: React.ReactNode
}

export function DataTableSortHeader({
  basePath,
  params,
  column,
  children,
}: DataTableSortHeaderProps) {
  const active = params.sort === column
  const order = nextSortOrder(params.sort, params.order, column)
  const href = buildTableUrl(basePath, {
    ...params,
    sort: column,
    order,
    page: 1,
  })
  const Icon = active ? (params.order === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown

  return (
    <TableHead>
      <Link
        aria-label={`Urutkan berdasarkan ${children}`}
        className="inline-flex items-center gap-1 rounded-sm hover:text-foreground"
        href={href}
      >
        {children}
        <Icon aria-hidden="true" className="size-3.5" />
      </Link>
    </TableHead>
  )
}
