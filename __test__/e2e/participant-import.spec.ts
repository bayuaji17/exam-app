import { randomUUID } from "node:crypto"
import { expect, test, type Page } from "@playwright/test"

import { signInAsRole } from "./fixtures/auth"
import {
  groupMemberIds,
  seedParticipantGroup,
  SEEDED_GROUP_PREFIX,
} from "./fixtures/seeded-groups"
import { userExists } from "./fixtures/created-users"
import {
  buildImportWorkbook,
  importFile,
  importHistoryCount,
} from "./fixtures/import-files"
import { waitForHydration } from "./fixtures/interactions"

const IMPORT_URL = "/dashboard/users/import"

function uniqueEmail(label: string): string {
  return `e2e-created-import-${label}-${randomUUID().slice(0, 8)}@example.com`
}

async function uploadFile(page: Page, file: { name: string; mimeType: string; buffer: Buffer }) {
  await page.goto(IMPORT_URL)
  await waitForHydration(page)
  await page.setInputFiles('input[type="file"]', file)
}

test.describe("participant import", () => {
  test("a valid file creates accounts, group memberships, and a history row", async ({
    page,
  }) => {
    await signInAsRole(page, "admin")
    const groupName = `${SEEDED_GROUP_PREFIX} ${uniqueEmail("grup")}`
    const groupId = await seedParticipantGroup(groupName)
    const firstEmail = uniqueEmail("satu")
    const secondEmail = uniqueEmail("dua")

    await uploadFile(
      page,
      importFile(
        "peserta.xlsx",
        await buildImportWorkbook([
          { name: "Peserta Satu", email: firstEmail, groups: groupName },
          { name: "Peserta Dua", email: secondEmail, password: "Rahasia123!" },
        ])
      )
    )

    // Dry-run: everything valid, import enabled.
    await expect(page.getByText("semua valid")).toBeVisible()
    await expect(page.getByRole("button", { name: /Import 2 peserta/ })).toBeEnabled()

    await page.getByRole("button", { name: /Import 2 peserta/ }).click()

    await expect(page.getByText("2 peserta berhasil diimpor.")).toBeVisible()
    await expect(page.getByText(firstEmail)).toBeVisible()
    await expect(page.getByText("Rahasia123!")).toHaveCount(0)

    expect(await userExists(firstEmail)).toBe(true)
    expect(await userExists(secondEmail)).toBe(true)
    expect(await groupMemberIds(groupId)).not.toHaveLength(0)
    expect(await importHistoryCount("import-%")).toBeGreaterThan(0)
  })

  test("one invalid row blocks the whole import and lists errors", async ({ page }) => {
    await signInAsRole(page, "admin")
    const goodEmail = uniqueEmail("baik")
    const badEmail = uniqueEmail("buruk")

    await uploadFile(
      page,
      importFile(
        "campur.xlsx",
        await buildImportWorkbook([
          { name: "Peserta Baik", email: goodEmail },
          { name: "", email: badEmail },
        ])
      )
    )

    await expect(page.getByText("1 baris bermasalah")).toBeVisible()
    await expect(page.getByText("Baris 3: Nama wajib diisi.")).toBeVisible()
    await expect(page.getByRole("button", { name: /Import/ })).toBeDisabled()

    expect(await userExists(goodEmail)).toBe(false)
  })

  test("an email already in the database blocks the import", async ({ page }) => {
    await signInAsRole(page, "admin")
    const freshEmail = uniqueEmail("baru")

    await uploadFile(
      page,
      importFile(
        "duplikat.xlsx",
        await buildImportWorkbook([
          { name: "Sudah Ada", email: "test-user@example.com" },
          { name: "Peserta Baru", email: freshEmail },
        ])
      )
    )

    await expect(page.getByText("Email sudah terdaftar.")).toBeVisible()
    await expect(page.getByRole("button", { name: /Import/ })).toBeDisabled()
  })

  test("unknown group names are flagged", async ({ page }) => {
    await signInAsRole(page, "admin")

    await uploadFile(
      page,
      importFile(
        "grup.xlsx",
        await buildImportWorkbook([
          { name: "Peserta", email: uniqueEmail("grup"), groups: "Tidak Ada" },
        ])
      )
    )

    await expect(page.getByText('Grup "Tidak Ada" tidak ditemukan.')).toBeVisible()
    await expect(page.getByRole("button", { name: /Import/ })).toBeDisabled()
  })

  test("wrong file types and oversized files are rejected", async ({ page }) => {
    await signInAsRole(page, "admin")

    await uploadFile(
      page,
      { name: "peserta.csv", mimeType: "text/csv", buffer: Buffer.from("a,b") }
    )
    await expect(page.getByText("Hanya file .xlsx yang didukung.")).toBeVisible()

    await page.setInputFiles("input[type=file]", {
      name: "besar.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: Buffer.alloc(2 * 1024 * 1024 + 1),
    })
    await expect(page.getByText("File maksimal 2 MB.")).toBeVisible()
  })

  test("the template downloads", async ({ page }) => {
    await signInAsRole(page, "admin")

    const response = await page.request.get("/api/participants/template")
    expect(response.status()).toBe(200)
    expect(response.headers()["content-type"]).toContain(
      "spreadsheetml.sheet"
    )
  })

  test("a participant cannot reach the import page", async ({ page }) => {
    await signInAsRole(page, "user")

    await page.goto(IMPORT_URL)

    await expect(page.getByText("Access denied")).toBeVisible()
    await expect(page).toHaveURL(/\/dashboard\/forbidden/)
  })
})
