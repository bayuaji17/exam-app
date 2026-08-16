import { expect, test, type Page } from "@playwright/test"

import { signInAsRole } from "./fixtures/auth"
import {
  seedAttemptableExam,
  type SeededExam,
} from "./fixtures/seeded-exams"
import { waitForHydration } from "./fixtures/interactions"

/**
 * Take the seeded exam as the participant: answer single (correct, 1 point),
 * scored (3 points), and the manual essay(s), then submit.
 */
async function takeAndSubmitExam(
  page: Page,
  exam: SeededExam,
  essayCount: number
): Promise<void> {
  await page.goto("/exam")
  await page
    .getByRole("row", { name: new RegExp(`Schedule ${exam.label}`) }).first()
    .getByRole("link", { name: "Mulai" })
    .click()
  await page.getByRole("button", { name: "Mulai Ujian" }).click()
  await page.waitForURL(new RegExp(`/exam/${exam.scheduleId}/attempt/`))
  await waitForHydration(page)

  await page.getByRole("radio", { name: /Opsi benar/ }).check()
  await page.getByRole("button", { name: "Berikutnya" }).click()
  await page.getByRole("radio", { name: /Skor tiga/ }).check()

  for (let index = 0; index < essayCount; index += 1) {
    await page.getByRole("button", { name: "Berikutnya" }).click()
    await page.getByLabel("Jawaban esai").fill(`Jawaban esai ${index + 1}`)
  }

  await page.getByRole("button", { name: "Kumpulkan" }).click()
  await page.getByRole("button", { name: "Kumpulkan", exact: true }).last().click()
  await page.waitForURL(/\/result$/)
}

async function gradeEssay(
  page: Page,
  attemptId: string,
  index: number,
  score: string,
  expectedTotal: number
): Promise<void> {
  await page.goto(`/dashboard/manual-grading/${attemptId}`)
  await waitForHydration(page)

  const input = page.getByLabel(/^Nilai soal /).nth(index)
  await input.fill(score)
  await input
    .locator("..")
    .getByRole("button", { name: "Simpan" })
    .click()

  // The save is fire-and-forget from the click's perspective; wait until the
  // workbench total reflects the new score so later navigations never race
  // the in-flight server action.
  await expect(page.getByText(String(expectedTotal), { exact: true })).toBeVisible()
}

test.describe("results and manual grading", () => {
  test("an admin grades a manual answer and the participant sees the final result", async ({
    page,
  }) => {
    await signInAsRole(page, "user")
    const exam = await seedAttemptableExam("Graded")
    await takeAndSubmitExam(page, exam, 1)

    // The result is pending while ungraded.
    await expect(page.getByText("Menunggu penilaian manual")).toBeVisible()
    await expect(page.getByText("4", { exact: true })).toBeVisible()
    await expect(page.getByText("Belum dinilai")).toBeVisible()

    // Keep the result URL to revisit as the participant.
    const url = page.url()

    // The admin grades the essay (weight defaults to 1).
    await signInAsRole(page, "admin")
    await page.goto("/dashboard/manual-grading")
    const row = page.getByRole("row", { name: new RegExp(`Schedule ${exam.label}`) }).first()
    await expect(row).toBeVisible()
    await expect(row.getByText("1", { exact: true })).toBeVisible()
    await row.getByRole("link", { name: "Nilai" }).click()

    await expect(page.getByText("Jawaban esai 1")).toBeVisible()
    const input = page.getByLabel(/^Nilai soal /).first()
    await input.fill("1")
    await input.locator("..").getByRole("button", { name: "Simpan" }).click()

    // The workbench total now includes the manual grade.
    await expect(page.getByText("5", { exact: true })).toBeVisible()

    // The participant sees the graded result.
    await signInAsRole(page, "user")
    await page.goto(url)
    await waitForHydration(page)
    await expect(page.getByText("Nilai: 1 dari 1")).toBeVisible()
    await expect(page.getByText("5", { exact: true })).toBeVisible()
    await expect(page.getByText("LULUS")).toBeVisible()
  })

  test("partial grading keeps the result pending", async ({ page }) => {
    await signInAsRole(page, "user")
    const exam = await seedAttemptableExam("Partial", { manualCount: 2 })
    await takeAndSubmitExam(page, exam, 2)

    const url = page.url()
    const attemptId = url.split("/attempt/")[1]!.split("/")[0]!

    await signInAsRole(page, "admin")
    await gradeEssay(page, attemptId, 0, "1", 5)

    await signInAsRole(page, "user")
    await page.goto(url)
    await waitForHydration(page)
    await expect(page.getByText("Menunggu penilaian manual")).toBeVisible()
    await expect(page.getByText("Nilai: 1 dari 1")).toBeVisible()
    await expect(page.getByText("Belum dinilai")).toHaveCount(1)

    // Grading the second essay completes the attempt.
    await signInAsRole(page, "admin")
    await gradeEssay(page, attemptId, 1, "1", 6)

    await signInAsRole(page, "user")
    await page.goto(url)
    await waitForHydration(page)
    await expect(page.getByText("Menunggu penilaian manual")).toHaveCount(0)
    await expect(page.getByText("6", { exact: true })).toBeVisible()
    await expect(page.getByText("LULUS")).toBeVisible()
  })

  test("regrading updates the total", async ({ page }) => {
    await signInAsRole(page, "user")
    const exam = await seedAttemptableExam("Regraded")
    await takeAndSubmitExam(page, exam, 1)

    const url = page.url()
    const attemptId = url.split("/attempt/")[1]!.split("/")[0]!

    await signInAsRole(page, "admin")
    await gradeEssay(page, attemptId, 0, "1", 5)

    // Lower the grade: total drops from 5 to 4.
    await page.goto(`/dashboard/manual-grading/${attemptId}`)
    await waitForHydration(page)
    const input = page.getByLabel(/^Nilai soal /).first()
    await input.fill("0")
    await input.locator("..").getByRole("button", { name: "Simpan" }).click()
    await expect(page.getByText("4", { exact: true })).toBeVisible()
  })

  test("a participant cannot reach the grading pages", async ({ page }) => {
    await signInAsRole(page, "user")

    await page.goto("/dashboard/manual-grading")

    await expect(page.getByText("Access denied")).toBeVisible()
    await expect(page).toHaveURL(/\/dashboard\/forbidden/)
  })

  test("the results hub and per-schedule table show graded results", async ({
    page,
  }) => {
    await signInAsRole(page, "user")
    const exam = await seedAttemptableExam("Scores", { passScore: "5" })
    await takeAndSubmitExam(page, exam, 1)

    const url = page.url()
    const attemptId = url.split("/attempt/")[1]!.split("/")[0]!

    await signInAsRole(page, "admin")
    await gradeEssay(page, attemptId, 0, "1", 5)

    await page.goto("/dashboard/exam-results")
    const hubRow = page.getByRole("row", { name: new RegExp(`Schedule ${exam.label}`) }).first()
    await expect(hubRow).toBeVisible()
    await expect(hubRow.getByText("1", { exact: true })).toBeVisible()
    await expect(hubRow.getByText("0", { exact: true })).toBeVisible()
    await hubRow.getByRole("link", { name: "Lihat" }).click()

    const resultRow = page.getByRole("row", { name: /Test User/ })
    await expect(resultRow).toBeVisible()
    await expect(resultRow.getByText("5", { exact: true })).toBeVisible()
    await expect(resultRow.getByText("Lengkap")).toBeVisible()
    await expect(resultRow.getByText("LULUS")).toBeVisible()
  })
})
