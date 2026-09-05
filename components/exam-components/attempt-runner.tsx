"use client"

import { useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Flag, RefreshCw } from "lucide-react"
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

type SaveState = "idle" | "saving" | "saved" | "error"

const QUESTION_TYPE_LABELS: Record<string, string> = {
  single: "Pilihan Ganda",
  scored: "Berbobot Skor",
  manual: "Esai",
}

/**
 * The attempt runner: one question at a time, debounced server-side saves,
 * flagged (ragu-ragu) state management, manual sync, and server-authoritative timer.
 */
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
  const [answers, setAnswers] =
    useState<Record<string, AnswerValue>>(initialAnswers)
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(
    () => new Set(initialFlagged)
  )
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({})
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [finished, setFinished] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(() => new Date())

  const debounceRefs = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const pendingValues = useRef(new Map<string, AnswerValue>())

  const question = questions[currentIndex]
  const isCurrentFlagged = question ? flaggedIds.has(question.questionId) : false

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

  function queueSave(questionId: string, value: AnswerValue) {
    setAnswers((current) => ({ ...current, [questionId]: value }))
    // Pending values live in a ref so the debounced persist always reads the
    // latest payload, not the render closure's stale `answers`.
    pendingValues.current.set(questionId, value)
    setSaveStates((current) => ({ ...current, [questionId]: "saving" }))

    const existing = debounceRefs.current.get(questionId)

    if (existing) {
      clearTimeout(existing)
    }

    const timeout = setTimeout(() => {
      void persist(questionId)
    }, 600)

    debounceRefs.current.set(questionId, timeout)
  }

  async function persist(questionId: string): Promise<void> {
    const value = pendingValues.current.get(questionId)

    if (!value) {
      return
    }

    const isFlagged = flaggedIds.has(questionId)
    const result = await saveAnswerAction(attemptId, questionId, value, isFlagged)

    if (!result.ok) {
      setSaveStates((current) => ({ ...current, [questionId]: "error" }))
      return
    }

    pendingValues.current.delete(questionId)
    setSaveStates((current) => ({ ...current, [questionId]: "saved" }))
    setLastSyncedAt(new Date())
  }

  async function flushDirty(): Promise<void> {
    for (const questionId of [...pendingValues.current.keys()]) {
      await persist(questionId)
    }
  }

  async function handleToggleFlag() {
    if (!question) return

    const questionId = question.questionId
    const nextState = !isCurrentFlagged

    setFlaggedIds((prev) => {
      const next = new Set(prev)
      if (nextState) {
        next.add(questionId)
      } else {
        next.delete(questionId)
      }
      return next
    })

    try {
      const result = await toggleFlagAction(attemptId, questionId, nextState)
      if (!result.ok) {
        toast.error("Gagal mengubah status ragu-ragu.")
      }
    } catch {
      toast.error("Terjadi kendala jaringan saat menandai ragu-ragu.")
    }
  }

  async function handleManualSync() {
    if (isSyncing || submitting || finished) return

    setIsSyncing(true)
    try {
      await flushDirty()
      setLastSyncedAt(new Date())
      toast.success("Semua jawaban dan status berhasil disinkronkan ke server.")
    } catch {
      toast.error("Gagal menyinkronkan jawaban.")
    } finally {
      setIsSyncing(false)
    }
  }

  async function handleSubmit() {
    if (finished) {
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    await flushDirty()

    const result = await submitAttemptAction(attemptId)

    if (!result.ok) {
      setSubmitError(result.message ?? "Gagal mengumpulkan ujian.")
      setSubmitting(false)
      return
    }

    setFinished(true)
    router.push(resultPath)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header with Title, Participant Number, Sync and Timer */}
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-xs">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">{scheduleName}</h1>
            {nomorPeserta && (
              <Badge className="font-mono text-xs" variant="outline">
                No. Peserta: {nomorPeserta}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Nomor Soal {currentIndex + 1} dari {questions.length}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Manual Sync Trigger */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleManualSync}
            disabled={isSyncing || submitting || finished}
            title={lastSyncedAt ? `Terakhir sync: ${lastSyncedAt.toLocaleTimeString()}` : "Sinkronkan jawaban"}
            className="h-9 px-3 gap-1.5 text-xs font-medium"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin text-primary" : "text-muted-foreground"}`} />
            <span className="hidden sm:inline">
              {isSyncing ? "Menyinkronkan…" : "Sync"}
            </span>
          </Button>

          {/* Exam Timer */}
          <AttemptTimer
            deadlineAt={deadlineAt}
            onExpired={() => void handleSubmit()}
          />
        </div>
      </header>

      {/* Question Numbers Grid with answered, flagged, and active markers */}
      <QuestionNavigator
        answered={answeredIndexes}
        flagged={flaggedIndexes}
        count={questions.length}
        currentIndex={currentIndex}
        onSelect={setCurrentIndex}
      />

      {/* Current Question View */}
      {question ? (
        <article className="flex flex-col gap-5 rounded-xl border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base">Soal No. {currentIndex + 1}</span>
              <Badge variant="secondary" className="text-xs">
                {QUESTION_TYPE_LABELS[question.type] || question.type}
              </Badge>
            </div>

            {isCurrentFlagged && (
              <Badge className="bg-amber-500 hover:bg-amber-500 text-white font-medium text-xs gap-1">
                <Flag className="h-3 w-3 fill-current" />
                Ragu-ragu
              </Badge>
            )}
          </div>

          <QuestionRenderer content={question.content} />

          <div className="pt-2 border-t">
            <AnswerControls
              disabled={submitting || finished}
              onChange={(value) => queueSave(question.questionId, value)}
              question={question}
              value={answers[question.questionId] ?? null}
            />
          </div>
        </article>
      ) : null}

      {/* Action Footer: Previous, Ragu-ragu, Sync Status, Next, Submit */}
      <footer className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background/95 p-4 shadow-lg backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          {/* Tombol Sebelumnya */}
          <Button
            disabled={currentIndex === 0 || submitting}
            onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
            type="button"
            variant="outline"
          >
            Sebelumnya
          </Button>

          {/* Tombol Ragu-ragu */}
          <Button
            type="button"
            onClick={handleToggleFlag}
            disabled={!question || submitting || finished}
            variant={isCurrentFlagged ? "default" : "outline"}
            className={
              isCurrentFlagged
                ? "border-amber-500 bg-amber-500 text-white hover:bg-amber-600 gap-1.5"
                : "text-amber-600 dark:text-amber-400 border-amber-500/50 hover:bg-amber-500/10 gap-1.5"
            }
          >
            <Flag className={`h-4 w-4 ${isCurrentFlagged ? "fill-current" : ""}`} />
            <span>Ragu-ragu</span>
          </Button>

          {/* Tombol Berikutnya */}
          <Button
            disabled={currentIndex === questions.length - 1 || submitting}
            onClick={() =>
              setCurrentIndex((index) =>
                Math.min(questions.length - 1, index + 1)
              )
            }
            type="button"
            variant="outline"
          >
            Berikutnya
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {saveStates[question?.questionId ?? ""] === "saving" ? (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Menyimpan…
            </span>
          ) : saveStates[question?.questionId ?? ""] === "saved" ? (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Tersimpan
            </span>
          ) : saveStates[question?.questionId ?? ""] === "error" ? (
            <span className="text-xs text-destructive font-medium">
              Gagal menyimpan
            </span>
          ) : null}

          {/* Tombol Kumpulkan */}
          <Button
            disabled={submitting || finished}
            onClick={() => setConfirming(true)}
            type="button"
            className="font-semibold px-5"
          >
            Kumpulkan Ujian
          </Button>
        </div>
      </footer>

      {/* Confirmation Dialog before Submitting */}
      {confirming ? (
        <Dialog open onOpenChange={(open) => setConfirming(open)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Kumpulkan ujian?</DialogTitle>
              <DialogDescription>
                Jawaban Anda ({answeredIndexes.size} dari {questions.length} soal)
                {flaggedIndexes.size > 0 && ` dan terdapat ${flaggedIndexes.size} soal bertanda ragu-ragu.`}
                <br className="my-1" />
                Setelah dikumpulkan, pengerjaan ujian akan diakhiri dan jawaban tidak dapat diubah lagi.
              </DialogDescription>
            </DialogHeader>

            {submitError ? (
              <p className="text-sm text-destructive">{submitError}</p>
            ) : null}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirming(false)}
              >
                Kembali Periksa
              </Button>
              <Button
                disabled={submitting}
                type="button"
                onClick={() => {
                  setConfirming(false)
                  void handleSubmit()
                }}
              >
                {submitting ? "Mengumpulkan…" : "Ya, Kumpulkan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  )
}
