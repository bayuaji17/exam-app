"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Input } from "@/components/ui/input"
import { buildTableUrl, type TableParams } from "@/lib/grading/table-params"

/**
 * Debounced search input for the grading work list. Mirrors the other table
 * search behaviours (300 ms debounce, back/forward re-sync).
 */
export function GradingSearch({
  params,
  basePath,
}: {
  params: TableParams
  basePath: string
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
        router.push(
          buildTableUrl(basePath, {
            ...params,
            q: query,
            page: 1,
          })
        )
      })
    }, 300)

    return () => clearTimeout(timeout)
  }, [basePath, params, query, router, startTransition])

  return (
    <Input
      aria-label="Cari pengerjaan"
      onChange={(event) => setQuery(event.target.value)}
      placeholder="Cari peserta atau ujian…"
      value={query}
      className="min-w-64 flex-1"
    />
  )
}
