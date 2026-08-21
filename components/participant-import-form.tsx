"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  CheckCircle2Icon,
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  FileDownIcon,
  FileEditIcon,
  FileSpreadsheetIcon,
  InfoIcon,
  Loader2Icon,
  ShieldCheckIcon,
  Trash2Icon,
  UploadCloudIcon,
  UploadIcon,
  XCircleIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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

export function ParticipantImportForm() {
  const [phase, setPhase] = useState<Phase>("idle")
  const [fileName, setFileName] = useState("")
  const [fileSize, setFileSize] = useState<number | null>(null)
  const [plan, setPlan] = useState<ImportPlan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<AppliedResult | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setPhase("idle")
    setPlan(null)
    setError(null)
    setResult(null)
    setFileName("")
    setFileSize(null)
    setIsDragging(false)
    setCopiedEmail(null)
    setCopiedAll(false)

    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      void handleParse(file)
    }
  }

  async function handleParse(file: File) {
    setBusy(true)
    setError(null)
    setResult(null)

    if (file.size > IMPORT_MAX_BYTES) {
      const msg = "File maksimal 2 MB."
      setError(msg)
      toast.error(msg)
      setBusy(false)
      return
    }

    const res = await parseParticipantImportAction(file)

    if (!res.ok) {
      setError(res.message)
      toast.error(res.message)
      setPhase("idle")
      setBusy(false)
      return
    }

    setPlan(res.plan)
    setFileName(file.name)
    setFileSize(file.size)
    setPhase("parsed")
    setBusy(false)
  }

  async function handleApply() {
    if (!plan) return

    setBusy(true)
    setError(null)

    const res = await applyParticipantImportAction(plan)

    if (!res.ok) {
      setError(res.message)
      toast.error(res.message)
      setBusy(false)
      return
    }

    setResult({
      created: res.created,
      generatedPasswords: res.generatedPasswords,
    })
    setPhase("applied")
    setBusy(false)
    toast.success(`${res.created} peserta berhasil diimpor!`)
  }

  async function handleCopyPassword(email: string, pass: string) {
    try {
      await navigator.clipboard.writeText(pass)
      setCopiedEmail(email)
      setTimeout(() => setCopiedEmail(null), 2000)
    } catch {
      toast.error("Gagal menyalin kata sandi.")
    }
  }

  async function handleCopyAllPasswords(passwords: Record<string, string>) {
    try {
      const text = Object.entries(passwords)
        .map(([email, pass]) => `${email}\t${pass}`)
        .join("\n")
      await navigator.clipboard.writeText(text)
      setCopiedAll(true)
      toast.success("Semua kata sandi berhasil disalin!")
      setTimeout(() => setCopiedAll(false), 2000)
    } catch {
      toast.error("Gagal menyalin semua kata sandi.")
    }
  }

  const passwordEntries = Object.entries(result?.generatedPasswords ?? {})

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Top Guidance & Information Card */}
      <div className="grid grid-cols-1 items-center gap-6 rounded-2xl border bg-card p-6 shadow-xs lg:grid-cols-12">
        {/* Left: Spreadsheet Illustration */}
        <div className="flex justify-center lg:col-span-3">
          <div className="relative flex size-32 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 dark:bg-emerald-500/15">
            <div className="relative flex flex-col items-center">
              <FileSpreadsheetIcon className="size-16 text-emerald-600 dark:text-emerald-400" />
              <div className="mt-1 flex items-center gap-1 rounded bg-emerald-600/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                .XLSX
              </div>
            </div>
            <div className="absolute -right-2 -bottom-2 flex size-8 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md">
              <DownloadIcon className="size-4" />
            </div>
          </div>
        </div>

        {/* Middle: Cara import peserta */}
        <div className="flex flex-col gap-3.5 lg:col-span-5">
          <h3 className="text-sm font-bold text-foreground">
            Cara import peserta
          </h3>

          {/* Step 1 */}
          <div className="flex items-start gap-3">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20">
              <FileDownIcon className="size-3.5" />
            </div>
            <div>
              <a
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary underline-offset-4 hover:underline"
                href="/api/participants/template"
              >
                <span>Unduh template Excel (.xlsx)</span>
                <DownloadIcon className="size-3" />
              </a>
              <p className="text-[11px] text-muted-foreground">
                File berisi format kolom yang wajib diisi.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20">
              <FileEditIcon className="size-3.5" />
            </div>
            <div>
              <span className="block text-xs font-semibold text-foreground">
                Isi data peserta pada file template
              </span>
              <p className="text-[11px] text-muted-foreground">
                Pastikan kolom{" "}
                <span className="font-medium text-foreground">Nama</span> dan{" "}
                <span className="font-medium text-foreground">Email</span>{" "}
                terisi lengkap.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20">
              <ShieldCheckIcon className="size-3.5" />
            </div>
            <div>
              <span className="block text-xs font-semibold text-foreground">
                Unggah file untuk proses validasi
              </span>
              <p className="text-[11px] text-muted-foreground">
                Import hanya berjalan jika seluruh baris valid.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Informasi penting Callout */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 p-4.5 lg:col-span-4 dark:border-primary/20 dark:bg-primary/10">
          <div className="relative flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <InfoIcon className="size-4 shrink-0 text-primary" />
              <h4 className="text-xs font-bold text-foreground">
                Informasi penting
              </h4>
            </div>
            <ul className="space-y-1.5 text-[11px] text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <span className="size-1 shrink-0 rounded-full bg-primary/70" />
                <span>File harus berformat .xlsx</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="size-1 shrink-0 rounded-full bg-primary/70" />
                <span>Maksimal ukuran file: 2 MB (hingga 500 baris)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="size-1 shrink-0 rounded-full bg-primary/70" />
                <span>Pastikan tidak mengubah susunan kolom template</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="size-1 shrink-0 rounded-full bg-primary/70" />
                <span>Email duplikat di file atau sistem akan ditolak</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="size-1 shrink-0 rounded-full bg-primary/70" />
                <span>Hanya baris yang 100% valid yang akan diimpor</span>
              </li>
            </ul>
          </div>
          <FileSpreadsheetIcon className="pointer-events-none absolute -right-3 -bottom-3 size-24 text-primary/5 dark:text-primary/10" />
        </div>
      </div>

      {/* Main Interactive Work Area */}
      {phase === "idle" && (
        <div className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-xs md:p-8">
          <input
            accept=".xlsx"
            aria-label="File peserta"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleParse(file)
            }}
            ref={inputRef}
            type="file"
          />

          {/* Dropzone Area */}
          <div
            className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all md:p-12 ${
              isDragging
                ? "scale-[1.005] border-primary bg-primary/10"
                : "border-primary/30 hover:border-primary/60 hover:bg-primary/5 dark:border-primary/40"
            }`}
            onClick={() => inputRef.current?.click()}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            role="button"
            tabIndex={0}
          >
            <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20">
              {busy ? (
                <Loader2Icon className="size-7 animate-spin" />
              ) : (
                <UploadCloudIcon className="size-7" />
              )}
            </div>
            <h3 className="text-base font-bold text-foreground">
              Unggah file Excel (.xlsx)
            </h3>
            <p className="mt-1 mb-4 text-xs text-muted-foreground">
              Drag & drop file ke area ini atau klik tombol di bawah
            </p>
            <Button
              className="gap-2"
              disabled={busy}
              onClick={(e) => {
                e.stopPropagation()
                inputRef.current?.click()
              }}
              type="button"
            >
              <UploadIcon className="size-4" />
              <span>{busy ? "Membaca file..." : "Pilih File Excel"}</span>
            </Button>
          </div>

          {/* Status file */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileSpreadsheetIcon className="size-4" />
            <span>Belum ada file yang dipilih</span>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
              <XCircleIcon className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Footer Security Badge */}
          <div className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-muted-foreground dark:border-primary/20 dark:bg-primary/10">
            <ShieldCheckIcon className="size-4 shrink-0 text-primary" />
            <span>
              Data peserta Anda aman. File hanya digunakan untuk proses import
              dan tidak disimpan di server.
            </span>
          </div>

          {/* Actions: Default Back Button */}
          <div className="flex items-center pt-2">
            <Button asChild variant="outline">
              <Link href="/dashboard/users" className="gap-2">
                <ArrowLeftIcon className="size-4" />
                <span>Kembali ke Daftar Pengguna</span>
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Phase 2: Parsed / Validation Preview */}
      {phase === "parsed" && plan && (
        <div className="flex flex-col gap-6 rounded-2xl border bg-card p-6 shadow-xs">
          {/* File Summary Card */}
          <div className="flex flex-col justify-between gap-4 rounded-xl border bg-muted/40 p-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20">
                <FileSpreadsheetIcon className="size-5" />
              </div>
              <div>
                <span className="block text-sm font-semibold text-foreground">
                  {fileName}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {plan.rows.length} baris peserta ditemukan
                  {fileSize ? ` · ${(fileSize / 1024).toFixed(1)} KB` : ""}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {plan.valid ? (
                <Badge variant="success" className="gap-1 px-2.5 py-1">
                  <CheckCircle2Icon className="size-3.5" />
                  <span>Semua Valid ({plan.rows.length} baris)</span>
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1 px-2.5 py-1">
                  <XCircleIcon className="size-3.5" />
                  <span>{plan.errors.length} Masalah Ditemukan</span>
                </Badge>
              )}
              <Button
                aria-label="Hapus file"
                className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={reset}
                size="icon"
                title="Hapus file"
                type="button"
                variant="ghost"
              >
                <Trash2Icon className="size-4" />
              </Button>
            </div>
          </div>

          {/* Error List if any */}
          {plan.errors.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
                <AlertTriangleIcon className="size-4 shrink-0" />
                <span>
                  Perbaiki kesalahan berikut pada file Excel Anda lalu unggah
                  kembali:
                </span>
              </div>

              <div className="max-h-72 overflow-y-auto rounded-xl border border-destructive/20 bg-destructive/5 dark:bg-destructive/10">
                <ul className="divide-y divide-destructive/10 text-xs">
                  {plan.errors.map((err, i) => (
                    <li
                      className="flex items-start gap-3 p-3 text-destructive"
                      key={`${err.rowNumber}-${err.message}-${i}`}
                    >
                      <span className="shrink-0 rounded bg-destructive/15 px-1.5 py-0.5 font-bold">
                        Baris {err.rowNumber}
                      </span>
                      <span>{err.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
              <XCircleIcon className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions: Left Back / Right Actions */}
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <Button asChild variant="outline">
              <Link href="/dashboard/users" className="gap-2">
                <ArrowLeftIcon className="size-4" />
                <span>Kembali ke Daftar Pengguna</span>
              </Link>
            </Button>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                disabled={busy}
                onClick={reset}
                type="button"
                variant="outline"
              >
                Ganti File
              </Button>
              <Button
                className="gap-2"
                disabled={!plan.valid || busy}
                onClick={handleApply}
                type="button"
              >
                {busy ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2Icon className="size-4" />
                )}
                <span>
                  {busy
                    ? "Mengimpor peserta..."
                    : `Import ${plan.rows.length} Peserta`}
                </span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 3: Applied / Success & Generated Passwords */}
      {phase === "applied" && result && (
        <div className="flex flex-col gap-6 rounded-2xl border bg-card p-6 shadow-xs">
          {/* Success Banner */}
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2Icon className="size-5 shrink-0" />
            <div>
              <h4 className="text-sm font-bold">Import Selesai</h4>
              <p className="text-xs">
                Sebanyak {result.created} peserta berhasil ditambahkan ke dalam
                sistem.
              </p>
            </div>
          </div>

          {/* Auto-generated Passwords Section */}
          {passwordEntries.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    Kata Sandi Otomatis
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Tampil hanya sekali — pastikan untuk menyalin atau menyimpan
                    daftar ini sebelum menutup halaman.
                  </p>
                </div>
                <Button
                  className="gap-1.5 self-start sm:self-auto"
                  onClick={() =>
                    handleCopyAllPasswords(result.generatedPasswords)
                  }
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {copiedAll ? (
                    <CheckIcon className="size-3.5 text-emerald-600" />
                  ) : (
                    <CopyIcon className="size-3.5" />
                  )}
                  <span>
                    {copiedAll ? "Tersalin!" : "Salin Semua Password"}
                  </span>
                </Button>
              </div>

              <div className="max-h-80 overflow-y-auto rounded-xl border">
                <ul className="divide-y divide-border text-xs">
                  {passwordEntries.map(([email, pass]) => {
                    const isCopied = copiedEmail === email
                    return (
                      <li
                        className="flex items-center justify-between gap-3 p-3 hover:bg-muted/30"
                        key={email}
                      >
                        <span className="truncate font-medium text-foreground">
                          {email}
                        </span>
                        <div className="flex items-center gap-2">
                          <code className="rounded-md bg-muted px-2 py-1 font-mono text-xs">
                            {pass}
                          </code>
                          <Button
                            className="size-7"
                            onClick={() => handleCopyPassword(email, pass)}
                            size="icon"
                            title="Salin password"
                            type="button"
                            variant="ghost"
                          >
                            {isCopied ? (
                              <CheckIcon className="size-3.5 text-emerald-600" />
                            ) : (
                              <CopyIcon className="size-3.5 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          )}

          {/* Navigation Action Buttons: Left Back / Right Import another */}
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <Button asChild variant="outline">
              <Link href="/dashboard/users" className="gap-2">
                <ArrowLeftIcon className="size-4" />
                <span>Kembali ke Daftar Pengguna</span>
              </Link>
            </Button>

            <Button onClick={reset} type="button" className="gap-2">
              <UploadIcon className="size-4" />
              <span>Import File Lain</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
