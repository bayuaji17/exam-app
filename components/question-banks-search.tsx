"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Input } from "@/components/ui/input"
import { buildTableUrl, type TableParams } from "@/lib/question-banks/table-params"

/**
 * Debounced search input for the bank list. Mirrors the toolbar's debounce
 * behaviour: keystrokes navigate after 300 ms, browser back/forward and reset
 * links re-sync the input without overwriting keystrokes mid-debounce.
 */
export function QuestionBanksSearch({ params }: { params: TableParams }) {
  const router = useRouter()
  const [query, setQuery] = useState(params.q)
  const [isPending, startTransition] = useTransition()
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
      const nextParams = { ...params, q: query, page: 1 }

      startTransition(() => {
        router.push(buildTableUrl("/dashboard/question-banks", nextParams))
      })
    }, 300)

    return () => clearTimeout(timeout)
  }, [params, query, router])

  return (
    <Input
      aria-label="Cari bank soal"
      onChange={(event) => setQuery(event.target.value)}
      placeholder="Cari nama bank..."
      value={query}
      className="min-w-64 flex-1"
      data-pending={isPending ? "" : undefined}
    />
  )
}
