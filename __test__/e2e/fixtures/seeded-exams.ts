import { randomUUID } from "node:crypto"

import { userIdFor } from "./created-users"
import { seedBank, SEEDED_BANK_PREFIX } from "./seeded-banks"
import { grantUserEligibility } from "./seeded-eligibility"
import {
  seedExamPackage,
  seedPackageQuestion,
  SEEDED_PACKAGE_PREFIX,
} from "./seeded-packages"
import { seedQuestion } from "./seeded-questions"
import { seedExamSchedule, SEEDED_SCHEDULE_PREFIX } from "./seeded-schedules"

/** A per-run-unique name, so leftovers from a crashed run cannot collide. */
export function uniqueName(label: string): string {
  return `${label} ${randomUUID().slice(0, 8)}`
}

export const PARA = (text: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
})

export interface SeededExam {
  scheduleId: string
  label: string
  singleQuestionId: string
  scoredQuestionId: string
  manualQuestionIds: string[]
}

/**
 * A complete, ongoing, eligible exam for the seeded user role: one
 * single-choice question (Opsi benar = correct), one score-based question
 * (Skor tiga = 3), and the requested number of manual questions. The label
 * is unique per test so row locators can match precisely.
 */
export async function seedAttemptableExam(
  label: string,
  options: {
    attemptLimit?: number | null
    manualCount?: number
    passScore?: string | null
  } = {}
): Promise<SeededExam> {
  const bankId = await seedBank(`${SEEDED_BANK_PREFIX} ${label}`)

  const single = await seedQuestion(bankId, {
    type: "single",
    content: PARA(`Soal pilihan ${label}`),
    options: [
      { content: PARA("Opsi benar"), isCorrect: true },
      { content: PARA("Opsi salah") },
    ],
  })
  const scored = await seedQuestion(bankId, {
    type: "scored",
    content: PARA(`Soal skor ${label}`),
    options: [
      { content: PARA("Skor tiga"), score: "3" },
      { content: PARA("Skor satu"), score: "1" },
    ],
  })
  const manualCount = options.manualCount ?? 1
  const manualIds: string[] = []

  for (let index = 1; index <= manualCount; index += 1) {
    const manual = await seedQuestion(bankId, {
      type: "manual",
      content: PARA(`Soal esai ${label} ${index}`),
    })
    manualIds.push(manual.id)
  }

  const packageId = await seedExamPackage(
    uniqueName(`${SEEDED_PACKAGE_PREFIX} ${label}`),
    { passScore: options.passScore ?? null }
  )
  await seedPackageQuestion(packageId, single.id, 0)
  await seedPackageQuestion(packageId, scored.id, 1)
  manualIds.forEach((manualId, index) => {
    void seedPackageQuestion(packageId, manualId, 2 + index)
  })

  const now = Date.now()
  const scheduleId = await seedExamSchedule({
    name: uniqueName(`${SEEDED_SCHEDULE_PREFIX} ${label}`),
    packageId,
    startsAt: new Date(now - 60 * 60 * 1000),
    endsAt: new Date(now + 24 * 60 * 60 * 1000),
    durationMinutes: 60,
    attemptLimit: options.attemptLimit ?? null,
  })

  const user = await userIdFor("test-user@example.com")
  await grantUserEligibility(scheduleId, user)

  return {
    scheduleId,
    label,
    singleQuestionId: single.id,
    scoredQuestionId: scored.id,
    manualQuestionIds: manualIds,
  }
}
