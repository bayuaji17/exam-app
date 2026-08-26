import { expect, test } from "@playwright/test"

import { signInAsRole } from "./fixtures/auth"
import { seedBank, SEEDED_BANK_PREFIX } from "./fixtures/seeded-banks"
import {
  fillField,
  submitAndNavigate,
  waitForHydration,
} from "./fixtures/interactions"

const BANKS_URL = "/dashboard/question-banks"

/**
 * The suite runs with `fullyParallel`, so no test may assume the database is
 * empty or that a created bank sits on page one (the list sorts newest-first
 * with an id tiebreak). Assertions search for unique names instead, and
 * cleanup happens in the global teardown (see `global-teardown.ts`).
 */

async function fillBankForm(
  page: import("@playwright/test").Page,
  name: string,
  description?: string
) {
  await fillField(page, "Nama Bank", name)

  if (description) {
    await fillField(page, "Deskripsi", description)
  }
}

test.describe("question bank list", () => {
  test("an admin sees the list header, search, and create button", async ({
    page,
  }) => {
    await signInAsRole(page, "admin")
    await page.goto(BANKS_URL)

    await expect(page.getByRole("heading", { name: "Bank Soal" })).toBeVisible()
    await expect(page.getByLabel("Cari bank soal")).toBeVisible()
    await expect(page.getByRole("link", { name: "Tambah Bank" })).toBeVisible()
  })

  test("a search matching nothing shows the no-results state", async ({
    page,
  }) => {
    await signInAsRole(page, "admin")
    await page.goto(BANKS_URL)

    await page.getByLabel("Cari bank soal").fill("tidak-ada-bank-seperti-ini")

    await expect(
      page.getByText("Tidak ada hasil untuk filter ini.")
    ).toBeVisible()
  })

  test("a participant is blocked from the question bank area", async ({
    page,
  }) => {
    await signInAsRole(page, "user")
    await page.goto(BANKS_URL)

    await expect(page.getByText("Access denied")).toBeVisible()
    await expect(page).toHaveURL(/\/dashboard\/forbidden/)
  })
})

test.describe("creating a bank", () => {
  test("an admin creates a bank and finds it via search", async ({ page }) => {
    await signInAsRole(page, "admin")
    await page.goto(`${BANKS_URL}/new`)

    await fillBankForm(
      page,
      `${SEEDED_BANK_PREFIX} Matematika`,
      "Aljabar dan kalkulus"
    )
    await submitAndNavigate(
      page,
      "Buat Bank Soal",
      /\/dashboard\/question-banks$/
    )

    // Search matches the bank name (not the description); assert the row's
    // description cell to prove the create reached the database.
    await page.getByLabel("Cari bank soal").fill("Matematika")

    await expect(
      page.getByRole("row", { name: /Aljabar dan kalkulus/ })
    ).toBeVisible()
  })

  test("an empty name shows a validation error and saves nothing", async ({
    page,
  }) => {
    await signInAsRole(page, "admin")
    await page.goto(`${BANKS_URL}/new`)
    await waitForHydration(page)

    await page.getByRole("button", { name: "Buat Bank Soal" }).click()

    await expect(page.getByText("Nama bank wajib diisi.")).toBeVisible()
    await expect(page).toHaveURL(`${BANKS_URL}/new`)
  })
})

test.describe("editing a bank", () => {
  test("an admin edits a bank and the list reflects it", async ({ page }) => {
    await signInAsRole(page, "admin")

    const bankId = await seedBank(`${SEEDED_BANK_PREFIX} Untuk Diedit`)
    console.log("EDIT-TEST: seeded", bankId)
    await page.goto(`${BANKS_URL}/${bankId}/edit`)

    await fillBankForm(
      page,
      `${SEEDED_BANK_PREFIX} Setelah Diedit`,
      "Deskripsi baru"
    )
    await submitAndNavigate(
      page,
      "Simpan Perubahan",
      /\/dashboard\/question-banks$/
    )

    await page.getByLabel("Cari bank soal").fill("Setelah Diedit")

    await expect(page.getByText("Deskripsi baru")).toBeVisible()
  })

  test("editing a missing bank shows the not-found page", async ({ page }) => {
    await signInAsRole(page, "admin")
    await page.goto(`${BANKS_URL}/does-not-exist/edit`)

    await expect(page.getByRole("heading", { name: "404" })).toBeVisible()
  })
})

test.describe("searching and paginating the bank list", () => {
  test("search narrows the list to matching banks", async ({ page }) => {
    await signInAsRole(page, "admin")

    await seedBank(`${SEEDED_BANK_PREFIX} Fisika Kuantum`)
    await seedBank(`${SEEDED_BANK_PREFIX} Kimia Organik`)
    await page.goto(BANKS_URL)

    const search = page.getByLabel("Cari bank soal")
    await search.fill("Fisika")

    await expect(page.getByText("Fisika Kuantum")).toBeVisible()
    await expect(page.getByText("Kimia Organik")).toBeHidden()
  })

  test("pagination pages through more than one page of banks", async ({
    page,
  }) => {
    await signInAsRole(page, "admin")

    for (let index = 0; index < 12; index += 1) {
      await seedBank(`${SEEDED_BANK_PREFIX} Paginasi ${index}`)
    }

    await page.goto(`${BANKS_URL}?size=10`)

    await expect(page.getByRole("link", { name: "Halaman 2" })).toBeVisible()

    await page.getByRole("link", { name: "Halaman 2" }).click()

    await expect(page).toHaveURL(/page=2/)
    await expect(page.getByRole("link", { name: "Halaman 1" })).toBeVisible()
  })
})
