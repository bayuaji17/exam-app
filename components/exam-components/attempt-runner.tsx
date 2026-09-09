"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  FileText,
  Flag,
  RefreshCw,
  WifiOff,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  submitAttemptAction,
  saveAnswerAction,
  toggleFlagAction,
} from "@/lib/attempts/actions"
import type { AttemptQuestion } from "@/lib/attempts/queries"
import { AnswerControls, type AnswerValue } from "./answer-controls"
import { AttemptTimer } from "./attempt-timer"
import { QuestionNavigator } from "./question-navigator"
import { QuestionRenderer } from "./question-renderer"

interface OutboxItem {
  id: string
  type: "answer" | "flag"
  questionId: string
  answerValue?: AnswerValue
  isFlagged?: boolean
  timestamp: number
}

function getStorageKey(attemptId: string, suffix: string): string {
  return `cbt_exam_${attemptId}_${suffix}`
}

export function AttemptRunner({
  attemptId,
  scheduleName,
  nomorPeserta,
  deadlineAt,
  questions,
  initialAnswers,
  initialFlagged = [],
  resultPath,
}: {
  attemptId: string
  scheduleName: string
  nomorPeserta?: string | null
  deadlineAt: string | null
  questions: AttemptQuestion[]
  initialAnswers: Record<string, AnswerValue>
  initialFlagged?: string[]
  resultPath: string
}) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)

  // Hydrate initial answers and flags from localStorage if available (offline-first)
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(getStorageKey(attemptId, "answers"))
        if (cached) {
          const parsed = JSON.parse(cached)
          return { ...initialAnswers, ...parsed }
        }
      } catch {
        // Fallback to initialAnswers
      }
    }
    return initialAnswers
  })

  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(getStorageKey(attemptId, "flags"))
        if (cached) {
          const parsed: string[] = JSON.parse(cached)
          return new Set([...initialFlagged, ...parsed])
        }
      } catch {
        // Fallback to initialFlagged
      }
    }
    return new Set(initialFlagged)
  })

  // Network & Sync State
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  )
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(() => new Date())
  const [pendingOutboxCount, setPendingOutboxCount] = useState<number>(() => {
    if (typeof window === "undefined") return 0
    try {
      const raw = localStorage.getItem("cbt_exam_" + attemptId + "_outbox")
      return raw ? JSON.parse(raw).length : 0
    } catch {
      return 0
    }
  })

  // Submission State
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [finished, setFinished] = useState(false)

  const debounceRefs = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const question = questions[currentIndex]
  const isCurrentFlagged = question ? flaggedIds.has(question.questionId) : false

  // Helper to read & write outbox queue
  const getOutbox = useCallback((): OutboxItem[] => {
    if (typeof window === "undefined") return []
    try {
      const raw = localStorage.getItem(getStorageKey(attemptId, "outbox"))
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }, [attemptId])

  const setOutbox = useCallback(
    (items: OutboxItem[]) => {
      if (typeof window === "undefined") return
      try {
        localStorage.setItem(
          getStorageKey(attemptId, "outbox"),
          JSON.stringify(items)
        )
        setPendingOutboxCount(items.length)
      } catch {
        // storage quota exceeded or unavailable
      }
    },
    [attemptId]
  )

  // Flush Outbox items to server
  const flushOutbox = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return
    }

    const items = getOutbox()
    if (items.length === 0) {
      return
    }

    setIsSyncing(true)
    const remaining: OutboxItem[] = []

    for (const item of items) {
      try {
        if (item.type === "answer" && item.answerValue) {
          const isFlg = flaggedIds.has(item.questionId)
          const res = await saveAnswerAction(
            attemptId,
            item.questionId,
            item.answerValue,
            isFlg
          )
          if (!res.ok) {
            remaining.push(item)
          }
        } else if (item.type === "flag" && typeof item.isFlagged === "boolean") {
          const res = await toggleFlagAction(
            attemptId,
            item.questionId,
            item.isFlagged
          )
          if (!res.ok) {
            remaining.push(item)
          }
        }
      } catch {
        // Network error during send
        remaining.push(item)
      }
    }

    setOutbox(remaining)
    setIsSyncing(false)
    if (remaining.length === 0) {
      setLastSyncedAt(new Date())
    }
  }, [attemptId, flaggedIds, getOutbox, setOutbox])

  // Setup Online / Offline listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      toast.success("Koneksi internet terhubung kembali. Menyinkronkan jawaban…")
      void flushOutbox()
    }

    const handleOffline = () => {
      setIsOnline(false)
      toast.warning(
        "Koneksi terputus. Mode offline aktif; jawaban Anda tetap aman di perangkat lokal."
      )
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)


    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [flushOutbox, getOutbox])

  // Answered indexes computation
  const answeredIndexes = useMemo(() => {
    const indexes = new Set<number>()

    for (let index = 0; index < questions.length; index += 1) {
      const entry = questions[index]
      const value = answers[entry.questionId]

      if (entry.type === "manual") {
        if (value != null && "text" in value && value.text.trim().length > 0) {
          indexes.add(index)
        }
      } else if (
        value != null &&
        "chosenOptionId" in value &&
        value.chosenOptionId !== null
      ) {
        indexes.add(index)
      }
    }

    return indexes
  }, [answers, questions])

  const flaggedIndexes = useMemo(() => {
    const indexes = new Set<number>()
    for (let index = 0; index < questions.length; index += 1) {
      if (flaggedIds.has(questions[index].questionId)) {
        indexes.add(index)
      }
    }
    return indexes
  }, [flaggedIds, questions])

  // Queue answer save: writes immediately to LocalStorage, queues outbox, debounces network sync
  function queueSave(questionId: string, value: AnswerValue) {
    // 1. Optimistic Local React State
    setAnswers((current) => {
      const next = { ...current, [questionId]: value }
      try {
        localStorage.setItem(
          getStorageKey(attemptId, "answers"),
          JSON.stringify(next)
        )
      } catch {
        // ignore storage error
      }
      return next
    })

    // 2. Queue in Outbox
    const currentOutbox = getOutbox()
    // Replace existing answer for same question if still pending
    const filtered = currentOutbox.filter(
      (item) => !(item.type === "answer" && item.questionId === questionId)
    )
    const nextItem: OutboxItem = {
      id: `${questionId}_${Date.now()}`,
      type: "answer",
      questionId,
      answerValue: value,
      timestamp: Date.now(),
    }
    setOutbox([...filtered, nextItem])

    // 3. Debounce sync to server
    const existing = debounceRefs.current.get(questionId)
    if (existing) {
      clearTimeout(existing)
    }

    const timeout = setTimeout(() => {
      void (async () => {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          return // Keep in outbox, will sync when reconnected
        }

        try {
          const isFlg = flaggedIds.has(questionId)
          const res = await saveAnswerAction(attemptId, questionId, value, isFlg)
          if (res.ok) {
            // Remove from outbox
            const updated = getOutbox().filter(
              (item) =>
                !(item.type === "answer" && item.questionId === questionId)
            )
            setOutbox(updated)
            setLastSyncedAt(new Date())
          }
        } catch {
          // Network failure, stays in outbox
        }
      })()
    }, 600)

    debounceRefs.current.set(questionId, timeout)
  }

  // Toggle flag: immediately persists locally & queues to server
  async function handleToggleFlag() {
    if (!question) return

    const questionId = question.questionId
    const nextState = !isCurrentFlagged

    // 1. Update React state & localStorage
    setFlaggedIds((prev) => {
      const next = new Set(prev)
      if (nextState) {
        next.add(questionId)
      } else {
        next.delete(questionId)
      }
      try {
        localStorage.setItem(
          getStorageKey(attemptId, "flags"),
          JSON.stringify(Array.from(next))
        )
      } catch {
        // ignore
      }
      return next
    })

    // 2. Queue in Outbox
    const currentOutbox = getOutbox()
    const filtered = currentOutbox.filter(
      (item) => !(item.type === "flag" && item.questionId === questionId)
    )
    const nextItem: OutboxItem = {
      id: `flag_${questionId}_${Date.now()}`,
      type: "flag",
      questionId,
      isFlagged: nextState,
      timestamp: Date.now(),
    }
    setOutbox([...filtered, nextItem])

    // 3. Sync if online
    if (typeof navigator !== "undefined" && navigator.onLine) {
      try {
        const res = await toggleFlagAction(attemptId, questionId, nextState)
        if (res.ok) {
          const updated = getOutbox().filter(
            (item) =>
              !(item.type === "flag" && item.questionId === questionId)
          )
          setOutbox(updated)
        }
      } catch {
        // Network failure, stays in outbox
      }
    }
  }

  // Manual Sync trigger
  async function handleManualSync() {
    if (isSyncing || submitting || finished) return

    if (!isOnline) {
      toast.error(
        "Tidak dapat menyinkronkan saat offline. Periksa koneksi internet Anda."
      )
      return
    }

    setIsSyncing(true)
    try {
      await flushOutbox()
      toast.success("Semua jawaban tersinkronisasi ke server.")
    } catch {
      toast.error("Terjadi kendala saat menyinkronkan jawaban.")
    } finally {
      setIsSyncing(false)
    }
  }

  // Submit Attempt
  async function handleSubmit() {
    if (finished) return

    // Offline guard
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setSubmitError(
        "Koneksi internet terputus. Anda tidak dapat mengumpulkan ujian dalam kondisi offline. Harap periksa koneksi atau hubungi pengawas ujian."
      )
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    // Flush any pending items
    await flushOutbox()

    const remainingOutbox = getOutbox()
    if (remainingOutbox.length > 0) {
      setSubmitError(
        "Masih terdapat jawaban yang belum berhasil terkirim ke server. Silakan coba lagi setelah koneksi stabil."
      )
      setSubmitting(false)
      return
    }

    const result = await submitAttemptAction(attemptId)

    if (!result.ok) {
      setSubmitError(result.message ?? "Gagal mengumpulkan ujian.")
      setSubmitting(false)
      return
    }

    // Clean up cached localStorage for this attempt
    try {
      localStorage.removeItem(getStorageKey(attemptId, "answers"))
      localStorage.removeItem(getStorageKey(attemptId, "flags"))
      localStorage.removeItem(getStorageKey(attemptId, "outbox"))
    } catch {
      // ignore
    }

    setFinished(true)
    router.push(resultPath)
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50/50 dark:bg-background">
      {/* Top Header Bar matching CBT Exam Interface */}
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-card px-4 sm:px-8 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
            <FileText className="size-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-foreground leading-tight">
              CBT Exam Interface
            </h1>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {scheduleName}
              {nomorPeserta && ` • No. Peserta: ${nomorPeserta}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {/* Connection & Sync status */}
          {!isOnline ? (
            <Badge
              variant="outline"
              className="border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400 gap-1.5 text-xs py-1"
            >
              <WifiOff className="size-3.5" />
              <span className="hidden sm:inline">Offline</span>
            </Badge>
          ) : isSyncing || pendingOutboxCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleManualSync}
              className="h-8 gap-1.5 text-xs text-blue-600 px-2"
              title="Menyinkronkan jawaban"
            >
              <RefreshCw className="size-3.5 animate-spin" />
              <span className="hidden sm:inline">
                {pendingOutboxCount > 0 ? `Sync (${pendingOutboxCount})` : "Sync…"}
              </span>
            </Button>
          ) : (
            <button
              type="button"
              onClick={handleManualSync}
              title={
                lastSyncedAt
                  ? `Tersinkron • Terakhir sync ${lastSyncedAt.toLocaleTimeString()}`
                  : "Tersinkron"
              }
              className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:opacity-80 transition-opacity"
            >
              <span className="size-2 rounded-full bg-emerald-500" />
              <span className="hidden sm:inline text-muted-foreground text-[11px]">
                Tersinkron
              </span>
            </button>
          )}

          {/* Exam Timer */}
          <AttemptTimer
            deadlineAt={deadlineAt}
            onExpired={() => void handleSubmit()}
          />

          {/* End Exam Button */}
          <Button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={submitting || finished}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 h-9 shadow-xs"
          >
            End Exam
          </Button>
        </div>
      </header>

      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-900 dark:text-amber-200">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                <strong>Mode Offline:</strong> Koneksi terputus. Anda tetap
                dapat mengerjakan soal; seluruh jawaban tersimpan aman di
                perangkat ini dan otomatis dikirim saat online kembali.
              </span>
            </div>
            {pendingOutboxCount > 0 && (
              <Badge variant="outline" className="border-amber-500/40 text-[11px] shrink-0">
                {pendingOutboxCount} menunggu sync
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Main 2-Column Layout */}
      <main className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 p-4 sm:p-6 md:grid-cols-12">
        {/* Left Column: Navigation & Progress */}
        <aside className="md:col-span-4 lg:col-span-3">
          <QuestionNavigator
            count={questions.length}
            currentIndex={currentIndex}
            answered={answeredIndexes}
            flagged={flaggedIndexes}
            onSelect={setCurrentIndex}
          />
        </aside>

        {/* Right Column: Question Card & Controls */}
        <section className="flex flex-col gap-4 md:col-span-8 lg:col-span-9">
          {question ? (
            <article className="flex flex-col gap-6 rounded-xl border bg-card p-6 sm:p-8 shadow-xs">
              {/* Question Header: Title on Left, Flag on Right */}
              <div className="flex items-center justify-between border-b pb-4">
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Question {currentIndex + 1}
                </h2>

                <button
                  type="button"
                  onClick={handleToggleFlag}
                  disabled={submitting || finished}
                  className={`flex items-center gap-2 text-xs font-medium transition-colors cursor-pointer rounded-lg px-3 py-1.5 border ${
                    isCurrentFlagged
                      ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold"
                      : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Flag
                    className={`size-3.5 ${
                      isCurrentFlagged ? "fill-current text-amber-600" : ""
                    }`}
                  />
                  <span>
                    {isCurrentFlagged ? "Flagged for review" : "Flag for review"}
                  </span>
                </button>
              </div>

              {/* Question Content */}
              <div className="text-base leading-relaxed text-foreground min-h-[70px]">
                <QuestionRenderer content={question.content} />
              </div>

              {/* Stacked Options */}
              <div className="pt-2">
                <AnswerControls
                  disabled={submitting || finished}
                  onChange={(value) => queueSave(question.questionId, value)}
                  question={question}
                  value={answers[question.questionId] ?? null}
                />
              </div>
            </article>
          ) : null}

          {/* Bottom Controls: Previous on Left, Next on Right */}
          <div className="flex items-center justify-between pt-1">
            <Button
              type="button"
              variant="outline"
              disabled={currentIndex === 0 || submitting}
              onClick={() => setCurrentIndex((idx) => Math.max(0, idx - 1))}
              className="gap-2 h-10 px-4 text-muted-foreground hover:text-foreground"
            >
              <span>←</span>
              <span>Previous</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={currentIndex === questions.length - 1 || submitting}
              onClick={() =>
                setCurrentIndex((idx) =>
                  Math.min(questions.length - 1, idx + 1)
                )
              }
              className="gap-2 h-10 px-5 font-medium border-border/80 hover:bg-accent"
            >
              <span>Next Question</span>
              <span>→</span>
            </Button>
          </div>
        </section>
      </main>

      {/* End Exam Confirmation Dialog */}
      {confirming && (
        <Dialog open onOpenChange={(open) => setConfirming(open)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Selesaikan Ujian (End Exam)?</DialogTitle>
              <DialogDescription>
                Anda telah menjawab{" "}
                <strong className="text-foreground">
                  {answeredIndexes.size} dari {questions.length}
                </strong>{" "}
                soal
                {flaggedIndexes.size > 0 && (
                  <span>
                    , dengan{" "}
                    <strong className="text-amber-600 dark:text-amber-400">
                      {flaggedIndexes.size} soal
                    </strong>{" "}
                    bertanda ragu-ragu
                  </span>
                )}
                .
                <br className="my-1.5" />
                Setelah ujian dikumpulkan, jawaban akan dinilai dan tidak dapat diubah kembali.
              </DialogDescription>
            </DialogHeader>

            {!isOnline && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <WifiOff className="size-4 shrink-0" />
                <span>
                  Perangkat Anda sedang offline. Mohon sambungkan ke internet terlebih dahulu sebelum mengumpulkan ujian.
                </span>
              </div>
            )}

            {submitError && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirming(false)}
                disabled={submitting}
              >
                Kembali Periksa
              </Button>
              <Button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting || !isOnline}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                {submitting ? "Mengumpulkan…" : "Ya, Selesaikan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
