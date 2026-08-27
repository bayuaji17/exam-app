import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"

import { AttemptRunner } from "@/components/exam-components/attempt-runner"
import type { AnswerValue } from "@/components/exam-components/answer-controls"
import { auth } from "@/lib/auth"
import { APP_ROLES, getAppRoles } from "@/lib/auth-roles"
import { submitAttemptAction } from "@/lib/attempts/actions"
import {
  getAttemptForParticipant,
  listAttemptAnswers,
  listAttemptQuestions,
} from "@/lib/attempts/queries"
import { isExpired } from "@/lib/attempts/timer"
import { getExamScheduleBySlug } from "@/lib/entity-slugs/resolvers"

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false

export default async function AttemptPage({
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
    redirect(`/exam/${schedule.slug}/attempt/${attemptId}`)
  }

  const examSlug = schedule.slug

  // Already submitted: the attempt page is the result page.
  if (attemptRow.submittedAt !== null) {
    redirect(`/exam/${examSlug}/attempt/${attemptId}/result`)
  }

  // A deadline that passed while the participant was away finalizes lazily.
  if (isExpired(attemptRow.deadlineAt)) {
    await submitAttemptAction(attemptId)
    redirect(`/exam/${examSlug}/attempt/${attemptId}/result`)
  }

  const [questions, savedAnswers] = await Promise.all([
    listAttemptQuestions(attemptRow.questionOrder),
    listAttemptAnswers(attemptId),
  ])

  const initialAnswers: Record<string, AnswerValue> = {}

  for (const saved of savedAnswers) {
    initialAnswers[saved.questionId] = saved.answer as AnswerValue
  }

  return (
    <AttemptRunner
      attemptId={attemptId}
      deadlineAt={attemptRow.deadlineAt?.toISOString() ?? null}
      initialAnswers={initialAnswers}
      nomorPeserta={attemptRow.nomorPeserta}
      questions={questions}
      resultPath={`/exam/${examSlug}/attempt/${attemptId}/result`}
      scheduleName={attemptRow.scheduleName}
    />
  )
}
