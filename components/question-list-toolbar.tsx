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
import { buildTableUrl, type TableParams } from "@/lib/question-banks/question-table-params"
import { QUESTION_TYPE_OPTIONS } from "@/lib/question-banks/format"
import type { QuestionCategoryListItem } from "@/lib/question-banks/category-queries"

/**
 * The bank detail's question list controls: debounced search over prompt and
 * answer text, category / type / archive-state filters, and the table.
 */
export function QuestionListToolbar({
  basePath,
  categories,
  params,
  children,
}: {
  basePath: string
  categories: QuestionCategoryListItem[]
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

  function updateParams(changes: Partial<TableParams>) {
    startTransition(() => {
      router.push(buildTableUrl(basePath, { ...params, ...changes, page: 1 }))
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:min-w-64">
          <Input
            aria-label="Cari soal"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari teks soal atau jawaban…"
            value={query}
          />
        </div>

        <Select
          onValueChange={(value) =>
            updateParams({
              categoryId: value === "all" ? undefined : value,
            })
          }
          value={params.categoryId ?? "all"}
        >
          <SelectTrigger aria-label="Filter kategori" className="w-full sm:w-44">
            <SelectValue placeholder="Semua kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua kategori</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          onValueChange={(value) =>
            updateParams({
              type: value === "all" ? undefined : (value as TableParams["type"]),
            })
          }
          value={params.type ?? "all"}
        >
          <SelectTrigger aria-label="Filter tipe" className="w-full sm:w-48">
            <SelectValue placeholder="Semua tipe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua tipe</SelectItem>
            {QUESTION_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          onValueChange={(value) =>
            updateParams({
              status: value === "all" ? undefined : (value as TableParams["status"]),
            })
          }
          value={params.status ?? "all"}
        >
          <SelectTrigger aria-label="Filter status" className="w-full sm:w-40">
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
