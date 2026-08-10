"use client"

import type { ReactNode } from "react"
import { useEffect, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { buildTableUrl, type TableParams } from "@/lib/users/table-params"
import type { SystemRole } from "@/lib/auth-roles"

export interface TableFilterOption {
  value: string
  label: string
}

interface DataTableToolbarProps {
  basePath: string
  params: TableParams
  roleOptions: TableFilterOption[]
  showStatus?: boolean
  children: ReactNode
}

const DEFAULT_PARAMS: TableParams = {
  q: "",
  role: undefined,
  status: undefined,
  sort: "createdAt",
  order: "desc",
  page: 1,
  size: 10,
}

export function DataTableToolbar({
  basePath,
  params,
  roleOptions,
  showStatus = true,
  children,
}: DataTableToolbarProps) {
  const router = useRouter()
  const [query, setQuery] = useState(params.q)
  const [isPending, startTransition] = useTransition()
  const submittedQuery = useRef(params.q)

  // Keep the input in sync with browser back/forward and reset links, without
  // overwriting keystrokes while a debounce is waiting to navigate.
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
        router.push(buildTableUrl(basePath, nextParams))
      })
    }, 300)

    return () => clearTimeout(timeout)
  }, [basePath, params, query, router])

  function updateParams(changes: Partial<TableParams>) {
    const nextParams = { ...params, ...changes, page: 1 }

    startTransition(() => {
      router.push(buildTableUrl(basePath, nextParams))
    })
  }

  const resetUrl = buildTableUrl(basePath, DEFAULT_PARAMS)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:min-w-64">
          <Input
            aria-label="Cari pengguna"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nama atau email..."
            value={query}
          />
        </div>

        <Select
          onValueChange={(value) =>
            updateParams({
              role: value === "all" ? undefined : (value as SystemRole),
            })
          }
          value={params.role ?? "all"}
        >
          <SelectTrigger aria-label="Filter role" className="w-full sm:w-44">
            <SelectValue placeholder="Semua role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua role</SelectItem>
            {roleOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showStatus && (
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
              <SelectItem value="banned">Diblokir</SelectItem>
            </SelectContent>
          </Select>
        )}

        <Button asChild className="shrink-0" variant="ghost">
          <Link href={resetUrl}>Reset</Link>
        </Button>
      </div>

      <div
        aria-busy={isPending}
        className={cn(
          "transition-opacity duration-150",
          isPending && "opacity-60"
        )}
      >
        {children}
      </div>
    </div>
  )
}
