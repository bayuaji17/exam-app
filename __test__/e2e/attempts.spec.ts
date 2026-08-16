import { randomUUID } from "node:crypto"
import { expect, test, type Page } from "@playwright/test"

import { signInAsRole } from "./fixtures/auth"
import {
  seedSessionForUser,
  seedTargetUser,
  signedSessionCookieValue,
  userIdFor,
} from "./fixtures/created-users"
import { attemptState, seedAttempt } from "./fixtures/seeded-attempts"
import { seedBank, SEEDED_BANK_PREFIX } from "./fixtures/seeded-banks"
import { grantUserEligibility } from "./fixtures/seeded-eligibility"
import {
  seedExamPackage,
  seedPackageQuestion,
  SEEDED_PACKAGE_PREFIX,
} from "./fixtures/seeded-packages"
import { seedQuestion } from "./fixtures/seeded-questions"
import {
  seedExamSchedule,
  SEEDED_SCHEDULE_PREFIX,
} from "./fixtures/seeded-schedules"
import { waitForHydration } from "./fixtures/interactions"
import {
  PARA,
  seedAttemptableExam,
  uniqueName,
  type SeededExam,
} from "./fixtures/seeded-exams"


async function startExam(page: Page, exam: SeededExam): Promise<void> {
  await page.goto("/exam")
  await page
    .getByRole("row", { name: new RegExp(`Schedule ${exam.label}`) })
    .getByRole("link", { name: "Mulai" })
    .click()
  await page.getByRole("button", { name: "Mulai Ujian" }).click()
  await page.waitForURL(new RegExp(`/exam/${exam.scheduleId}/attempt/`))
  await waitForHydration(page)
}

async function submitAttempt(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Kumpulkan" }).click()
  await expect(page.getByText("Kumpulkan ujian?")).toBeVisible()
  await page.getByRole("button", { name: "Kumpulkan", exact: true }).last().click()
  await page.waitForURL(/\/result$/)
}

/**
 * Act as a brand-new participant: the seeded account is already granted
 * exams by parallel tests, so the "no exams" tests need a fresh account
 * with a directly seeded session (no sign-in, no rate limit).
 */
async function signInAsFreshUser(page: Page): Promise<string> {
  const target = await seedTargetUser(`fresh-${randomUUID().slice(0, 6)}`, "user")
  const { token } = await seedSessionForUser(target.id, {
    token: `fresh-session-${randomUUID()}`,
  })

  await page.context().addCookies([
    {
      name: "better-auth.session_token",
      value: signedSessionCookieValue(token),
      domain: "localhost",
      path: "/",
    },
  ])

  return target.id
}

