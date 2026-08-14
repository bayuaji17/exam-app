"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  addQuestionToPackageAction,
  listEligibleForBankAction,
} from "@/lib/exam-packages/actions"
import type { ActiveBank } from "@/lib/exam-packages/queries"
import { QUESTION_TYPE_LABELS } from "@/lib/question-banks/format"
import type { QuestionCategoryListItem } from "@/lib/question-banks/category-queries"
import type { QuestionType } from "@/lib/question-banks/question-validation"

interface EligibleItem {
  id: string
  type: string
  searchText: string
  categoryId: string | null
}

/**
 * The selection screen: browse eligible questions (active questions in
 * active banks — enforced at the query level) and compose the package. The
 * browser fetches per bank via a server action; filtering happens locally
 * on the loaded set.
 */
export function QuestionSelector({
  examId,
  banks,
  categories,
  alreadyAdded,
}: {
  examId: string
  banks: ActiveBank[]
  categories: QuestionCategoryListItem[]
  alreadyAdded: string[]
}) {
  const router = useRouter()
  const [bankId, setBankId] = useState<string | null>(banks[0]?.id ?? null)
  const [items, setItems] = useState<EligibleItem[]>([])
  const [added, setAdded] = useState<Set<string>>(() => new Set(alreadyAdded))
  const [query, setQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!bankId) {
      return
    }

    const bankIdValue = bankId
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      const result = await listEligibleForBankAction(bankIdValue)

      if (cancelled) {
        return
      }

      if (!result.ok) {
        setError(result.message)
        setItems([])
      } else {
        setItems(result.items)
      }

      setLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [bankId])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()

    return items.filter((item) => {
      if (q && !item.searchText.toLowerCase().includes(q)) {
        return false
      }

      if (categoryFilter !== "all" && item.categoryId !== categoryFilter) {
        return false
      }

      if (typeFilter !== "all" && item.type !== typeFilter) {
        return false
      }

      return true
    })
  }, [items, query, categoryFilter, typeFilter])

  async function handleAdd(questionId: string) {
    setError(null)
    const result = await addQuestionToPackageAction(examId, questionId)

    if (!result.ok) {
      setError(result.message)
      return
    }

    setAdded((current) => new Set(current).add(questionId))
    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Select
          onValueChange={(value) => setBankId(value)}
          value={bankId ?? undefined}
        >
          <SelectTrigger aria-label="Pilih bank soal" className="w-full sm:w-64">
            <SelectValue placeholder="Pilih bank soal" />
          </SelectTrigger>
          <SelectContent>
            {banks.map((bank) => (
              <SelectItem key={bank.id} value={bank.id}>
                {bank.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative min-w-0 flex-1 sm:min-w-56">
          <Input
            aria-label="Cari soal"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari teks soal…"
            value={query}
          />
        </div>

        <Select onValueChange={setCategoryFilter} value={categoryFilter}>
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

        <Select onValueChange={setTypeFilter} value={typeFilter}>
          <SelectTrigger aria-label="Filter tipe" className="w-full sm:w-48">
            <SelectValue placeholder="Semua tipe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua tipe</SelectItem>
            {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((type) => (
              <SelectItem key={type} value={type}>
                {QUESTION_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Soal</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead className="w-24">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  Memuat soal…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  {query || categoryFilter !== "all" || typeFilter !== "all"
                    ? "Tidak ada soal yang cocok dengan filter ini."
                    : "Tidak ada soal yang tersedia di bank ini."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => {
                const isAdded = added.has(item.id)

                return (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-md">
                      <p className="line-clamp-2 text-sm">{item.searchText || "—"}</p>
                    </TableCell>
                    <TableCell>
                      <Badge>
                        {QUESTION_TYPE_LABELS[item.type as QuestionType] ?? item.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {categories.find((category) => category.id === item.categoryId)?.name ??
                        "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        disabled={isAdded || isPending}
                        size="sm"
                        type="button"
                        variant={isAdded ? "outline" : "default"}
                        onClick={() => handleAdd(item.id)}
                      >
                        <Plus aria-hidden="true" className="size-4" />
                        {isAdded ? "Sudah ditambahkan" : "Tambah"}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
