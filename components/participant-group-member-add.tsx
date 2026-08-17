"use client"

import { useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronsUpDown, LoaderCircle, UserPlus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { addGroupMemberAction } from "@/lib/participants/actions"
import type { ParticipantCandidate } from "@/lib/participants/queries"
import { cn } from "@/lib/utils"

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
      const msg = result.message ?? "Aksi gagal."
      setError(msg)
      toast.error(msg)
      return
    }

    toast.success(`${candidate.name} berhasil ditambahkan ke grup.`)
    setAddedIds((current) => new Set(current).add(candidate.id))
    setQuery("")
    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <div className="relative w-full">
      <Button
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "group w-full justify-between gap-2 font-normal transition-colors",
          open
            ? "bg-primary text-white hover:bg-primary/90 hover:text-white dark:bg-primary dark:text-white"
            : "hover:bg-primary hover:text-white dark:hover:bg-primary dark:hover:text-white"
        )}
        onClick={toggleOpen}
        type="button"
        variant={open ? "default" : "outline"}
      >
        <div className="flex items-center gap-2">
          {isPending ? (
            <LoaderCircle
              aria-hidden="true"
              className={cn(
                "size-4 animate-spin",
                open
                  ? "text-white"
                  : "text-primary group-hover:text-white dark:group-hover:text-white"
              )}
            />
          ) : (
            <UserPlus
              aria-hidden="true"
              className={cn(
                "size-4 transition-colors",
                open
                  ? "text-white"
                  : "text-primary group-hover:text-white dark:group-hover:text-white"
              )}
            />
          )}
          <span
            className={cn(
              "transition-colors",
              open
                ? "text-white"
                : "group-hover:text-white dark:group-hover:text-white"
            )}
          >
            Tambah peserta…
          </span>
        </div>
        <ChevronsUpDown
          aria-hidden="true"
          className={cn(
            "size-4 transition-colors",
            open
              ? "text-white opacity-90"
              : "opacity-50 group-hover:text-white group-hover:opacity-100 dark:group-hover:text-white"
          )}
        />
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
                  className="group/item flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-primary hover:text-white focus-visible:bg-primary focus-visible:text-white focus-visible:outline-hidden"
                  role="option"
                  type="button"
                  onClick={() => handleAdd(candidate)}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-foreground transition-colors group-hover/item:text-white">
                      {candidate.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground transition-colors group-hover/item:text-white/80">
                      {candidate.email}
                    </span>
                  </span>
                  <Check
                    aria-hidden="true"
                    className="size-4 opacity-0 transition-all group-hover/item:text-white"
                  />
                </button>
              </li>
            ))}
          </ul>

          {error ? (
            <p className="border-t px-2 py-1.5 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
