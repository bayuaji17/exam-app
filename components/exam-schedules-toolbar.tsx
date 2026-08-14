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
} from "@/lib/exam-schedules/table-params"

/**
 * The schedule list controls: debounced search plus a status filter
 * (upcoming/ongoing/ended, derived from the window timestamps).
 */
export function ExamSchedulesToolbar({
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
            aria-label="Cari jadwal"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nama jadwal..."
            value={query}
          />
        </div>

        <Select
          onValueChange={(value) =>
            updateStatus(value === "all" ? undefined : (value as TableParams["status"]))
          }
          value={params.status ?? "all"}
        >
          <SelectTrigger aria-label="Filter status jadwal" className="w-full sm:w-44">
            <SelectValue placeholder="Semua status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            <SelectItem value="upcoming">Akan Datang</SelectItem>
            <SelectItem value="ongoing">Berlangsung</SelectItem>
            <SelectItem value="ended">Selesai</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {children}
    </div>
  )
}
