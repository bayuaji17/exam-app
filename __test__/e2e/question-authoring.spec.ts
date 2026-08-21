import { expect, test, type Page } from "@playwright/test"

import { signInAsRole } from "./fixtures/auth"
import { seedBank, SEEDED_BANK_PREFIX } from "./fixtures/seeded-banks"
import { seedQuestion } from "./fixtures/seeded-questions"
import { seedCategory, SEEDED_CATEGORY_PREFIX } from "./fixtures/seeded-categories"
import { submitAndNavigate, waitForHydration } from "./fixtures/interactions"

/**
 * The suite runs with `fullyParallel`: every bank, category, and search term
 * below is unique per test, and cleanup happens in the global teardown.
 */

/**
 * Type text into the nth ProseMirror editor on the page (0 = prompt).
 */
async function typeInEditor(page: Page, text: string, index = 0) {
  const editor = page.locator(".rich-text-content").nth(index)
  await editor.click()
  await page.keyboard.type(text)
}

async function openNewQuestion(page: Page, bankId: string) {
  await page.goto(`/dashboard/question-banks/${bankId}/questions/new`)
  await waitForHydration(page)
  await expect(page.getByRole("heading", { name: "Tambah Soal" })).toBeVisible()
}

test.describe("question authoring", () => {
  test("an admin creates a single-choice question with a correct option", async ({
    page,
  }) => {
    await signInAsRole(page, "admin")
    const bankId = await seedBank(`${SEEDED_BANK_PREFIX} Penulis Soal`)
    await openNewQuestion(page, bankId)

    await typeInEditor(page, "Berapa hasil 2 + 2?")
    await typeInEditor(page, "Empat", 1)
    await typeInEditor(page, "Lima", 2)
    await page.getByLabel("Opsi 1 adalah jawaban benar").check()

    await submitAndNavigate(page, "Buat Soal", /\/dashboard\/question-banks\/[^/]+$/)

    await expect(page.getByText("Berapa hasil 2 + 2?")).toBeVisible()
  })

  test("an admin creates a score-based question with scores", async ({ page }) => {
    await signInAsRole(page, "admin")
    const bankId = await seedBank(`${SEEDED_BANK_PREFIX} Skor`)
    await openNewQuestion(page, bankId)

    await page.getByLabel("Berbasis skor").check()
    await typeInEditor(page, "Pilih yang paling sesuai")
    await typeInEditor(page, "Sangat setuju", 1)
    await page.getByLabel("Skor opsi 1").fill("4")
    await typeInEditor(page, "Setuju", 2)
    await page.getByLabel("Skor opsi 2").fill("3")

    await submitAndNavigate(page, "Buat Soal", /\/dashboard\/question-banks\/[^/]+$/)

    await expect(page.getByText("Pilih yang paling sesuai")).toBeVisible()
  })

  test("an admin creates a manual question without options", async ({ page }) => {
    await signInAsRole(page, "admin")
    const bankId = await seedBank(`${SEEDED_BANK_PREFIX} Manual`)
    await openNewQuestion(page, bankId)

    await page.getByLabel("Penilaian manual").check()
    await typeInEditor(page, "Jelaskan fotosintesis")

    await expect(page.getByText("Soal manual tidak memiliki opsi jawaban")).toBeVisible()
    await expect(page.getByRole("button", { name: "Tambah Opsi" })).toBeHidden()

    await submitAndNavigate(page, "Buat Soal", /\/dashboard\/question-banks\/[^/]+$/)

    await expect(page.getByText("Jelaskan fotosintesis")).toBeVisible()
  })

  test("a single question without a correct option is rejected", async ({ page }) => {
    await signInAsRole(page, "admin")
    const bankId = await seedBank(`${SEEDED_BANK_PREFIX} Tanpa Benar`)
    await openNewQuestion(page, bankId)

    await typeInEditor(page, "Soal tanpa jawaban benar")
    await typeInEditor(page, "Opsi A", 1)
    await typeInEditor(page, "Opsi B", 2)

    await page.getByRole("button", { name: "Buat Soal" }).click()

    await expect(
      page.getByText("Tandai tepat satu opsi sebagai jawaban benar.").first()
    ).toBeVisible()
  })

  test("the answer editor exposes only inline formatting controls", async ({
    page,
  }) => {
    await signInAsRole(page, "admin")
    const bankId = await seedBank(`${SEEDED_BANK_PREFIX} Toolbar`)
    await openNewQuestion(page, bankId)

    // The prompt editor has the block controls; the two answer editors (one
    // per option) must not offer them, so the page-wide count stays at one.
    await expect(page.getByRole("button", { name: "Heading 1" })).toHaveCount(1)
    await expect(page.getByRole("button", { name: "Sisipkan rumus matematika" })).toHaveCount(1)
    await expect(page.getByRole("button", { name: "Sisipkan tabel" })).toHaveCount(1)

    // The prompt toolbar shows inline marks too; the answer editors also
    // have Tebal, so assert the first one.
    await expect(page.getByRole("button", { name: "Tebal" }).first()).toBeVisible()
    await expect(page.getByRole("button", { name: "Sisipkan tautan" })).toBeVisible()
  })

  test("the question type is immutable in the edit form", async ({ page }) => {
    await signInAsRole(page, "admin")
    const bankId = await seedBank(`${SEEDED_BANK_PREFIX} Immutable`)
    const questionId = (
      await seedQuestion(bankId, {
        type: "scored",
        content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Soal skor" }] }] },
        options: [
          { content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "A" }] }] }, score: "1" },
          { content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "B" }] }] }, score: "2" },
        ],
      })
    ).id

    await page.goto(`/dashboard/question-banks/${bankId}/questions/${questionId}/edit`)
    await waitForHydration(page)

    await expect(page.getByText("Tipe soal: Berbasis skor")).toBeVisible()
    await expect(page.getByLabel("Pilihan dengan jawaban benar")).toBeHidden()
    await expect(page.getByRole("radio", { name: "Berbasis skor" })).toHaveCount(0)
  })

  test("an archived question is read-only", async ({ page }) => {
    await signInAsRole(page, "admin")
    const bankId = await seedBank(`${SEEDED_BANK_PREFIX} Beku`)
    const questionId = (
      await seedQuestion(bankId, {
        type: "manual",
        content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Soal beku" }] }] },
        archivedAt: new Date(),
      })
    ).id

    await page.goto(`/dashboard/question-banks/${bankId}/questions/${questionId}/edit`)

    await expect(page.getByRole("heading", { name: "Soal Diarsipkan" })).toBeVisible()
  })

  test("search matches answer text and filters narrow the list", async ({ page }) => {
    await signInAsRole(page, "admin")
    const bankId = await seedBank(`${SEEDED_BANK_PREFIX} Pencarian`)
    const categoryId = await seedCategory(`${SEEDED_CATEGORY_PREFIX} Kategori Cari`)

    await seedQuestion(bankId, {
      type: "single",
      content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Pertanyaan unik" }] }] },
      options: [
        { content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "jawaban-terkenal-x7" }] }] }, isCorrect: true },
        { content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "b" }] }] } },
      ],
      searchText: "Pertanyaan unik jawaban-terkenal-x7",
      categoryId,
    })
    await seedQuestion(bankId, {
      type: "manual",
      content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Soal lain" }] }] },
      searchText: "Soal lain",
    })

    await page.goto(`/dashboard/question-banks/${bankId}`)

    await page.getByLabel("Cari soal").fill("jawaban-terkenal-x7")
    await expect(page.getByText("Pertanyaan unik")).toBeVisible()
    await expect(page.getByText("Soal lain")).toBeHidden()

    await page.getByLabel("Cari soal").fill("")
    // Wait for the debounced search navigation to settle, so the filter
    // select reads fresh URL params instead of the stale search.
    await expect(page).toHaveURL(
      new RegExp(`/dashboard/question-banks/[^/]+$`)
    )

    await page.getByLabel("Filter tipe").click()
    await page.getByRole("option", { name: "Penilaian manual" }).click()
    await expect(page.getByText("Soal lain")).toBeVisible()
    await expect(page.getByText("Pertanyaan unik")).toBeHidden()
  })

  test("the combobox selects an existing category and creates one inline", async ({
    page,
  }) => {
    await signInAsRole(page, "admin")
    const bankId = await seedBank(`${SEEDED_BANK_PREFIX} Kombobox`)
    await seedCategory(`${SEEDED_CATEGORY_PREFIX} Kategori Ada`)

    await openNewQuestion(page, bankId)

    const existingName = `${SEEDED_CATEGORY_PREFIX} Kategori Ada`

    await page.getByRole("button", { name: /Pilih kategori/ }).click()
    await page.getByLabel("Cari atau buat kategori").fill(existingName)
    await page.getByRole("option", { name: existingName, exact: true }).click()
    await expect(page.getByRole("button", { name: new RegExp(existingName) })).toBeVisible()

    await page.getByRole("button", { name: new RegExp(existingName) }).click()
    await page
      .getByLabel("Cari atau buat kategori")
      .fill(`${SEEDED_CATEGORY_PREFIX} Inline Baru`)
    await page.getByRole("option", { name: /Buat kategori/ }).click()
    await expect(
      page.getByRole("button", { name: /Inline Baru/ })
    ).toBeVisible()

    await typeInEditor(page, "Soal berkategori")
    await page.getByLabel("Opsi 1 adalah jawaban benar").check()
    await typeInEditor(page, "A", 1)
    await typeInEditor(page, "B", 2)

    await submitAndNavigate(page, "Buat Soal", /\/dashboard\/question-banks\/[^/]+$/)
    await expect(page.getByText("Soal berkategori")).toBeVisible()
  })

  test("a category used by a question cannot be deleted", async ({ page }) => {
    await signInAsRole(page, "admin")
    const bankId = await seedBank(`${SEEDED_BANK_PREFIX} Kategori Terkunci`)
    const uniqueCategory = `${SEEDED_CATEGORY_PREFIX} Dipakai ${Date.now()}`
    const categoryId = await seedCategory(uniqueCategory)

    await seedQuestion(bankId, {
      type: "manual",
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Soal dengan kategori" }],
          },
        ],
      },
      searchText: "Soal dengan kategori",
      categoryId,
    })

    await page.goto("/dashboard/question-banks/categories")
    const row = page.getByRole("row", { name: new RegExp(uniqueCategory) })
    await expect(row).toBeVisible()

    await row.getByRole("button", { name: "Hapus" }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await dialog.getByRole("button", { name: "Hapus" }).click()

    await expect(
      page.getByText("Kategori sedang digunakan oleh soal.").first()
    ).toBeVisible()
  })
})
