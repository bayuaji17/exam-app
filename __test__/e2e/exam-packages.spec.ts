import { randomUUID } from "node:crypto"
import { expect, test, type Page } from "@playwright/test"

import { signInAsRole } from "./fixtures/auth"
import { seedBank, SEEDED_BANK_PREFIX } from "./fixtures/seeded-banks"
import { seedQuestion } from "./fixtures/seeded-questions"
import {
  packagePositions,
  packageQuestionScores,
  seedExamPackage,
  seedPackageQuestion,
  SEEDED_PACKAGE_PREFIX,
} from "./fixtures/seeded-packages"
import {
  clickAndVerify,
  fillField,
  submitAndNavigate,
  waitForHydration,
} from "./fixtures/interactions"

const EXAMS_URL = "/dashboard/exams"

/** A per-run-unique name, so leftovers from a crashed run cannot collide. */
function uniqueName(label: string): string {
  return `${label} ${randomUUID().slice(0, 8)}`
}

/**
 * The suite runs with `fullyParallel`: every name below is unique per test,
 * and cleanup happens in the global teardown.
 */

function content(text: string): Record<string, unknown> {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  }
}

async function fillPackageForm(
  page: Page,
  values: { name: string; description?: string; duration?: string; passScore?: string }
) {
  await fillField(page, "Nama Paket", values.name)

  if (values.description) {
    await fillField(page, "Deskripsi", values.description)
  }

  if (values.duration) {
    await fillField(page, "Durasi (menit)", values.duration)
  }

  if (values.passScore) {
    await fillField(page, "Nilai Lulus", values.passScore)
  }
}

test.describe("exam package CRUD", () => {
  test("an admin creates a package and finds it in the list", async ({ page }) => {
    await signInAsRole(page, "admin")
    await page.goto(`${EXAMS_URL}/new`)

    await fillPackageForm(page, {
      name: `${SEEDED_PACKAGE_PREFIX} Matematika`,
      description: "UTS semester ganjil",
      duration: "90",
      passScore: "60",
    })
    await submitAndNavigate(page, "Buat Paket Ujian", /\/dashboard\/exams$/)

    await page.getByLabel("Cari paket ujian").fill("Matematika")
    await expect(page.getByText("90 menit")).toBeVisible()
    await expect(page.getByText("60")).toBeVisible()
  })

  test("validation errors block invalid configuration", async ({ page }) => {
    await signInAsRole(page, "admin")
    await page.goto(`${EXAMS_URL}/new`)
    await waitForHydration(page)

    await page.getByRole("button", { name: "Buat Paket Ujian" }).click()
    await expect(page.getByText("Nama paket wajib diisi.")).toBeVisible()

    await fillField(page, "Nama Paket", `${SEEDED_PACKAGE_PREFIX} Invalid`)
    await fillField(page, "Durasi (menit)", "0")
    await page.getByRole("button", { name: "Buat Paket Ujian" }).click()
    await expect(page.getByText("Durasi harus lebih dari 0 menit.")).toBeVisible()
  })

  test("an admin edits a package", async ({ page }) => {
    await signInAsRole(page, "admin")
    const examId = await seedExamPackage(`${SEEDED_PACKAGE_PREFIX} Untuk Diedit`)
    await page.goto(`${EXAMS_URL}/${examId}/edit`)

    await fillPackageForm(page, {
      name: `${SEEDED_PACKAGE_PREFIX} Setelah Diedit`,
      duration: "120",
    })
    await submitAndNavigate(page, "Simpan Perubahan", /\/dashboard\/exams$/)

    await page.getByLabel("Cari paket ujian").fill("Setelah Diedit")
    await expect(page.getByText("120 menit")).toBeVisible()
  })
})

