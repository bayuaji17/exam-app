"use client"

import { useRef, useState } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  applyParticipantImportAction,
  parseParticipantImportAction,
} from "@/lib/participants/import-actions"
import { IMPORT_MAX_BYTES, type ImportPlan } from "@/lib/participants/import"

type Phase = "idle" | "parsed" | "applied"

interface AppliedResult {
  created: number
  generatedPasswords: Record<string, string>
}

/**
 * The two-phase import flow: upload → dry-run report (Import stays disabled
 * while any row is invalid) → atomic apply → result with generated
 * passwords shown once.
 */
export function ParticipantImportForm() {
  const [phase, setPhase] = useState<Phase>("idle")
  const [fileName, setFileName] = useState("")
  const [plan, setPlan] = useState<ImportPlan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<AppliedResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setPhase("idle")
    setPlan(null)
    setError(null)
    setResult(null)
    setFileName("")

    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }

  async function handleParse(file: File) {
    setBusy(true)
    setError(null)
    setResult(null)

    // The server re-checks, but Next's action transport rejects oversized
    // bodies before the action ever runs, so enforce the cap client-side too.
    if (file.size > IMPORT_MAX_BYTES) {
      setError("File maksimal 2 MB.")
      setBusy(false)
      return
    }

    const result = await parseParticipantImportAction(file)

    if (!result.ok) {
      setError(result.message)
      setPhase("idle")
      setBusy(false)
      return
    }

    setPlan(result.plan)
    setFileName(file.name)
    setPhase("parsed")
    setBusy(false)
  }

  async function handleApply() {
    if (!plan) {
      return
    }

    setBusy(true)
    setError(null)

    const result = await applyParticipantImportAction(plan)

    if (!result.ok) {
      setError(result.message)
      setBusy(false)
      return
    }

    setResult({ created: result.created, generatedPasswords: result.generatedPasswords })
    setPhase("applied")
    setBusy(false)
  }

  const passwordEntries = Object.entries(result?.generatedPasswords ?? {})

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Unduh template, isi data peserta (kolom bertanda * wajib), lalu unggah
        file .xlsx. Semua baris divalidasi terlebih dahulu — import hanya
        berjalan jika seluruh baris valid.
      </p>

      <Link
        className="text-sm underline underline-offset-4 hover:no-underline"
        href="/api/participants/template"
      >
        Unduh template (.xlsx)
      </Link>

      {phase === "idle" ? (
        <div className="flex flex-col gap-3">
          <Input
            accept=".xlsx"
            aria-label="File peserta"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0]

              if (file) {
                void handleParse(file)
              }
            }}
            ref={inputRef}
            type="file"
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      ) : null}

      {phase === "parsed" && plan ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm">
            <span className="font-medium">{fileName}</span> —{" "}
            {plan.rows.length} baris,{" "}
            {plan.valid ? (
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                semua valid
              </span>
            ) : (
              <span className="font-medium text-destructive">
                {plan.errors.length} baris bermasalah
              </span>
            )}
          </p>

          {plan.errors.length > 0 ? (
            <ul className="max-h-64 divide-y overflow-auto rounded-lg border">
              {plan.errors.map((rowError) => (
                <li className="px-3 py-2 text-sm" key={`${rowError.rowNumber}-${rowError.message}`}>
                  <span className="font-medium">Baris {rowError.rowNumber}:</span>{" "}
                  {rowError.message}
                </li>
              ))}
            </ul>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex gap-3">
            <Button disabled={!plan.valid || busy} onClick={handleApply} type="button">
              {busy ? "Mengimpor…" : `Import ${plan.rows.length} peserta`}
            </Button>
            <Button disabled={busy} onClick={reset} type="button" variant="outline">
              Ganti file
            </Button>
          </div>
        </div>
      ) : null}

      {phase === "applied" && result ? (
        <div className="flex flex-col gap-4">
          <p className="rounded-lg border border-emerald-600/30 bg-emerald-500/10 px-3 py-2 text-sm">
            {result.created} peserta berhasil diimpor.
          </p>

          {passwordEntries.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">
                Kata sandi otomatis (tampil sekali — salin sebelum menutup halaman):
              </p>
              <ul className="divide-y rounded-lg border">
                {passwordEntries.map(([email, password]) => (
                  <li
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                    key={email}
                  >
                    <span className="truncate">{email}</span>
                    <code className="rounded bg-muted px-2 py-0.5">{password}</code>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <Button onClick={reset} type="button" variant="outline">
            Import file lain
          </Button>
        </div>
      ) : null}
    </div>
  )
}
