"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  KeyRound,
  Lock,
  Play,
  RefreshCw,
  ShieldAlert,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  recoverAttemptSessionAction,
  startAttemptAction,
} from "@/lib/attempts/actions"
import { verifyExamScheduleTokenAction } from "@/lib/exam-schedules/actions"

interface WaitingRoomProps {
  scheduleId: string
  scheduleSlug: string
  scheduleName: string
  startsAt: string
  endsAt: string
  openAttemptId: string | null
  requiresToken: boolean
}

export function WaitingRoom({
  scheduleId,
  scheduleSlug,
  scheduleName,
  startsAt,
  endsAt,
  openAttemptId,
  requiresToken,
}: WaitingRoomProps) {
  const router = useRouter()
  const [tokenInput, setTokenInput] = useState("")
  const [isTokenVerified, setIsTokenVerified] = useState(Boolean(openAttemptId))
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [tokenCooldownSeconds, setTokenCooldownSeconds] = useState<number | null>(
    null
  )

  // Recovery State
  const [isLocked, setIsLocked] = useState(false)
  const [lockedAttemptId, setLockedAttemptId] = useState<string | null>(
    openAttemptId
  )
  const [recoveryToken, setRecoveryToken] = useState("")
  const [recoveryError, setRecoveryError] = useState<string | null>(null)

  const [isStarting, startTransition] = useTransition()
  const [isVerifying, startVerifyTransition] = useTransition()
  const [isRecovering, startRecoverTransition] = useTransition()

  // Countdown to startsAt & Exam ended state
  const [timeRemaining, setTimeRemaining] = useState<number>(() => {
    const diff = new Date(startsAt).getTime() - Date.now()
    return Math.max(0, Math.floor(diff / 1000))
  })
  const [isExamEnded, setIsExamEnded] = useState<boolean>(() => {
    return new Date(endsAt).getTime() <= Date.now()
  })

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      const diff = new Date(startsAt).getTime() - now
      const remaining = Math.max(0, Math.floor(diff / 1000))
      setTimeRemaining(remaining)
      setIsExamEnded(new Date(endsAt).getTime() <= now)
    }, 1000)

    return () => clearInterval(interval)
  }, [startsAt, endsAt])

  // Cooldown timer effect
  useEffect(() => {
    if (!tokenCooldownSeconds || tokenCooldownSeconds <= 0) return

    const timer = setInterval(() => {
      setTokenCooldownSeconds((prev) => {
        if (!prev || prev <= 1) return null
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [tokenCooldownSeconds])

  const isExamStarted = timeRemaining <= 0

  const hours = Math.floor(timeRemaining / 3600)
  const minutes = Math.floor((timeRemaining % 3600) / 60)
  const seconds = timeRemaining % 60

  const formattedCountdown = `${String(hours).padStart(2, "0")}:${String(
    minutes
  ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`

  function handleVerifyToken(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!tokenInput.trim() || tokenCooldownSeconds) return

    setTokenError(null)
    startVerifyTransition(async () => {
      const result = await verifyExamScheduleTokenAction({
        scheduleId,
        token: tokenInput.trim().toUpperCase(),
      })

      if (!result.ok) {
        setTokenError(result.message)
        if (result.retryAfterSeconds) {
          setTokenCooldownSeconds(result.retryAfterSeconds)
        }
      } else {
        setIsTokenVerified(true)
        setTokenError(null)
      }
    })
  }

  function handleStartExam() {
    startTransition(async () => {
      const result = await startAttemptAction(scheduleId)

      if (!result.ok) {
        if ("locked" in result && result.locked) {
          setIsLocked(true)
          if (openAttemptId) {
            setLockedAttemptId(openAttemptId)
          }
        }
        setTokenError(result.message)
        return
      }

      router.push(`/exam/${scheduleSlug}/attempt/${result.attemptId}`)
    })
  }

  function handleRecoverSession(e: React.FormEvent) {
    e.preventDefault()
    if (!recoveryToken.trim() || !lockedAttemptId) return

    setRecoveryError(null)
    startRecoverTransition(async () => {
      const result = await recoverAttemptSessionAction({
        attemptId: lockedAttemptId,
        scheduleId,
        token: recoveryToken.trim().toUpperCase(),
      })

      if (!result.ok) {
        setRecoveryError(result.message)
        return
      }

      router.push(`/exam/${scheduleSlug}/attempt/${result.attemptId}`)
    })
  }

  if (isExamEnded) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <Clock className="mx-auto h-8 w-8 text-destructive mb-2" />
        <h3 className="font-semibold text-lg text-destructive">
          Sesi Ujian Telah Berakhir
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Waktu pelaksanaan jadwal ujian ini telah selesai.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Session Lock & Recovery Card */}
      {isLocked && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-foreground">
          <div className="flex items-start gap-4">
            <ShieldAlert className="h-6 w-6 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="flex flex-col gap-2 flex-1">
              <h3 className="font-semibold text-base">
                Sesi Ujian Sedang Berjalan di Perangkat Lain
              </h3>
              <p className="text-sm text-muted-foreground">
                Ujian ini sedang terkunci pada sesi atau perangkat Anda yang
                sebelumnya. Jika perangkat Anda sebelumnya tertutup, kehabisan
                baterai, atau mengalami kendala, Anda dapat memulihkan sesi ke
                perangkat ini dengan memasukkan Token Ujian.
              </p>

              <form
                onSubmit={handleRecoverSession}
                className="mt-3 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center max-w-md"
              >
                <Input
                  className="uppercase tracking-widest font-mono text-center font-bold"
                  maxLength={6}
                  placeholder="TOKEN"
                  value={recoveryToken}
                  onChange={(e) => setRecoveryToken(e.target.value.toUpperCase())}
                  disabled={isRecovering}
                  required
                />
                <Button
                  type="submit"
                  disabled={isRecovering || recoveryToken.length < 6}
                  className="whitespace-nowrap"
                >
                  {isRecovering ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Memulihkan…
                    </>
                  ) : (
                    "Pulihkan Sesi"
                  )}
                </Button>
              </form>

              {recoveryError && (
                <p className="text-xs text-destructive mt-1 flex items-center gap-1.5 font-medium">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {recoveryError}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Waiting Room & Countdown Shell */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b">
          <div className="flex flex-col gap-1 text-center md:text-left">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ruang Tunggu Ujian
            </span>
            <h2 className="text-xl font-bold">{scheduleName}</h2>
          </div>

          {!isExamStarted ? (
            <div className="flex flex-col items-center md:items-end gap-1">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" />
                Ujian dimulai dalam:
              </span>
              <div className="font-mono text-2xl font-bold tracking-widest bg-muted/60 px-3 py-1 rounded-lg border">
                {formattedCountdown}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium text-sm bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
              <CheckCircle2 className="h-4 w-4" />
              Sesi Ujian Sedang Berlangsung
            </div>
          )}
        </div>

        {/* Token Validation Section */}
        <div className="pt-6 flex flex-col gap-6">
          {requiresToken && !openAttemptId && (
            <div className="flex flex-col gap-3">
              <label
                htmlFor="exam-token"
                className="text-sm font-medium flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-muted-foreground" />
                  Masukkan Token Ujian
                </span>
                {isTokenVerified && (
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Token Terverifikasi
                  </span>
                )}
              </label>

              <form
                onSubmit={handleVerifyToken}
                className="flex flex-col sm:flex-row gap-3 items-stretch max-w-md"
              >
                <Input
                  id="exam-token"
                  className={`uppercase tracking-widest font-mono text-center font-bold text-lg h-11 ${
                    isTokenVerified
                      ? "border-emerald-500 focus-visible:ring-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                      : ""
                  }`}
                  maxLength={6}
                  placeholder="6 DIGIT"
                  value={tokenInput}
                  onChange={(e) => {
                    setTokenInput(e.target.value.toUpperCase())
                    setIsTokenVerified(false)
                    setTokenError(null)
                  }}
                  disabled={isVerifying || Boolean(tokenCooldownSeconds)}
                />
                {!isTokenVerified && (
                  <Button
                    type="submit"
                    variant="outline"
                    className="h-11 px-5"
                    disabled={
                      isVerifying ||
                      tokenInput.trim().length < 6 ||
                      Boolean(tokenCooldownSeconds)
                    }
                  >
                    {isVerifying ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      "Verifikasi"
                    )}
                  </Button>
                )}
              </form>

              {tokenCooldownSeconds ? (
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  Terlalu banyak percobaan gagal. Silakan tunggu{" "}
                  <span className="font-bold">{tokenCooldownSeconds}</span> detik
                  sebelum mencoba lagi.
                </p>
              ) : tokenError ? (
                <p className="text-xs text-destructive font-medium flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {tokenError}
                </p>
              ) : null}
            </div>
          )}

          {/* Action Trigger */}
          <div className="flex flex-col gap-2 pt-2">
            <Button
              size="lg"
              className="w-full sm:w-auto self-start px-8 font-semibold h-12 text-base"
              disabled={
                isStarting ||
                !isExamStarted ||
                (requiresToken && !openAttemptId && !isTokenVerified)
              }
              onClick={handleStartExam}
            >
              {isStarting ? (
                <>
                  <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                  Mempersiapkan Soal…
                </>
              ) : !isExamStarted ? (
                <>
                  <Lock className="mr-2 h-5 w-5 opacity-70" />
                  Menunggu Waktu Ujian
                </>
              ) : openAttemptId ? (
                <>
                  <Play className="mr-2 h-5 w-5" />
                  Lanjutkan Ujian
                </>
              ) : (
                <>
                  <Play className="mr-2 h-5 w-5" />
                  Mulai Ujian
                </>
              )}
            </Button>

            {!isExamStarted && (
              <p className="text-xs text-muted-foreground">
                Tombol akan aktif secara otomatis saat waktu mulai ujian tiba.
              </p>
            )}
            {requiresToken && !openAttemptId && !isTokenVerified && isExamStarted && (
              <p className="text-xs text-muted-foreground">
                Masukkan dan verifikasi token ujian di atas untuk mengaktifkan tombol
                mulai.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
