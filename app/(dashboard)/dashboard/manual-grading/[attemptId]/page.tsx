import Link from "next/link"
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"

import { ManualGradeInput } from "@/components/manual-grade-input"
import { QuestionRenderer, OptionRenderer } from "@/components/exam-components/question-renderer"
import { Badge } from "@/components/ui/badge"
import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"
import { getAttemptForGrading } from "@/lib/grading/queries"

const BASE_PATH = "/dashboard/manual-grading"

function formatDateTime(date: Date): string {
  return date.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default async function GradingWorkbenchPage({
  params,
}: {
  params: Promise<{ attemptId: string }>
}) {
  const { attemptId } = await params
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const [role] = getAppRoles(session.user.role)

  if (!role || !userHasPermission(role, BASE_PATH)) {
    redirect("/dashboard/forbidden")
  }

  const attemptRow = await getAttemptForGrading(attemptId)

  if (!attemptRow) {
    notFound()
  }

  const manualQuestions = attemptRow.questions.filter(
    (question) => question.type === "manual"
  )
  const autoQuestions = attemptRow.questions.filter(
    (question) => question.type !== "manual"
  )

  return (
    <div className="flex flex-col gap-6">
      <Link
        className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        href={BASE_PATH}
      >
        ← Kembali ke Penilaian Manual
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{attemptRow.scheduleName}</h1>
          <p className="text-sm text-muted-foreground">
            {attemptRow.participantName} · {attemptRow.participantEmail} ·{" "}
            {formatDateTime(attemptRow.submittedAt)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-2xl font-semibold">
            {attemptRow.score !== null ? Number(attemptRow.score).toLocaleString("id-ID") : "—"}
          </span>
        </div>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Soal Manual ({manualQuestions.length})</h2>

        {manualQuestions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Tidak ada soal manual pada pengerjaan ini.
          </p>
        ) : (
          manualQuestions.map((entry) => {
            const answer = attemptRow.answers.find(
              (candidate) => candidate.questionId === entry.questionId
            )

            return (
              <article className="flex flex-col gap-3 rounded-lg border p-4" key={entry.questionId}>
                <QuestionRenderer content={entry.content} />
                <div className="rounded-lg bg-muted/30 p-3">
                  <p className="mb-1 text-xs text-muted-foreground">Jawaban peserta</p>
                  <p className="whitespace-pre-wrap text-sm">
                    {answer?.text?.trim() ? answer.text : "—"}
                  </p>
                </div>
                <ManualGradeInput
                  attemptId={attemptId}
                  currentScore={answer?.manualScore ?? null}
                  questionId={entry.questionId}
                  weight={entry.weight}
                />
              </article>
            )
          })
        )}
      </section>

      {autoQuestions.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Nilai Otomatis ({autoQuestions.length})</h2>
          <ul className="divide-y rounded-lg border">
            {autoQuestions.map((entry) => {
              const answer = attemptRow.answers.find(
                (candidate) => candidate.questionId === entry.questionId
              )

              return (
                <li className="flex items-start justify-between gap-3 px-3 py-2" key={entry.questionId}>
                  <div className="min-w-0">
                    <QuestionRenderer content={entry.content} />
                    {entry.type === "single" ? (
                      <ul className="mt-2 flex flex-col gap-1">
                        {entry.options.map((option) =>
                          option.isCorrect === true ? (
                            <li
                              className="flex items-start gap-2 rounded border border-emerald-600/50 bg-emerald-500/10 px-2 py-1"
                              key={option.id}
                            >
                              <span className="text-xs font-medium">Jawaban benar</span>
                              <OptionRenderer content={option.content} />
                            </li>
                          ) : null
                        )}
                      </ul>
                    ) : null}
                  </div>
                  <Badge className="shrink-0 border-border text-muted-foreground">
                    Skor: {answer?.autoScore ?? "—"}
                  </Badge>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
