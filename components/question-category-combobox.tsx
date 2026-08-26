"use client"

import { useMemo, useRef, useState } from "react"
import { Check, ChevronsUpDown, Plus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { createQuestionCategoryAction } from "@/lib/question-banks/category-actions"
import type { QuestionCategoryListItem } from "@/lib/question-banks/category-queries"

/**
 * Select an existing category or create a custom one inline; the new
 * category is persisted and immediately selected.
 */
export function QuestionCategoryCombobox({
  categories,
  value,
  onChange,
}: {
  categories: QuestionCategoryListItem[]
  value: string | null
  onChange: (categoryId: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [localCategories, setLocalCategories] =
    useState<QuestionCategoryListItem[]>(categories)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const allCategories = useMemo(
    () => mergeCategories(categories, localCategories),
    [categories, localCategories]
  )

  const selected = useMemo(
    () => allCategories.find((category) => category.id === value) ?? null,
    [allCategories, value]
  )

  const trimmed = query.trim()
  const matches = useMemo(() => {
    return allCategories.filter((category) =>
      category.name.toLowerCase().includes(trimmed.toLowerCase())
    )
  }, [allCategories, trimmed])

  const exactMatch = matches.some(
    (category) => category.name.toLowerCase() === trimmed.toLowerCase()
  )
  const canCreate = trimmed.length > 0 && !exactMatch

  async function handleCreate() {
    if (!canCreate) {
      return
    }

    setCreating(true)
    setError(null)

    const result = await createQuestionCategoryAction({ name: trimmed })

    if (!result.ok) {
      setError(result.message)
      setCreating(false)
      return
    }

    setLocalCategories((current) => [
      ...current,
      {
        id: result.id,
        name: trimmed,
        description: null,
        createdAt: new Date(),
      },
    ])
    setCreating(false)
    setQuery("")
    setOpen(false)
    onChange(result.id)
  }

  function toggleOpen() {
    setOpen((current) => {
      const next = !current

      if (next) {
        setQuery("")
        requestAnimationFrame(() => inputRef.current?.focus())
      }

      return next
    })
  }

  return (
    <div className="relative">
      <Button
        aria-expanded={open}
        aria-haspopup="listbox"
        type="button"
        variant="outline"
        className="w-full justify-between font-normal"
        onClick={toggleOpen}
      >
        {selected ? selected.name : "Pilih kategori…"}
        <ChevronsUpDown aria-hidden="true" className="size-4 opacity-50" />
      </Button>

      {open ? (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover text-popover-foreground shadow-md">
          <div className="border-b p-2">
            <Input
              aria-label="Cari atau buat kategori"
              autoComplete="off"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari atau buat kategori…"
              ref={inputRef}
              value={query}
            />
          </div>

          <ul
            aria-label="Pilihan kategori"
            className="max-h-56 overflow-auto p-1"
            role="listbox"
          >
            {matches.length === 0 && !canCreate ? (
              <li className="px-2 py-1.5 text-sm text-muted-foreground">
                Tidak ada kategori.
              </li>
            ) : null}

            {matches.map((category) => {
              const active = category.id === value

              return (
                <li key={category.id}>
                  <button
                    aria-selected={active}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent",
                      active && "bg-accent"
                    )}
                    role="option"
                    type="button"
                    onClick={() => {
                      onChange(category.id)
                      setOpen(false)
                    }}
                  >
                    {category.name}
                    {active ? (
                      <Check aria-hidden="true" className="size-4" />
                    ) : null}
                  </button>
                </li>
              )
            })}

            {canCreate ? (
              <li>
                <button
                  aria-selected={false}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-primary hover:bg-accent"
                  disabled={creating}
                  role="option"
                  type="button"
                  onClick={handleCreate}
                >
                  <Plus aria-hidden="true" className="size-4" />
                  Buat kategori &ldquo;{trimmed}&rdquo;
                </button>
              </li>
            ) : null}

            {error ? (
              <li className="px-2 py-1.5 text-sm text-destructive">{error}</li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {value ? (
        <Button
          aria-label="Hapus kategori"
          className="absolute top-1/2 right-9 -translate-y-1/2"
          size="icon-sm"
          type="button"
          variant="ghost"
          onClick={() => onChange(null)}
        >
          <X aria-hidden="true" className="size-4" />
        </Button>
      ) : null}
    </div>
  )
}

function mergeCategories(
  server: QuestionCategoryListItem[],
  local: QuestionCategoryListItem[]
): QuestionCategoryListItem[] {
  const byId = new Map(server.map((category) => [category.id, category]))

  for (const category of local) {
    byId.set(category.id, category)
  }

  return [...byId.values()]
}
