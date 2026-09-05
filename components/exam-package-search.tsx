"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Input } from "@/components/ui/input"
import {
  buildTableUrl,
  type TableParams,
} from "@/lib/exam-packages/table-params"

/**
 * Debounced search input for the package list. Mirrors the other table
 * search behaviours (300 ms debounce, back/forward re-sync).
 */
export function ExamPackageSearch({ params }: { params: TableParams }) {
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
          buildTableUrl("/dashboard/exams", { ...params, q: query, page: 1 })
        )
      })
    }, 300)

    return () => clearTimeout(timeout)
  }, [params, query, router, startTransition])

  return (
    <Input
      aria-label="Cari paket ujian"
      onChange={(event) => setQuery(event.target.value)}
      placeholder="Cari nama paket..."
      value={query}
      className="min-w-64 flex-1"
    />
  )
}
