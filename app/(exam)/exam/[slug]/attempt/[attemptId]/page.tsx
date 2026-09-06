"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AlertCircle, FileText, Loader2, RefreshCw, WifiOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AttemptRunner } from "@/components/exam-components/attempt-runner"
import { LockedAttemptCard } from "@/components/exam-components/locked-attempt-card"
import {
  getAttemptSessionDataAction,
  type AttemptSessionDataResult,
} from "@/lib/attempts/actions"
import type { AttemptQuestion } from "@/lib/attempts/queries"
import type { AnswerValue } from "@/components/exam-components/answer-controls"

interface AttemptSessionState {
  attemptId: string
  scheduleId: string
  scheduleName: string
  scheduleSlug: string
  packageName: string
  nomorPeserta: string | null
  deadlineAt: string | null
  questions: AttemptQuestion[]
  initialAnswers: Record<string, AnswerValue>
  initialFlagged: string[]
}

export default function AttemptPage({
  params,
}: {
  params: Promise<{ slug: string; attemptId: string }>
}) {
  const { slug, attemptId } = use(params)
  const router = useRouter()

  const snapshotKey = `cbt_exam_${attemptId}_snapshot`

  // Attempt to initialize from localStorage snapshot for instant client render (CSR + offline)
  const [sessionData, setSessionData] = useState<AttemptSessionState | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(snapshotKey)
        if (cached) {
          return JSON.parse(cached)
        }
      } catch {
        // ignore cache error
      }
    }
    return null
  })

  const [isLoading, setIsLoading] = useState(!sessionData)
  const [error, setError] = useState<{
    code: string
    message: string
    scheduleId?: string
    scheduleName?: string
  } | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      try {
        const result: AttemptSessionDataResult =
          await getAttemptSessionDataAction(attemptId)

        if (!isMounted) return

        if (result.ok) {
          setSessionData(result.data)
          setError(null)
          // Cache snapshot in localStorage for offline resilience
          try {
            localStorage.setItem(snapshotKey, JSON.stringify(result.data))
          } catch {
            // ignore
          }
        } else {
          if (result.code === "unauthorized") {
            router.push("/login")
            return
          }
          if (result.code === "submitted" || result.code === "expired") {
            router.push(
              `/exam/${result.scheduleSlug || slug}/attempt/${attemptId}/result`
            )
            return
          }
          setError({
            code: result.code,
            message: result.message,
            scheduleId: result.scheduleId,
            scheduleName: result.scheduleName,
          })
        }
      } catch {
        if (!isMounted) return
        // If network error occurred but we already have local sessionData, we can proceed offline!
        if (!sessionData) {
          setError({
            code: "network_error",
            message:
              "Gagal memuat sesi ujian. Periksa koneksi internet Anda lalu coba lagi.",
          })
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [attemptId, router, slug, snapshotKey, sessionData])

  // Handle Locked Session (Device mismatch)
  if (error && error.code === "locked" && error.scheduleId) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4 bg-slate-50 dark:bg-background">
        <LockedAttemptCard
          attemptId={attemptId}
          scheduleId={error.scheduleId}
          scheduleSlug={slug}
          scheduleName={error.scheduleName || "Ujian"}
        />
      </main>
    )
  }

  // Handle Error (without cache)
  if (error && !sessionData) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-50 dark:bg-background">
        <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm text-center space-y-4">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            {error.code === "network_error" ? (
              <WifiOff className="size-6" />
            ) : (
              <AlertCircle className="size-6" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {error.code === "network_error"
                ? "Koneksi Terputus"
                : "Tidak Dapat Membuka Ujian"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1.5">
              {error.message}
            </p>
          </div>
          <div className="flex gap-2 justify-center pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.location.reload()}
              className="gap-1.5"
            >
              <RefreshCw className="size-4" />
              <span>Coba Lagi</span>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/dashboard">Kembali ke Dashboard</Link>
            </Button>
          </div>
        </div>
      </main>
    )
  }

  // Initial Loading state
  if (isLoading && !sessionData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-50 dark:bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-sm dark:bg-blue-950/50 dark:text-blue-400">
            <FileText className="size-7 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">
              Memuat Lembar Ujian CBT…
            </h3>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="size-3.5 animate-spin" />
              <span>Menyiapkan soal dan lembar jawaban Anda</span>
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!sessionData) {
    return null
  }

  return (
    <AttemptRunner
      attemptId={attemptId}
      deadlineAt={sessionData.deadlineAt}
      initialAnswers={sessionData.initialAnswers}
      initialFlagged={sessionData.initialFlagged}
      nomorPeserta={sessionData.nomorPeserta}
      questions={sessionData.questions}
      resultPath={`/exam/${sessionData.scheduleSlug || slug}/attempt/${attemptId}/result`}
      scheduleName={sessionData.scheduleName}
    />
  )
}