test.describe("attempt execution", () => {
  test("a participant takes an exam end to end with resume and full review", async ({
    page,
  }) => {
    await signInAsRole(page, "user")
    const exam = await seedAttemptableExam("Happy Path")

    await startExam(page, exam)

    // Question 1 (single): pick the correct option; wait for the save to land.
    await page.getByRole("radio", { name: /Opsi benar/ }).check()
    await expect(page.getByText("Menyimpan…")).toBeHidden({ timeout: 10_000 })

    // Reload resumes with the saved answer.
    await page.reload()
    await waitForHydration(page)
    await expect(page.getByRole("radio", { name: /Opsi benar/ })).toBeChecked()

    // Question 2 (scored): pick "Skor tiga".
    await page.getByRole("button", { name: "Berikutnya" }).click()
    await page.getByRole("radio", { name: /Skor tiga/ }).check()

    // Question 3 (manual): write an essay.
    await page.getByRole("button", { name: "Berikutnya" }).click()
    await page.getByLabel("Jawaban esai").fill("Jawaban esai saya")

    await submitAttempt(page)

    await expect(page.getByText("Skor", { exact: true })).toBeVisible()
    await expect(page.getByText("4", { exact: true })).toBeVisible()
    // A manual question is pending, so pass/fail stays hidden until grading.
    await expect(page.getByText("Menunggu penilaian manual")).toBeVisible()
    await expect(page.getByText("Jawaban benar")).toBeVisible()
    await expect(page.getByText("Belum dinilai")).toBeVisible()
    await expect(page.getByText("Jawaban esai saya")).toBeVisible()
  })

  test("an ineligible participant sees no exams", async ({ page }) => {
    await signInAsFreshUser(page)

    await page.goto("/exam")

    await expect(
      page.getByText("Belum ada ujian yang tersedia untuk Anda.")
    ).toBeVisible()
  })

  test("an upcoming exam cannot be started", async ({ page }) => {
    await signInAsRole(page, "user")
    const label = "Upcoming"
    const bankId = await seedBank(`${SEEDED_BANK_PREFIX} ${label}`)
    const question = await seedQuestion(bankId, {
      type: "single",
      content: PARA("Soal mendatang"),
      options: [
        { content: PARA("A"), isCorrect: true },
        { content: PARA("B") },
      ],
    })
    const packageId = await seedExamPackage(uniqueName(`${SEEDED_PACKAGE_PREFIX} ${label}`))
    await seedPackageQuestion(packageId, question.id, 0)
    const scheduleId = await seedExamSchedule({
      name: uniqueName(`${SEEDED_SCHEDULE_PREFIX} ${label}`),
      packageId,
      startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endsAt: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
    })
    const user = await userIdFor("test-user@example.com")
    await grantUserEligibility(scheduleId, user)

    await page.goto("/exam")
    const row = page.getByRole("row", { name: new RegExp(`Schedule ${label}`) })
    await expect(row).toBeVisible()
    await expect(row.getByText("Akan Datang")).toBeVisible()
    await expect(row.getByRole("link", { name: "Mulai" })).toHaveCount(0)

    await row.getByRole("link").first().click()
    await expect(page.getByText("Ujian belum dibuka.")).toBeVisible()
  })

  test("the attempt limit blocks a second attempt after submit", async ({
    page,
  }) => {
    await signInAsRole(page, "user")
    const exam = await seedAttemptableExam("Limited", { attemptLimit: 1 })

    await startExam(page, exam)
    await page.getByRole("radio", { name: /Opsi benar/ }).check()
    await submitAttempt(page)

    await page.goto("/exam")
    const row = page.getByRole("row", { name: new RegExp(`Schedule ${exam.label}`) })
    await expect(row.getByText("1/1")).toBeVisible()
    await expect(row.getByRole("link", { name: "Mulai" })).toHaveCount(0)
    await expect(row.getByRole("link", { name: "Lihat Nilai" })).toBeVisible()

    // The intro refuses a fresh attempt too.
    await page.goto(`/exam/${exam.scheduleId}/intro`)
    await expect(page.getByText("Batas percobaan ujian ini sudah tercapai.")).toBeVisible()
  })

  test("attempt limit 0 means unlimited retakes", async ({ page }) => {
    await signInAsRole(page, "user")
    const exam = await seedAttemptableExam("Unlimited", { attemptLimit: 0 })

    await startExam(page, exam)
    await page.getByRole("radio", { name: /Opsi benar/ }).check()
    await submitAttempt(page)

    // A second attempt is offered and can be started again.
    await page.goto("/exam")
    const row = page.getByRole("row", { name: new RegExp(`Schedule ${exam.label}`) })
    await expect(row.getByText("1 (tak terbatas)")).toBeVisible()
    await row.getByRole("link", { name: "Mulai" }).click()
    await page.getByRole("button", { name: "Mulai Ujian" }).click()
    await page.waitForURL(new RegExp(`/exam/${exam.scheduleId}/attempt/`))
  })

  test("an expired deadline auto-finalizes on the next visit", async ({ page }) => {
    await signInAsRole(page, "user")
    const exam = await seedAttemptableExam("Expired")

    const attemptId = await seedAttempt(exam.scheduleId, "test-user@example.com", {
      startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      deadlineAt: new Date(Date.now() - 60 * 60 * 1000),
      questionOrder: [],
    })

    await page.goto(`/exam/${exam.scheduleId}/attempt/${attemptId}`)

    await page.waitForURL(/\/result$/)
    const state = await attemptState(attemptId)
    expect(state?.submittedAt).not.toBeNull()
    expect(Number(state?.score)).toBe(0)
  })

  test("the admin schedule form offers the attempt limit field", async ({ page }) => {
    await signInAsRole(page, "admin")
    await page.goto("/dashboard/exam-schedules/new")
    await waitForHydration(page)

    await expect(
      page.getByLabel("Batas Percobaan (0 atau kosong = tak terbatas)")
    ).toBeVisible()
  })

  test("an admin is not a participant", async ({ page }) => {
    await signInAsRole(page, "admin")

    await page.goto("/exam")

    await expect(page).toHaveURL(/\/dashboard/)
  })
})
