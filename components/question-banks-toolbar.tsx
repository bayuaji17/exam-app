"use client"

import type { ReactNode } from "react"
import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  buildTableUrl,
  type TableParams,
} from "@/lib/question-banks/table-params"

/**
 * The bank list controls: debounced search plus an archive-state filter.
 */
export function QuestionBanksToolbar({
  basePath,
  params,
  children,
}: {
  basePath: string
  params: TableParams
  children: ReactNode
}) {
  const router = useRouter()
  const [query, setQuery] = useState(params.q)
  const startTransition = useTransition()[1]
  const submittedQuery = useRef(params.q)

  useEffect(() => {
    if (params.q !== submittedQuery.current) {
      submittedQuery.current = params.q
      setQuery(params.q)
    }
  }, [params.q])

  useEffect(() => {
    if (query === params.q) {
      return
    }

    const timeout = setTimeout(() => {
      submittedQuery.current = query

      startTransition(() => {
        router.push(buildTableUrl(basePath, { ...params, q: query, page: 1 }))
      })
    }, 300)

    return () => clearTimeout(timeout)
  }, [basePath, params, query, router, startTransition])

  function updateStatus(status: TableParams["status"]) {
    startTransition(() => {
      router.push(buildTableUrl(basePath, { ...params, status, page: 1 }))
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:min-w-64">
          <Input
            aria-label="Cari bank soal"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nama bank..."
            value={query}
          />
        </div>

        <Select
          onValueChange={(value) =>
            updateStatus(
              value === "all" ? undefined : (value as TableParams["status"])
            )
          }
          value={params.status ?? "all"}
        >
          <SelectTrigger
            aria-label="Filter status bank"
            className="w-full sm:w-40"
          >
            <SelectValue placeholder="Semua status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="archived">Diarsipkan</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {children}
    </div>
  )
}
