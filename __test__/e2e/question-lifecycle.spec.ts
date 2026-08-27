import { expect, test, type Locator, type Page } from "@playwright/test"

import { signInAsRole } from "./fixtures/auth"
import { seedBank, SEEDED_BANK_PREFIX } from "./fixtures/seeded-banks"
import { seedQuestion } from "./fixtures/seeded-questions"
import { waitForHydration } from "./fixtures/interactions"

const BANKS_URL = "/dashboard/question-banks"

/**
 * The suite runs with `fullyParallel`: every bank below is unique per test,
 * and cleanup happens in the global teardown.
 */

function content(text: string): Record<string, unknown> {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  }
}

async function seedLifecycleBank(label: string): Promise<string> {
  const bankId = await seedBank(`${SEEDED_BANK_PREFIX} ${label}`)

  await seedQuestion(bankId, {
    type: "manual",
    content: content("Soal aktif"),
    searchText: `${label} aktif`,
  })
  await seedQuestion(bankId, {
    type: "manual",
    content: content("Soal diarsipkan mandiri"),
    searchText: `${label} mandiri`,
    archivedAt: new Date("2026-01-01T00:00:00Z"),
  })

  return bankId
}

async function gotoBank(page: Page, bankId: string): Promise<void> {
  await page.goto(`${BANKS_URL}/${bankId}`)
  await waitForHydration(page)
}

async function confirmArchiveBank(page: Page) {
  await page.getByRole("button", { name: "Arsipkan Bank" }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  await dialog.getByRole("button", { name: "Arsipkan" }).click()
}

async function confirmRestoreBank(page: Page) {
  await page.getByRole("button", { name: "Pulihkan Bank" }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  await dialog.getByRole("button", { name: "Pulihkan" }).click()
}

async function confirmArchiveRow(row: Locator, page: Page) {
  await row.getByRole("button", { name: "Arsipkan" }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  await dialog.getByRole("button", { name: "Arsipkan" }).click()
}

async function confirmRestoreRow(row: Locator, page: Page) {
  await row.getByRole("button", { name: "Pulihkan" }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  await dialog.getByRole("button", { name: "Pulihkan" }).click()
}

test.describe("question bank lifecycle", () => {
  test("archiving a bank freezes it and cascades to its questions", async ({
    page,
  }) => {
    await signInAsRole(page, "admin")
    const bankId = await seedLifecycleBank("Arsip")
    await gotoBank(page, bankId)

    await confirmArchiveBank(page)
    await expect(page.getByText(/Bank.*sedang diarsipkan/i)).toBeVisible()
    await expect(page.getByRole("link", { name: "Tambah Soal" })).toBeHidden()
    await expect(
      page.getByRole("link", { name: "Edit", exact: true })
    ).toHaveCount(0)
    await expect(page.getByText("Diarsipkan").first()).toBeVisible()

    // The edit page rejects archived banks too.
    await page.goto(`${BANKS_URL}/${bankId}/edit`)
    await expect(
      page.getByRole("heading", { name: /Bank.*Diarsipkan/i })
    ).toBeVisible()
  })

  test("restoring a bank brings back consequence archives, not independent ones", async ({
    page,
  }) => {
    await signInAsRole(page, "admin")
    const bankId = await seedLifecycleBank("Pulihkan")
    await gotoBank(page, bankId)

    await confirmArchiveBank(page)
    await expect(page.getByText(/Bank.*sedang diarsipkan/i)).toBeVisible()

    await confirmRestoreBank(page)
    await expect(page.getByText(/Bank.*sedang diarsipkan/i)).toBeHidden()

    // The cascade-archived question came back; the independent archive stayed.
    await expect(page.getByText("Pulihkan aktif")).toBeVisible()
    await expect(
      page.getByRole("link", { name: "Edit", exact: true })
    ).toHaveCount(1)
  })

  test("a question can be archived and restored independently", async ({
    page,
  }) => {
    await signInAsRole(page, "admin")
    const bankId = await seedLifecycleBank("Soal Mandiri")
    await gotoBank(page, bankId)

    const row = page.getByRole("row", { name: /Soal Mandiri aktif/ })
    await confirmArchiveRow(row, page)

    const archivedRow = page.getByRole("row", { name: /Soal Mandiri aktif/ })
    await expect(archivedRow.getByText("Diarsipkan")).toBeVisible()
    await expect(
      archivedRow.getByRole("button", { name: "Pulihkan" })
    ).toBeVisible()

    await confirmRestoreRow(archivedRow, page)
    await expect(
      page
        .getByRole("row", { name: /Soal Mandiri aktif/ })
        .getByRole("button", { name: "Arsipkan" })
    ).toBeVisible()
  })

  test("deleting requires the archived state and removes the question", async ({
    page,
  }) => {
    await signInAsRole(page, "admin")
    const bankId = await seedLifecycleBank("Hapus Soal")
    await gotoBank(page, bankId)

    const activeRow = page.getByRole("row", { name: /Hapus Soal aktif/ })
    await expect(activeRow.getByRole("button", { name: "Hapus" })).toBeHidden()

    await confirmArchiveRow(activeRow, page)
    const archivedRow = page.getByRole("row", { name: /Hapus Soal aktif/ })
    await archivedRow.getByRole("button", { name: "Hapus" }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await dialog.getByRole("button", { name: "Hapus" }).click()

    await expect(
      page.getByRole("row", { name: /Hapus Soal aktif/ })
    ).toBeHidden()
  })

  test("deleting a bank requires the archived state and removes everything", async ({
    page,
  }) => {
    await signInAsRole(page, "admin")
    await seedLifecycleBank("Hapus Bank")
    await page.goto(BANKS_URL)

    const row = page.getByRole("row", { name: /Hapus Bank/ })
    await expect(row.getByRole("button", { name: "Hapus" })).toBeHidden()

    await confirmArchiveRow(row, page)
    const archivedRow = page.getByRole("row", { name: /Hapus Bank/ })
    await archivedRow.getByRole("button", { name: "Hapus" }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await dialog.getByRole("button", { name: "Hapus" }).click()

    await expect(page.getByRole("row", { name: /Hapus Bank/ })).toBeHidden()
  })

  test("the bank list filters by archive state", async ({ page }) => {
    await signInAsRole(page, "admin")
    await seedLifecycleBank("Filter Arsip")
    await page.goto(BANKS_URL)

    const row = page.getByRole("row", { name: /Filter Arsip/ })
    await confirmArchiveRow(row, page)
    await expect(row.getByText("Diarsipkan")).toBeVisible()

    await page.getByLabel("Filter status bank").click()
    await page.getByRole("option", { name: "Diarsipkan" }).click()

    await expect(page.getByText("Filter Arsip").first()).toBeVisible()
  })

  test("an archived question is read-only via its edit page", async ({
    page,
  }) => {
    await signInAsRole(page, "admin")
    const bankId = await seedLifecycleBank("Beku Soal")
    const questionId = (
      await seedQuestion(bankId, {
        type: "manual",
        content: content("Soal beku"),
        searchText: "beku edit",
        archivedAt: new Date(),
      })
    ).id

    await page.goto(`${BANKS_URL}/${bankId}/questions/${questionId}/edit`)
    await waitForHydration(page)

    await expect(
      page.getByRole("heading", { name: "Soal Diarsipkan" })
    ).toBeVisible()
  })
})
