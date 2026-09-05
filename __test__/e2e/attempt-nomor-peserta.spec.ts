import { expect, test, type Page } from "@playwright/test"

import { signInAsRole } from "./fixtures/auth"
import { waitForHydration } from "./fixtures/interactions"
import { seedAttemptableExam, type SeededExam } from "./fixtures/seeded-exams"

/**
 * The per-attempt nomor peserta (ticket 05): generated at start as
 * `{kodePaket}-{random4-8}`, shown on the attempt and result pages, stable
 * across the attempt lifecycle, and distinct per attempt on a schedule.
 */
async function startExam(page: Page, exam: SeededExam): Promise<void> {
  await page.goto("/exam")
  await page
    .getByRole("row", { name: new RegExp(`Schedule ${exam.label}`) })
    .getByRole("link", { name: "Mulai" })
    .click()
  await page.getByRole("button", { name: "Mulai Ujian" }).click()
  await page.waitForURL(/\/exam\/[^/]+\/attempt\//)
  await waitForHydration(page)
}

async function nomorPesertaOn(page: Page): Promise<string> {
  const badge = page.getByText(/No\. Peserta: /)
  await expect(badge).toBeVisible()
  const text = await badge.textContent()
  return text!.replace(/^No\. Peserta:\s*/, "").trim()
}

async function submitAttempt(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Kumpulkan" }).click()
  await expect(page.getByText("Kumpulkan ujian?")).toBeVisible()
  await page
    .getByRole("button", { name: "Kumpulkan", exact: true })
    .last()
    .click()
  await page.waitForURL(/\/result$/)
  await waitForHydration(page)
}

test.describe("attempt nomor peserta", () => {
  test("is generated, stable on resume, and distinct per attempt", async ({
    page,
  }) => {
    await signInAsRole(page, "user")
    const exam = await seedAttemptableExam("Nomor Peserta", {
      attemptLimit: null,
    })

    // First attempt: the number is generated and shown on the attempt page.
    await startExam(page, exam)
    const first = await nomorPesertaOn(page)
    expect(first).toMatch(/^PK-[a-f0-9]{8}-[A-Z2-9]{4,8}$/)

    // Submitting keeps the same number on the result page.
    await submitAttempt(page)
    const onResult = await nomorPesertaOn(page)
    expect(onResult).toBe(first)

    // A second attempt gets a distinct number.
    await startExam(page, exam)
    const second = await nomorPesertaOn(page)
    expect(second).not.toBe(first)
    await submitAttempt(page)
  })
})
