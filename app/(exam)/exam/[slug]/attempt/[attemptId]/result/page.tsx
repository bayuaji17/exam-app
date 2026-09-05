import Link from "next/link"
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import {
  QuestionRenderer,
  OptionRenderer,
} from "@/components/exam-components/question-renderer"
import { auth } from "@/lib/auth"
import { APP_ROLES, getAppRoles } from "@/lib/auth-roles"
import {
  getAttemptForParticipant,
  listAttemptAnswers,
  listAttemptQuestions,
  type AttemptQuestion,
} from "@/lib/attempts/queries"
import { getExamScheduleBySlug } from "@/lib/entity-slugs/resolvers"
import { manualGradeWeights } from "@/lib/grading/queries"
import { isPassing } from "@/lib/scoring/scoring"

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false

function formatScore(value: string | null): string {
  return value !== null ? Number(value).toLocaleString("id-ID") : "—"
}

export default async function AttemptResultPage({
  params,
}: {
  params: Promise<{ slug: string; attemptId: string }>
}) {
  const { slug, attemptId } = await params
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const [role] = getAppRoles(session.user.role)

  if (!role || role !== APP_ROLES.USER) {
    redirect("/dashboard")
  }

  const [attemptRow, schedule] = await Promise.all([
    getAttemptForParticipant(attemptId, session.user.id),
    getExamScheduleBySlug(slug),
  ])

  if (!attemptRow || !schedule || attemptRow.scheduleId !== schedule.id) {
    notFound()
  }

  if (slug !== schedule.slug && slug === schedule.id) {
    redirect(`/exam/${schedule.slug}/attempt/${attemptId}/result`)
  }

  if (attemptRow.submittedAt === null) {
    redirect(`/exam/${schedule.slug}/attempt/${attemptId}`)
  }

  const [questions, savedAnswers, weights] = await Promise.all([
    listAttemptQuestions(attemptRow.questionOrder),
    listAttemptAnswers(attemptId),
    manualGradeWeights(attemptRow.scheduleId),
  ])

  const answersByQuestion = new Map(
    savedAnswers.map((answer) => [answer.questionId, answer])
  )
  const manualQuestions = questions.filter((entry) => entry.type === "manual")
  const gradedManualCount = manualQuestions.filter((entry) => {
    const answer = answersByQuestion.get(entry.questionId)

    return answer?.manualScore !== null && answer?.manualScore !== undefined
  }).length
  const fullyGraded = gradedManualCount === manualQuestions.length
  const passScore =
    attemptRow.passScore !== null ? Number(attemptRow.passScore) : null
  const score = attemptRow.score !== null ? Number(attemptRow.score) : null
  const showPassFail = fullyGraded && score !== null
  const passing = showPassFail && isPassing(score, passScore)

  return (
    <div className="flex flex-col gap-6">
      <Link
        className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        href="/exam"
      >
        ← Kembali ke daftar ujian
      </Link>

      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">{attemptRow.scheduleName}</h1>
          {attemptRow.nomorPeserta && (
            <Badge className="font-mono text-xs" variant="outline">
              No. Peserta: {attemptRow.nomorPeserta}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">Hasil pengerjaan Anda</p>
      </div>

      <div className="flex flex-wrap items-center gap-6 rounded-lg border p-4">
        <div>
          <p className="text-xs text-muted-foreground">Skor</p>
          <p className="text-3xl font-semibold">
            {formatScore(attemptRow.score)}
          </p>
        </div>
        {passScore !== null ? (
          <div>
            <p className="text-xs text-muted-foreground">Nilai lulus</p>
            <p className="text-xl font-semibold">
              {passScore.toLocaleString("id-ID")}
            </p>
          </div>
        ) : null}
        {showPassFail ? (
          <Badge
            className={
              passing
                ? "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400"
                : "bg-destructive/15 text-destructive"
            }
          >
            {passing ? "LULUS" : "TIDAK LULUS"}
          </Badge>
        ) : (
          <Badge className="border-border text-muted-foreground">
            Menunggu penilaian manual
          </Badge>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {questions.map((entry, index) => (
          <ReviewItem
            answer={
              answersByQuestion.get(entry.questionId)?.answer as
                | { chosenOptionId: string | null }
                | { text: string }
                | undefined
            }
            autoScore={
              answersByQuestion.get(entry.questionId)?.autoScore ?? null
            }
            entry={entry}
            index={index}
            key={entry.questionId}
            manualScore={
              answersByQuestion.get(entry.questionId)?.manualScore ?? null
            }
            weight={weights.get(entry.questionId) ?? 1}
          />
        ))}
      </div>
    </div>
  )
}

function ReviewItem({
  entry,
  index,
  answer,
  autoScore,
  manualScore,
  weight,
}: {
  entry: AttemptQuestion
  index: number
  answer: { chosenOptionId: string | null } | { text: string } | undefined
  autoScore: string | null
  manualScore: string | null
  weight: number
}) {
  const chosen =
    answer !== undefined && "chosenOptionId" in answer
      ? answer.chosenOptionId
      : null
  const text = answer !== undefined && "text" in answer ? answer.text : ""

  return (
    <article className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-muted-foreground">
          Soal {index + 1}
        </p>
        <div className="flex items-center gap-2">
          {entry.type === "manual" ? (
            manualScore !== null ? (
              <Badge className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-400">
                Nilai: {Number(manualScore).toLocaleString("id-ID")} dari{" "}
                {weight}
              </Badge>
            ) : (
              <Badge className="border-border text-muted-foreground">
                Belum dinilai
              </Badge>
            )
          ) : (
            <Badge className="border-border text-muted-foreground">
              Skor: {formatScore(autoScore)}
            </Badge>
          )}
        </div>
      </div>

      <QuestionRenderer content={entry.content} />

      {entry.type === "manual" ? (
        <div className="rounded-lg bg-muted/30 p-3">
          <p className="mb-1 text-xs text-muted-foreground">Jawaban Anda</p>
          <p className="text-sm whitespace-pre-wrap">{text || "—"}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {entry.options.map((option) => {
            const isChosen = option.id === chosen
            const isCorrect = option.isCorrect === true

            return (
              <li
                className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${
                  isCorrect
                    ? "border-emerald-600/50 bg-emerald-500/10"
                    : isChosen
                      ? "border-destructive/60 bg-destructive/5"
                      : ""
                }`}
                key={option.id}
              >
                <OptionRenderer content={option.content} />
                {isChosen ? (
                  <Badge
                    className={
                      isCorrect
                        ? "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400"
                        : "bg-destructive/15 text-destructive"
                    }
                  >
                    Jawaban Anda
                  </Badge>
                ) : null}
                {isCorrect ? (
                  <Badge className="border-border text-muted-foreground">
                    Jawaban benar
                  </Badge>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </article>
  )
}
