"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { SearchIcon } from "lucide-react"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"

export interface IndividualFilterBarProps {
  schedules: Array<{ id: string; name: string; slug: string }>
  currentScheduleId?: string
  currentSearch?: string
}

export function IndividualFilterBar({
  schedules,
  currentScheduleId,
  currentSearch,
}: IndividualFilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const updateFilters = (newScheduleId?: string, newSearch?: string) => {
    const params = new URLSearchParams(searchParams.toString())

    if (newScheduleId !== undefined) {
      if (newScheduleId && newScheduleId !== "ALL") {
        params.set("scheduleId", newScheduleId)
      } else {
        params.delete("scheduleId")
      }
    }

    if (newSearch !== undefined) {
      if (newSearch && newSearch.trim().length > 0) {
        params.set("search", newSearch.trim())
      } else {
        params.delete("search")
      }
    }

    params.delete("page") // Reset to page 1 on filter change

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        {/* Schedule Selector */}
        <div className="w-full sm:w-[280px]">
          <Select
            value={currentScheduleId || "ALL"}
            onValueChange={(val) => updateFilters(val, undefined)}
            disabled={isPending}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Pilih Jadwal Ujian" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">
                Semua Jadwal Ujian
              </SelectItem>
              {schedules.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-xs">
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Search Input */}
        <form
          className="relative flex-1"
          onSubmit={(e) => {
            e.preventDefault()
            const form = e.currentTarget
            const input = form.elements.namedItem("search") as HTMLInputElement
            updateFilters(undefined, input.value)
          }}
        >
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            name="search"
            defaultValue={currentSearch || ""}
            placeholder="Cari nama, email, NISN, NIS, atau No. Peserta..."
            className="h-9 pl-9 text-xs"
            disabled={isPending}
          />
        </form>
      </div>

      {(currentScheduleId || currentSearch) && (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={() => {
            startTransition(() => {
              router.push(pathname)
            })
          }}
          disabled={isPending}
        >
          Reset Filter
        </Button>
      )}
    </div>
  )
}
