import { execSync } from "node:child_process"
import path from "node:path"
import { expect, test, type Page } from "@playwright/test"

import { signInAsRole } from "./fixtures/auth"
import { seedBank, SEEDED_BANK_PREFIX } from "./fixtures/seeded-banks"
import { submitAndNavigate, waitForHydration } from "./fixtures/interactions"
import {
  ledgerRowsForQuestion,
  objectExists,
  testPngBuffer,
} from "./fixtures/media"

const ROOT = path.join(process.cwd())

/**
 * The suite runs with `fullyParallel`: every bank below is unique per test,
 * and object/ledger cleanup happens in the global teardown (the exam-app
 * bucket is dedicated to dev + E2E).
 */

async function uploadImage(page: Page, buffer: Buffer, editorIndex = 0): Promise<void> {
  const chooser = page.waitForEvent("filechooser")

  await page.getByRole("button", { name: "Sisipkan gambar" }).nth(editorIndex).click()
  const file = await chooser
  await file.setFiles({
    name: "gambar.png",
    mimeType: "image/png",
    buffer,
  })
}

async function openNewQuestion(page: Page, bankId: string): Promise<void> {
  await page.goto(`/dashboard/question-banks/${bankId}/questions/new`)
  await waitForHydration(page)
}

/** The question id of the first row on the bank detail page. */
async function firstQuestionId(page: Page): Promise<string> {
  const href = await page.getByRole("link", { name: "Edit" }).first().getAttribute("href")

  return href!.split("/").slice(-2)[0]!
}

async function typeInEditor(page: Page, text: string, index = 0): Promise<void> {
  await page.locator(".rich-text-content").nth(index).click()
  await page.keyboard.type(text)
}

async function saveSingleChoiceQuestion(page: Page): Promise<void> {
  await page.getByLabel("Opsi 1 adalah jawaban benar").check()
  await typeInEditor(page, "Opsi A", 1)
  await typeInEditor(page, "Opsi B", 2)
  await submitAndNavigate(page, "Buat Soal", /\/dashboard\/question-banks\/[^/]+$/)
}

test.describe("question media", () => {
  test("an image uploads into the prompt and is owned by the ledger", async ({
    page,
  }) => {
    await signInAsRole(page, "admin")
    const bankId = await seedBank(`${SEEDED_BANK_PREFIX} Media Prompt`)
    await openNewQuestion(page, bankId)

    await typeInEditor(page, "Soal dengan gambar ")
    await uploadImage(page, testPngBuffer(), 0)

    const editorImage = page.locator(".rich-text-content img").first()
    await expect(editorImage).toBeVisible()
    const src = await editorImage.getAttribute("src")
    expect(src).toMatch(/\/media\/[0-9a-f-]{36}\.webp$/)
    const objectKey = src!.split("/").slice(-2).join("/")
    expect(await objectExists(objectKey)).toBe(true)

    await saveSingleChoiceQuestion(page)

    const questionId = await firstQuestionId(page)
    const rows = await ledgerRowsForQuestion(questionId)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.objectKey).toBe(objectKey)
    expect(rows[0]?.deletedAt).toBeNull()
  })

  test("an image uploads into an answer option", async ({ page }) => {
    await signInAsRole(page, "admin")
    const bankId = await seedBank(`${SEEDED_BANK_PREFIX} Media Opsi`)
    await openNewQuestion(page, bankId)

    await typeInEditor(page, "Pilih gambar yang benar")
    await uploadImage(page, testPngBuffer(), 1)

    await expect(page.locator(".rich-text-content").nth(1).locator("img[src]")).toBeVisible()
    await saveSingleChoiceQuestion(page)
  })

  test("an oversized upload is rejected client-side", async ({ page }) => {
    await signInAsRole(page, "admin")
    const bankId = await seedBank(`${SEEDED_BANK_PREFIX} Media Besar`)
    await openNewQuestion(page, bankId)

    await uploadImage(page, Buffer.alloc(5 * 1024 * 1024 + 1))

    await expect(page.getByText("File melebihi batas 5 MB.")).toBeVisible()
    await expect(page.locator(".rich-text-content img")).toHaveCount(0)
  })

  test("removing an image tombstones the ledger and the sweep removes the object", async ({
    page,
  }) => {
    await signInAsRole(page, "admin")
    const bankId = await seedBank(`${SEEDED_BANK_PREFIX} Media Dihapus`)
    await openNewQuestion(page, bankId)

    await typeInEditor(page, "Gambar akan dihapus ")
    await uploadImage(page, testPngBuffer(), 0)

    const editorImage = page.locator(".rich-text-content img").first()
    await expect(editorImage).toBeVisible()
    const src = await editorImage.getAttribute("src")
    const objectKey = src!.split("/").slice(-2).join("/")
    expect(await objectExists(objectKey)).toBe(true)

    await saveSingleChoiceQuestion(page)

    const questionId = await firstQuestionId(page)
    await page.goto(`/dashboard/question-banks/${bankId}/questions/${questionId}/edit`)
    await waitForHydration(page)

    await page.locator(".rich-text-content img[src]").first().click()
    await page.keyboard.press("Delete")
    await expect(page.locator(".rich-text-content img[src]")).toHaveCount(0)
    await submitAndNavigate(page, "Simpan Perubahan", /\/dashboard\/question-banks\/[^/]+$/)

    const rows = await ledgerRowsForQuestion(questionId)
    expect(
      rows.some((row) => row.objectKey === objectKey && row.deletedAt !== null)
    ).toBe(true)

    // The sweep deletes the object, and purges the row only afterwards.
    execSync("pnpm exec tsx scripts/sweep-media.ts", { cwd: ROOT, stdio: "pipe" })

    expect(await objectExists(objectKey)).toBe(false)
    const after = await ledgerRowsForQuestion(questionId)
    expect(after.some((row) => row.objectKey === objectKey)).toBe(false)
  })
})
