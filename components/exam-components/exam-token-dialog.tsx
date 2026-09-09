"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, KeyRound, ShieldAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { verifyExamScheduleTokenAction } from "@/lib/exam-schedules/actions"

interface ExamTokenDialogProps {
  isOpen: boolean
  onClose: () => void
  scheduleId: string
  scheduleName: string
  packageName: string
  slug: string
  status: "upcoming" | "ongoing"
}

export function ExamTokenDialog({
  isOpen,
  onClose,
  scheduleId,
  scheduleName,
  packageName,
  slug,
  status,
}: ExamTokenDialogProps) {
  const router = useRouter()
  const [tokenInput, setTokenInput] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null)
  const [isVerifying, startVerifyTransition] = useTransition()

  function handleClose() {
    setTokenInput("")
    setError(null)
    onClose()
  }

  // Handle rate-limiting cooldown timer
  useEffect(() => {
    if (!cooldownSeconds || cooldownSeconds <= 0) return

    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (!prev || prev <= 1) return null
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [cooldownSeconds])

  function handleVerify(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!tokenInput.trim() || cooldownSeconds) return

    setError(null)
    startVerifyTransition(async () => {
      const normalized = tokenInput.trim().toUpperCase()
      const result = await verifyExamScheduleTokenAction({
        scheduleId,
        token: normalized,
      })

      if (!result.ok) {
        setError(result.message)
        if (result.retryAfterSeconds) {
          setCooldownSeconds(result.retryAfterSeconds)
        }
      } else {
        handleClose()
        // Navigate based on schedule status
        if (status === "upcoming") {
          router.push(`/exam/${slug}/waiting-room`)
        } else {
          router.push(`/exam/${slug}/intro`)
        }
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <div className="rounded-full bg-primary/10 p-2">
              <KeyRound className="size-5" />
            </div>
            <DialogTitle>Masukkan Token Ujian</DialogTitle>
          </div>
          <DialogDescription>
            Sesi ujian <strong className="text-foreground">{scheduleName}</strong> (
            {packageName}) memerlukan token akses yang diberikan oleh pengawas ujian.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleVerify} className="space-y-4 py-2">
          <div className="space-y-2">
            <label
              htmlFor="token-input"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Token Ujian (6 Karakter)
            </label>
            <div className="relative">
              <Input
                id="token-input"
                autoFocus
                disabled={isVerifying || Boolean(cooldownSeconds)}
                maxLength={6}
                onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                placeholder="CONTOH"
                value={tokenInput}
                className="font-mono text-center text-xl font-bold tracking-[0.3em] uppercase h-12"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {cooldownSeconds && cooldownSeconds > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
              <ShieldAlert className="size-4 shrink-0" />
              <span>
                Terlalu banyak percobaan gagal. Silakan tunggu{" "}
                <strong className="font-mono">{cooldownSeconds}</strong> detik lagi.
              </span>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isVerifying}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={
                tokenInput.trim().length < 4 ||
                isVerifying ||
                Boolean(cooldownSeconds)
              }
            >
              {isVerifying ? "Memverifikasi…" : "Verifikasi & Masuk"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