test.describe("package composition", () => {
  test("only eligible questions are offered and add in order", async ({ page }) => {
    await signInAsRole(page, "admin")
    const bankName = uniqueName(`${SEEDED_BANK_PREFIX} Paket Sumber`)
    const bankId = await seedBank(bankName)
    const activeQ = (
      await seedQuestion(bankId, {
        type: "single",
        searchText: "Soal layak",
        content: content("Soal layak"),
        options: [
          { content: content("A"), isCorrect: true },
          { content: content("B") },
        ],
      })
    ).id
    const manualQ = (
      await seedQuestion(bankId, {
        type: "manual",
        searchText: "Soal uraian layak",
        content: content("Soal uraian layak"),
      })
    ).id
    await seedQuestion(bankId, {
      type: "manual",
      searchText: "Soal arsip",
      content: content("Soal arsip"),
      archivedAt: new Date(),
    })

    const archivedBankId = await seedBank(uniqueName(`${SEEDED_BANK_PREFIX} Paket Bank Arsip`), new Date())
    await seedQuestion(archivedBankId, {
      type: "manual",
      searchText: "Soal bank arsip",
      content: content("Soal bank arsip"),
    })

    const examId = await seedExamPackage(`${SEEDED_PACKAGE_PREFIX} Komposisi`)
    await page.goto(`${EXAMS_URL}/${examId}/questions`)
    await waitForHydration(page)

    await page.getByLabel("Pilih bank soal").click()
    await page.getByRole("option", { name: new RegExp(bankName) }).click()

    // The eligible list loads through a server action; wait out the loader.
    await expect(page.getByText("Memuat soal…")).toBeHidden({ timeout: 45_000 })
    await expect(page.getByText("Soal layak")).toBeVisible()
    await expect(page.getByText("Soal uraian layak")).toBeVisible()
    await expect(page.getByText("Soal arsip")).toBeHidden()
    await expect(page.getByText("Soal bank arsip")).toBeHidden()

    const layakRow = page.getByRole("row", { name: /Soal layak/ })
    await clickAndVerify(
      () => layakRow.getByRole("button", { name: "Tambah" }).click(),
      () =>
        expect(
          layakRow.getByRole("button", { name: "Sudah ditambahkan" })
        ).toBeVisible()
    )

    const uraianRow = page.getByRole("row", { name: /Soal uraian layak/ })
    await clickAndVerify(
      () => uraianRow.getByRole("button", { name: "Tambah" }).click(),
      () =>
        expect(
          uraianRow.getByRole("button", { name: "Sudah ditambahkan" })
        ).toBeVisible()
    )

    await page.goto(`${EXAMS_URL}/${examId}`)
    const rows = page.getByRole("row")
    await expect(rows.filter({ hasText: "Soal layak" })).toBeVisible()
    await expect(rows.filter({ hasText: "Soal uraian layak" })).toBeVisible()

    const positions = await packagePositions(examId)
    expect(positions).toHaveLength(2)
    expect(positions[0]?.questionId).toBe(activeQ)
    expect(positions[1]?.questionId).toBe(manualQ)
  })

  test("a duplicate add is blocked and removal works", async ({ page }) => {
    await signInAsRole(page, "admin")
    const bankId = await seedBank(uniqueName(`${SEEDED_BANK_PREFIX} Paket Duplikat`))
    const questionId = (
      await seedQuestion(bankId, {
        type: "manual",
        searchText: "Soal sekali pakai",
        content: content("Soal sekali pakai"),
      })
    ).id
    const examId = await seedExamPackage(`${SEEDED_PACKAGE_PREFIX} Duplikat`)
    await seedPackageQuestion(examId, questionId, 0)

    await page.goto(`${EXAMS_URL}/${examId}/questions`)
    await waitForHydration(page)

    await page.getByLabel("Pilih bank soal").click()
    await page.getByRole("option", { name: /Paket Duplikat/ }).click()
    await expect(page.getByText("Memuat soal…")).toBeHidden({ timeout: 45_000 })

    const row = page.getByRole("row", { name: /Soal sekali pakai/ })
    await expect(row.getByRole("button", { name: "Sudah ditambahkan" })).toBeVisible()

    await page.goto(`${EXAMS_URL}/${examId}`)
    await waitForHydration(page)
    const detailRow = page.getByRole("row", { name: /Soal sekali pakai/ })
    await detailRow.getByRole("button", { name: "Keluarkan dari paket" }).click()
    await expect(detailRow).toBeHidden({ timeout: 20_000 })
  })

  test("move up and down reorders the composition", async ({ page }) => {
    await signInAsRole(page, "admin")
    const bankId = await seedBank(uniqueName(`${SEEDED_BANK_PREFIX} Paket Urutan`))
    const first = (
      await seedQuestion(bankId, {
        type: "manual",
        searchText: "Urutan satu",
        content: content("Urutan satu"),
      })
    ).id
    const second = (
      await seedQuestion(bankId, {
        type: "manual",
        searchText: "Urutan dua",
        content: content("Urutan dua"),
      })
    ).id
    const examId = await seedExamPackage(`${SEEDED_PACKAGE_PREFIX} Urutan`)
    await seedPackageQuestion(examId, first, 0)
    await seedPackageQuestion(examId, second, 1)

    await page.goto(`${EXAMS_URL}/${examId}`)
    await waitForHydration(page)

    const secondRow = page.getByRole("row", { name: /Urutan dua/ })
    await secondRow.getByRole("button", { name: "Naikkan urutan" }).click()

    // The click returns before the async action settles; poll the database
    // until the swap lands.
    await expect
      .poll(
        async () => (await packagePositions(examId)).map((row) => row.questionId),
        { timeout: 20_000 }
      )
      .toEqual([second, first])
  })

  test("the wrong-answer penalty is saved and validated", async ({ page }) => {
    await signInAsRole(page, "admin")
    const examId = await seedExamPackage(`${SEEDED_PACKAGE_PREFIX} Penalti`)
    await page.goto(`${EXAMS_URL}/${examId}/edit`)

    await fillField(page, "Penalti Jawaban Salah", "-1")
    await page.getByRole("button", { name: "Simpan Perubahan" }).click()
    await expect(page.getByText("Penalti tidak boleh negatif.")).toBeVisible()

    await fillField(page, "Penalti Jawaban Salah", "2")
    await page.getByRole("button", { name: "Simpan Perubahan" }).click()
    await expect(page).toHaveURL(/\/dashboard\/exams$/)

    await page.goto(`${EXAMS_URL}/${examId}`)
    await expect(page.getByText("penalti salah 2")).toBeVisible()
  })

  test("the per-question points override persists on the composition", async ({
    page,
  }) => {
    await signInAsRole(page, "admin")
    const bankId = await seedBank(uniqueName(`${SEEDED_BANK_PREFIX} Poin`))
    const first = (
      await seedQuestion(bankId, {
        type: "single",
        searchText: "Poin satu",
        content: content("Poin satu"),
        options: [
          { content: content("A"), isCorrect: true },
          { content: content("B") },
        ],
      })
    ).id
    const examId = await seedExamPackage(`${SEEDED_PACKAGE_PREFIX} Poin Paket`)
    await seedPackageQuestion(examId, first, 0)

    await page.goto(`${EXAMS_URL}/${examId}`)
    await waitForHydration(page)

    const row = page.getByRole("row", { name: /Poin satu/ })
    await row.getByLabel("Poin soal").fill("4")
    await row.getByLabel("Poin soal").blur()

    await expect
      .poll(
        async () => Number((await packageQuestionScores(examId))[0]?.score),
        { timeout: 15_000 }
      )
      .toBe(4)
  })

  test("deleting a package removes the composition but keeps the questions", async ({
    page,
  }) => {
    await signInAsRole(page, "admin")
    const bankId = await seedBank(uniqueName(`${SEEDED_BANK_PREFIX} Paket Hapus`))
    const questionId = (
      await seedQuestion(bankId, {
        type: "manual",
        searchText: "Soal bertahan",
        content: content("Soal bertahan"),
      })
    ).id
    const examId = await seedExamPackage(`${SEEDED_PACKAGE_PREFIX} Hapus`)
    await seedPackageQuestion(examId, questionId, 0)

    await page.goto(`${EXAMS_URL}/${examId}`)
    await waitForHydration(page)
    await page.getByRole("button", { name: "Hapus Paket" }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await dialog.getByRole("button", { name: "Hapus" }).click()

    await expect(page).toHaveURL(/\/dashboard\/exams$/, { timeout: 30_000 })
    await expect(page.getByRole("row", { name: /Paket Hapus/ })).toBeHidden()

    // The question survives in its bank.
    await page.goto(`/dashboard/question-banks/${bankId}`)
    await expect(page.getByText("Soal bertahan")).toBeVisible()
  })
})
