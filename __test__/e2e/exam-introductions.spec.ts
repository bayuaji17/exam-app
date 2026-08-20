import { expect, test, type Page } from "@playwright/test"

import { signInAsRole } from "./fixtures/auth"
import { seedAttemptableExam } from "./fixtures/seeded-exams"
import { waitForHydration } from "./fixtures/interactions"

const INTRODUCTIONS_URL = "/dashboard/exam-introductions"

async function writeIntroduction(page: Page, text: string): Promise<void> {
  const editor = page.locator(".rich-text-content").first()
  await editor.click()
  await page.keyboard.type(text)
}

test.describe("exam introductions", () => {
  test("an admin writes an introduction and the participant sees it", async ({
    page,
  }) => {
    await signInAsRole(page, "admin")
    const exam = await seedAttemptableExam("Pengantar")

    await page.goto(INTRODUCTIONS_URL)
    await waitForHydration(page)

    const row = page
      .getByRole("row", { name: new RegExp(`Schedule ${exam.label}`) })
      .first()
    await expect(row).toBeVisible()
    await expect(row.getByText("Default")).toBeVisible()
    await row.getByRole("link", { name: "Atur" }).click()

    await page.getByRole("heading", { name: new RegExp("Introduction") }).first()
    await writeIntroduction(page, "Dilarang membuka buku selama ujian berlangsung.")
    await page.getByRole("button", { name: "Simpan Introduction" }).click()

    // The hub now marks the schedule as filled.
    await expect(page.getByText("Dilarang membuka buku")).toBeVisible()

    await page.goto(INTRODUCTIONS_URL)
    await expect(
      page
        .getByRole("row", { name: new RegExp(`Schedule ${exam.label}`) })
        .first()
        .getByText("Terisi")
    ).toBeVisible()

    // The participant sees the stored introduction on the intro page.
    await signInAsRole(page, "user")
    await page.goto(`/exam/${exam.scheduleId}/intro`)
    await expect(page.getByText("Dilarang membuka buku selama ujian berlangsung.")).toBeVisible()
  })

  test("an empty introduction falls back to the default text", async ({ page }) => {
    await signInAsRole(page, "user")
    const exam = await seedAttemptableExam("Default Intro")

    await page.goto(`/exam/${exam.scheduleId}/intro`)

    await expect(
      page.getByText("Bacalah setiap soal dengan teliti.")
    ).toBeVisible()
  })

  test("an admin edits an existing introduction", async ({ page }) => {
    await signInAsRole(page, "admin")
    const exam = await seedAttemptableExam("Panduan")

    await page.goto(`${INTRODUCTIONS_URL}/${exam.scheduleId}`)
    await waitForHydration(page)
    await writeIntroduction(page, "Versi pertama.")
    await page.getByRole("button", { name: "Simpan Introduction" }).click()
    await expect(page.getByText("Versi pertama.")).toBeVisible()

    // Wait for the refresh to re-mount the editor with the saved content,
    // then hard-reload so no in-flight request can race the second save.
    await expect(
      page.locator(".rich-text-content").getByText("Versi pertama.")
    ).toBeVisible()
    await page.reload()
    await waitForHydration(page)

    // Append a new line rather than select-all+delete: the contenteditable
    // selection is the source of the intermittent flake.
    await page.locator(".rich-text-content").first().click()
    await page.keyboard.press("Enter")
    await writeIntroduction(page, "Versi kedua.")
    await page.getByRole("button", { name: "Simpan Introduction" }).click()
    await expect(page.getByText("Versi kedua.")).toBeVisible()

    await signInAsRole(page, "user")
    await page.goto(`/exam/${exam.scheduleId}/intro`)
    await expect(page.getByText("Versi kedua.")).toBeVisible()
  })

  test("a participant cannot reach the management pages", async ({ page }) => {
    await signInAsRole(page, "user")

    await page.goto(INTRODUCTIONS_URL)

    await expect(page.getByText("Access denied")).toBeVisible()
    await expect(page).toHaveURL(/\/dashboard\/forbidden/)
  })
})
