"use client"

import { useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronsUpDown, LoaderCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  grantGroupEligibilityAction,
  grantUserEligibilityAction,
  revokeGroupEligibilityAction,
  revokeUserEligibilityAction,
} from "@/lib/eligibility/actions"
import type {
  EligibleCandidate,
  GrantedGroup,
  GrantedUser,
} from "@/lib/eligibility/queries"

/**
 * The per-schedule access manager: grant/revoke individual participants and
 * participant groups. The granted lists are server-rendered; this component
 * only adds and removes, then refreshes.
 */
export function ScheduleEligibilityManager({
  scheduleId,
  grantedUsers,
  grantedGroups,
  grantableUsers,
  grantableGroups,
}: {
  scheduleId: string
  grantedUsers: GrantedUser[]
  grantedGroups: GrantedGroup[]
  grantableUsers: EligibleCandidate[]
  grantableGroups: GrantedGroup[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function refresh() {
    startTransition(() => {
      router.refresh()
    })
  }

  async function grantUser(user: EligibleCandidate) {
    const result = await grantUserEligibilityAction(scheduleId, user.id)

    if (!result.ok) {
      return result
    }

    refresh()

    return result
  }

  async function revokeUser(userId: string) {
    await revokeUserEligibilityAction(scheduleId, userId)

    // On failure (e.g. already revoked) the refresh reconciles with the
    // server rather than leaving a stale row visible.
    refresh()
  }

  async function grantGroup(group: GrantedGroup) {
    const result = await grantGroupEligibilityAction(scheduleId, group.id)

    if (!result.ok) {
      return result
    }

    refresh()

    return result
  }

  async function revokeGroup(groupId: string) {
    await revokeGroupEligibilityAction(scheduleId, groupId)

    // On failure (e.g. already revoked) the refresh reconciles with the
    // server rather than leaving a stale row visible.
    refresh()
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Peserta</h2>
          <p className="text-sm text-muted-foreground">
            Peserta yang diberi akses langsung ke jadwal ini.
          </p>
        </div>

        <UserGrantCombobox
          busy={isPending}
          candidates={grantableUsers}
          onSelect={grantUser}
        />

        <ul className="divide-y rounded-lg border">
          {grantedUsers.map((granted) => (
            <li
              className="flex items-center justify-between gap-3 px-3 py-2"
              key={granted.id}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{granted.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {granted.email}
                </p>
              </div>
              <Button
                size="sm"
                type="button"
                variant="outline"
                className="text-destructive"
                onClick={() => revokeUser(granted.id)}
              >
                Cabut
              </Button>
            </li>
          ))}
          {grantedUsers.length === 0 ? (
            <li className="px-3 py-4 text-center text-sm text-muted-foreground">
              Belum ada peserta yang diberi akses.
            </li>
          ) : null}
        </ul>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Grup</h2>
          <p className="text-sm text-muted-foreground">
            Semua anggota grup berikut otomatis menjadi peserta yang berhak
            mengikuti ujian ini.
          </p>
        </div>

        <GroupGrantCombobox
          busy={isPending}
          candidates={grantableGroups}
          onSelect={grantGroup}
        />

        <ul className="divide-y rounded-lg border">
          {grantedGroups.map((granted) => (
            <li
              className="flex items-center justify-between gap-3 px-3 py-2"
              key={granted.id}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{granted.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {granted.memberCount} anggota
                </p>
              </div>
              <Button
                size="sm"
                type="button"
                variant="outline"
                className="text-destructive"
                onClick={() => revokeGroup(granted.id)}
              >
                Cabut
              </Button>
            </li>
          ))}
          {grantedGroups.length === 0 ? (
            <li className="px-3 py-4 text-center text-sm text-muted-foreground">
              Belum ada grup yang diberi akses.
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  )
}

function UserGrantCombobox({
  busy,
  candidates,
  onSelect,
}: {
  busy: boolean
  candidates: EligibleCandidate[]
  onSelect: (
    user: EligibleCandidate
  ) => Promise<{ ok: boolean; message?: string }>
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)

  const trimmed = query.trim()

  const matches = useMemo(() => {
    const pattern = trimmed.toLowerCase()

    return candidates.filter(
      (candidate) =>
        !picked.has(candidate.id) &&
        (candidate.name.toLowerCase().includes(pattern) ||
          candidate.email.toLowerCase().includes(pattern))
    )
  }, [candidates, picked, trimmed])

  const remaining = candidates.length - picked.size

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

  async function handleSelect(candidate: EligibleCandidate) {
    const result = await onSelect(candidate)

    if (!result.ok) {
      setError(result.message ?? "Aksi gagal.")
      return
    }

    setPicked((current) => new Set(current).add(candidate.id))
    setQuery("")
    setOpen(false)
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
        {busy ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <ChevronsUpDown aria-hidden="true" className="size-4 opacity-50" />
        )}
        Tambah akses peserta…
      </Button>

      {open ? (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover text-popover-foreground shadow-md">
          <div className="border-b p-2">
            <Input
              aria-label="Cari peserta untuk akses"
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
                  ? "Semua peserta sudah diberi akses."
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
                  onClick={() => handleSelect(candidate)}
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
            <p className="border-t px-2 py-1.5 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function GroupGrantCombobox({
  busy,
  candidates,
  onSelect,
}: {
  busy: boolean
  candidates: GrantedGroup[]
  onSelect: (group: GrantedGroup) => Promise<{ ok: boolean; message?: string }>
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)

  const trimmed = query.trim()

  const matches = useMemo(() => {
    const pattern = trimmed.toLowerCase()

    return candidates.filter(
      (candidate) =>
        !picked.has(candidate.id) &&
        candidate.name.toLowerCase().includes(pattern)
    )
  }, [candidates, picked, trimmed])

  const remaining = candidates.length - picked.size

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

  async function handleSelect(candidate: GrantedGroup) {
    const result = await onSelect(candidate)

    if (!result.ok) {
      setError(result.message ?? "Aksi gagal.")
      return
    }

    setPicked((current) => new Set(current).add(candidate.id))
    setQuery("")
    setOpen(false)
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
        {busy ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <ChevronsUpDown aria-hidden="true" className="size-4 opacity-50" />
        )}
        Tambah akses grup…
      </Button>

      {open ? (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover text-popover-foreground shadow-md">
          <div className="border-b p-2">
            <Input
              aria-label="Cari grup untuk akses"
              autoComplete="off"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama grup…"
              ref={inputRef}
              value={query}
            />
          </div>

          <ul
            aria-label="Pilihan grup"
            className="max-h-56 overflow-auto p-1"
            role="listbox"
          >
            {matches.length === 0 ? (
              <li className="px-2 py-1.5 text-sm text-muted-foreground">
                {remaining === 0
                  ? "Semua grup sudah diberi akses."
                  : "Tidak ada grup yang cocok."}
              </li>
            ) : null}

            {matches.map((candidate) => (
              <li key={candidate.id}>
                <button
                  aria-selected={false}
                  className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                  role="option"
                  type="button"
                  onClick={() => handleSelect(candidate)}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {candidate.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {candidate.memberCount} anggota
                    </span>
                  </span>
                  <Check aria-hidden="true" className="size-4 opacity-0" />
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
