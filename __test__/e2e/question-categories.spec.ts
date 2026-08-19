import { expect, test } from "@playwright/test"

import { signInAsRole } from "./fixtures/auth"
import { SEEDED_CATEGORY_PREFIX } from "./fixtures/seeded-categories"
import { fillField } from "./fixtures/interactions"

const CATEGORIES_URL = "/dashboard/question-banks/categories"

/**
 * The suite runs with `fullyParallel`, so categories created by other tests
 * may be in the list at any moment. Assertions and actions are scoped to the
 * row carrying the test's own unique name, never to `.first()` or the input
 * value (Playwright's text matching includes input values).
 */
function rowFor(page: import("@playwright/test").Page, name: string) {
  return page.getByRole("row", { name: new RegExp(name) })
}

test.describe("question categories", () => {
  test("an admin sees the create form and the empty state", async ({ page }) => {
    await signInAsRole(page, "admin")
    await page.goto(CATEGORIES_URL)

    await expect(
      page.getByRole("heading", { name: "Kategori Soal" })
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Tambah Kategori" })
    ).toBeVisible()
  })

  test("an admin creates a category and it appears in the list", async ({
    page,
  }) => {
    await signInAsRole(page, "admin")
    await page.goto(CATEGORIES_URL)

    const name = `${SEEDED_CATEGORY_PREFIX} Aljabar`
    await fillField(page, "Nama Kategori", name)
    await fillField(page, "Deskripsi", "Operasi aljabar dasar")
    await page.getByRole("button", { name: "Tambah Kategori" }).click()

    await expect(rowFor(page, "Aljabar")).toBeVisible()
    await expect(rowFor(page, "Operasi aljabar dasar")).toBeVisible()
  })

  test("a duplicate category name is rejected", async ({ page }) => {
    await signInAsRole(page, "admin")
    await page.goto(CATEGORIES_URL)

    const name = `${SEEDED_CATEGORY_PREFIX} Duplikat`
    await fillField(page, "Nama Kategori", name)
    await page.getByRole("button", { name: "Tambah Kategori" }).click()
    await expect(rowFor(page, "Duplikat")).toBeVisible()

    await fillField(page, "Nama Kategori", name)
    await page.getByRole("button", { name: "Tambah Kategori" }).click()

    await expect(
      page.getByText("Kategori dengan nama tersebut sudah ada.").first()
    ).toBeVisible()
  })

  test("an admin renames a category through the dialog", async ({ page }) => {
    await signInAsRole(page, "admin")
    await page.goto(CATEGORIES_URL)

    const oldName = `${SEEDED_CATEGORY_PREFIX} Lama`
    const newName = `${SEEDED_CATEGORY_PREFIX} Baru`

    await fillField(page, "Nama Kategori", oldName)
    await page.getByRole("button", { name: "Tambah Kategori" }).click()
    await expect(rowFor(page, "Lama")).toBeVisible()

    await rowFor(page, "Lama").getByRole("button", { name: "Ubah" }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    // The create form behind the dialog carries the same label, so fill
    // inside the dialog scope only.
    await dialog.getByLabel("Nama Kategori").fill(newName)
    await dialog.getByRole("button", { name: "Simpan Perubahan" }).click()

    await expect(rowFor(page, "Baru")).toBeVisible()
    await expect(rowFor(page, "Lama")).toBeHidden()
  })

  test("an admin deletes an unreferenced category", async ({ page }) => {
    await signInAsRole(page, "admin")
    await page.goto(CATEGORIES_URL)

    const name = `${SEEDED_CATEGORY_PREFIX} Dihapus`

    await fillField(page, "Nama Kategori", name)
    await page.getByRole("button", { name: "Tambah Kategori" }).click()
    await expect(rowFor(page, "Dihapus")).toBeVisible()

    await rowFor(page, "Dihapus").getByRole("button", { name: "Hapus" }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await dialog.getByRole("button", { name: "Hapus" }).click()

    await expect(rowFor(page, "Dihapus")).toBeHidden()
  })
})
