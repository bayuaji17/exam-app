"use client"

import { useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronsUpDown, LoaderCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { addGroupMemberAction } from "@/lib/participants/actions"
import type { ParticipantCandidate } from "@/lib/participants/queries"

/**
 * Searchable combobox that adds a candidate participant to the group. The
 * candidate list is server-filtered (role user, non-banned, not a member
 * yet), so only valid targets can be picked.
 */
export function ParticipantGroupMemberAdd({
  groupId,
  candidates,
}: {
  groupId: string
  candidates: ParticipantCandidate[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())

  const trimmed = query.trim()

  const matches = useMemo(() => {
    const pattern = trimmed.toLowerCase()

    return candidates.filter(
      (candidate) =>
        !addedIds.has(candidate.id) &&
        (candidate.name.toLowerCase().includes(pattern) ||
          candidate.email.toLowerCase().includes(pattern))
    )
  }, [addedIds, candidates, trimmed])

  const remaining = candidates.length - addedIds.size

  function toggleOpen() {
    setOpen((current) => {
      const next = !current

      if (next) {
        setQuery("")
        setError(null)
        requestAnimationFrame(() => inputRef.current?.focus())
      }

      return next
    })
  }

  async function handleAdd(candidate: ParticipantCandidate) {
    setError(null)
    const result = await addGroupMemberAction(groupId, candidate.id)

    if (!result.ok) {
      setError(result.message ?? "Aksi gagal.")
      return
    }

    setAddedIds((current) => new Set(current).add(candidate.id))
    setQuery("")
    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <div className="relative w-full max-w-sm">
      <Button
        aria-expanded={open}
        aria-haspopup="listbox"
        type="button"
        variant="outline"
        className="w-full justify-between font-normal"
        onClick={toggleOpen}
      >
        {isPending ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <ChevronsUpDown aria-hidden="true" className="size-4 opacity-50" />
        )}
        Tambah peserta…
      </Button>

      {open ? (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover text-popover-foreground shadow-md">
          <div className="border-b p-2">
            <Input
              aria-label="Cari peserta"
              autoComplete="off"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama atau email…"
              ref={inputRef}
              value={query}
            />
          </div>

          <ul
            aria-label="Pilihan peserta"
            className="max-h-56 overflow-auto p-1"
            role="listbox"
          >
            {matches.length === 0 ? (
              <li className="px-2 py-1.5 text-sm text-muted-foreground">
                {remaining === 0
                  ? "Semua peserta sudah menjadi anggota."
                  : "Tidak ada peserta yang cocok."}
              </li>
            ) : null}

            {matches.map((candidate) => (
              <li key={candidate.id}>
                <button
                  aria-selected={false}
                  className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                  role="option"
                  type="button"
                  onClick={() => handleAdd(candidate)}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {candidate.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {candidate.email}
                    </span>
                  </span>
                  <Check aria-hidden="true" className="size-4 opacity-0" />
                </button>
              </li>
            ))}
          </ul>

          {error ? (
            <p className="border-t px-2 py-1.5 text-sm text-destructive">{error}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
