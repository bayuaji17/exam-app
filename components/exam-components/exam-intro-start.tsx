"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowRight,
  Lock,
  Play,
  RefreshCw,
  RotateCcw,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  recoverAttemptSessionAction,
  startAttemptAction,
} from "@/lib/attempts/actions"

interface ExamIntroStartProps {
  scheduleId: string
  scheduleSlug: string
  openAttemptId: string | null
  canStart: boolean
}

export function ExamIntroStart({
  scheduleId,
  scheduleSlug,
  openAttemptId,
  canStart,
}: ExamIntroStartProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isLocked, setIsLocked] = useState(false)
  const [recoveryToken, setRecoveryToken] = useState("")
  const [recoveryError, setRecoveryError] = useState<string | null>(null)

  const [isStarting, startTransition] = useTransition()
  const [isRecovering, startRecoverTransition] = useTransition()

  function handleStart() {
    setError(null)
    startTransition(async () => {
      const result = await startAttemptAction(scheduleId)

      if (!result.ok) {
        if ("locked" in result && result.locked) {
          setIsLocked(true)
        }
        setError(result.message)
        return
      }

      router.push(`/exam/${scheduleSlug}/attempt/${result.attemptId}`)
    })
  }

  function handleRecoverSession(e: React.FormEvent) {
    e.preventDefault()
    if (!recoveryToken.trim()) return

    setRecoveryError(null)
    startRecoverTransition(async () => {
      const targetAttemptId = openAttemptId
      if (!targetAttemptId) {
        setRecoveryError("Tidak ditemukan sesi pengerjaan aktif.")
        return
      }

      const result = await recoverAttemptSessionAction({
        attemptId: targetAttemptId,
        scheduleId,
        token: recoveryToken.trim().toUpperCase(),
      })

      if (!result.ok) {
        setRecoveryError(result.message)
      } else {
        router.push(`/exam/${scheduleSlug}/attempt/${result.attemptId}`)
      }
    })
  }

  if (isLocked) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-destructive/10 p-3 text-destructive">
            <Lock className="size-6" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="text-base font-semibold text-destructive">
                Sesi Ujian Terkunci di Perangkat Lain
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Ujian ini terikat dengan sesi perangkat sebelumnya. Jika perangkat
                Anda mengalami crash atau kendala teknis, masukkan token ujian kembali
                untuk memindahkan sesi ke perangkat ini.
              </p>
            </div>

            <form onSubmit={handleRecoverSession} className="flex flex-col gap-3 max-w-md">
              <div className="flex gap-2">
                <Input
                  autoFocus
                  disabled={isRecovering}
                  maxLength={6}
                  onChange={(e) => setRecoveryToken(e.target.value.toUpperCase())}
                  placeholder="TOKEN UJIAN"
                  value={recoveryToken}
                  className="font-mono uppercase font-bold tracking-widest text-center"
                />
                <Button
                  disabled={recoveryToken.trim().length < 4 || isRecovering}
                  type="submit"
                  variant="destructive"
                  className="shrink-0 gap-1.5"
                >
                  {isRecovering ? (
                    <RefreshCw className="size-4 animate-spin" />
                  ) : (
                    <RotateCcw className="size-4" />
                  )}
                  <span>Pulihkan Sesi</span>
                </Button>
              </div>

              {recoveryError && (
                <div className="flex items-center gap-2 text-xs text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{recoveryError}</span>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 pt-2">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {openAttemptId ? (
        <Button
          size="lg"
          className="h-12 w-full sm:w-auto text-base font-semibold gap-2 shadow-md"
          onClick={() => router.push(`/exam/${scheduleSlug}/attempt/${openAttemptId}`)}
        >
          <Play className="size-5 fill-current" />
          <span>Lanjutkan Pengerjaan Ujian</span>
          <ArrowRight className="size-5" />
        </Button>
      ) : canStart ? (
        <Button
          size="lg"
          className="h-12 w-full sm:w-auto text-base font-semibold gap-2 shadow-md bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={handleStart}
          disabled={isStarting}
        >
          {isStarting ? (
            <>
              <RefreshCw className="size-5 animate-spin" />
              <span>Menyiapkan Lembar Ujian…</span>
            </>
          ) : (
            <>
              <Play className="size-5 fill-current" />
              <span>Mulai Mengerjakan Ujian</span>
              <ArrowRight className="size-5" />
            </>
          )}
        </Button>
      ) : null}
    </div>
  )
}
