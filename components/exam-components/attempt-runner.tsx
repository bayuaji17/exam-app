"use client"

import { useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"

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
import { submitAttemptAction, saveAnswerAction } from "@/lib/attempts/actions"
import type { AttemptQuestion } from "@/lib/attempts/queries"
import { AnswerControls, type AnswerValue } from "./answer-controls"
import { AttemptTimer } from "./attempt-timer"
import { QuestionNavigator } from "./question-navigator"
import { QuestionRenderer } from "./question-renderer"

type SaveState = "idle" | "saving" | "saved" | "error"

/**
 * The attempt runner: one question at a time, debounced server-side saves,
 * a countdown that submits on expiry, and a confirm-then-submit flow.
 * Answers live in the database, so a reload resumes with what was saved.
 */
export function AttemptRunner({
  attemptId,
  scheduleName,
  nomorPeserta,
  deadlineAt,
  questions,
  initialAnswers,
  resultPath,
}: {
  attemptId: string
  scheduleName: string
  nomorPeserta?: string | null
  deadlineAt: string | null
  questions: AttemptQuestion[]
  initialAnswers: Record<string, AnswerValue>
  resultPath: string
}) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] =
    useState<Record<string, AnswerValue>>(initialAnswers)
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({})
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [finished, setFinished] = useState(false)
  const debounceRefs = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const pendingValues = useRef(new Map<string, AnswerValue>())

  const question = questions[currentIndex]

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

    const result = await saveAnswerAction(attemptId, questionId, value)

    if (!result.ok) {
      setSaveStates((current) => ({ ...current, [questionId]: "error" }))
      return
    }

    pendingValues.current.delete(questionId)
    setSaveStates((current) => ({ ...current, [questionId]: "saved" }))
  }

  async function flushDirty(): Promise<void> {
    for (const questionId of [...pendingValues.current.keys()]) {
      await persist(questionId)
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
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">{scheduleName}</h1>
            {nomorPeserta && (
              <Badge className="font-mono text-xs" variant="outline">
                No. Peserta: {nomorPeserta}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Soal {currentIndex + 1} dari {questions.length}
          </p>
        </div>
        <AttemptTimer
          deadlineAt={deadlineAt}
          onExpired={() => void handleSubmit()}
        />
      </header>

      <QuestionNavigator
        answered={answeredIndexes}
        count={questions.length}
        currentIndex={currentIndex}
        onSelect={setCurrentIndex}
      />

      {question ? (
        <article className="flex flex-col gap-4 rounded-lg border p-4">
          <QuestionRenderer content={question.content} />
          <AnswerControls
            disabled={submitting || finished}
            onChange={(value) => queueSave(question.questionId, value)}
            question={question}
            value={answers[question.questionId] ?? null}
          />
        </article>
      ) : null}

      <footer className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-3">
          <Button
            disabled={currentIndex === 0 || submitting}
            onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
            type="button"
            variant="outline"
          >
            Sebelumnya
          </Button>
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
            <span className="text-sm text-muted-foreground">Menyimpan…</span>
          ) : saveStates[question?.questionId ?? ""] === "error" ? (
            <span className="text-sm text-destructive">Gagal menyimpan</span>
          ) : null}
          <Button
            disabled={submitting}
            onClick={() => setConfirming(true)}
            type="button"
          >
            Kumpulkan
          </Button>
        </div>
      </footer>

      {confirming ? (
        <Dialog open onOpenChange={(open) => setConfirming(open)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Kumpulkan ujian?</DialogTitle>
              <DialogDescription>
                Jawaban yang belum tersimpan akan dikirim terlebih dahulu.
                Setelah dikumpulkan, ujian tidak dapat diubah lagi.
              </DialogDescription>
            </DialogHeader>

            {submitError ? (
              <p className="text-sm text-destructive">{submitError}</p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirming(false)}
              >
                Batal
              </Button>
              <Button
                disabled={submitting}
                type="button"
                onClick={() => {
                  setConfirming(false)
                  void handleSubmit()
                }}
              >
                {submitting ? "Mengumpulkan…" : "Kumpulkan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  )
}
