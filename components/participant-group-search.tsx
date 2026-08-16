"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Input } from "@/components/ui/input"
import {
  buildTableUrl,
  type TableParams,
} from "@/lib/participants/table-params"

/**
 * Debounced search input for a participant list (groups or members). Mirrors
 * the other table search behaviours (300 ms debounce, back/forward
 * re-sync).
 */
export function ParticipantGroupSearch({
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
      aria-label="Cari grup peserta"
      onChange={(event) => setQuery(event.target.value)}
      placeholder="Cari nama grup..."
      value={query}
      className="min-w-64 flex-1"
    />
  )
}
